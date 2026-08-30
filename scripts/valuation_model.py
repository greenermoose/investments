"""
Valuation Model & Quantitative Forecasting Engine
Deterministic multi-horizon financial modeling over agent-supplied parameters.

This module is arithmetic only. It computes the 13-quarter revenue path, the
6-horizon diluted share count, the 4-horizon price target bands, and the
Return Engine parameterization that follow from inputs an agent researched
and wrote into the research store (context/data/equities/<TICKER>.json).

What this module deliberately does NOT do, and must never do again:
  - estimate a growth rate, target multiple, or dilution rate from the sector
  - estimate a TAM, an SBC run-rate, a CapEx budget, or a vesting schedule
  - invent catalysts, invalidation criteria, or any other research finding
  - compose a sentence about a company

When the agent has not supplied the required parameters, model_equity_valuation
returns status "UNMODELED" with the gap list. It never substitutes a plausible
value: a ticker with no researched parameters gets no valuation, no ROI, and no
rating. See context/strategy/deterministic_vs_generative_execution.md.

Conforms to:
- context/schemas/equity_research_schema.json (input contract)
- context/schemas/investment_thesis_schema.json
- context/schemas/return_engine_schema.json
"""

import os
import re
import sys
from typing import Any, Dict, List, Optional

scripts_dir = os.path.dirname(os.path.abspath(__file__))
if scripts_dir not in sys.path:
    sys.path.insert(0, scripts_dir)

from return_engine import calculate_annualized_roi
from adr_registry import normalize_shares_outstanding, convert_to_usd
import research_store

# 13-Quarter Forecasting Framework
QUARTER_DEFS = [
    ("2026-Q3 (Current)", 0, "2026-09-30"),
    ("2026-Q4", 1, "2026-12-31"),
    ("2027-Q1", 2, "2027-03-31"),
    ("2027-Q2", 3, "2027-06-30"),
    ("2027-Q3", 4, "2027-09-30"),
    ("2027-Q4", 5, "2027-12-31"),
    ("2028-Q1", 6, "2028-03-31"),
    ("2028-Q2", 7, "2028-06-30"),
    ("2028-Q3", 8, "2028-09-30"),
    ("2028-Q4", 9, "2028-12-31"),
    ("2029-Q1", 10, "2029-03-31"),
    ("2029-Q2", 11, "2029-06-30"),
    ("2029-Q3 (Q12)", 12, "2029-09-30"),
]

HISTORICAL_QUARTER_DEFS = [
    ("2025-Q3", "2025-09-30", -3),
    ("2025-Q4", "2025-12-31", -2),
    ("2026-Q1", "2026-03-31", -1),
    ("2026-Q2", "2026-06-30", 0),
]

SHARE_HORIZONS = [
    ("13 Weeks (1Q)", 13, 0.25),
    ("26 Weeks (2Q)", 26, 0.5),
    ("39 Weeks (3Q)", 39, 0.75),
    ("52 Weeks (1Y)", 52, 1.0),
    ("104 Weeks (2Y)", 104, 2.0),
    ("156 Weeks (3Y)", 156, 3.0),
]

MODEL_ENTRY_DATE = "2026-08-17"
MODEL_HOLDING_PERIOD_YEARS = 3.0


# Every method in research_store.VALUATION_METHODS may be *declared* by
# research, because declaring the right method is how a company records what
# kind of business it is. Only these are actually *priced*. Bank, insurer, and
# REIT valuation reduce to book value, float, and AFFO respectively -- none of
# which this pipeline collects -- and a defensible pre-revenue biotech rNPV
# needs per-programme probability of success and a discount rate. Pricing them
# with the generic growth-and-multiple formula would produce a number with no
# defensible meaning, so they fail closed instead.
IMPLEMENTED_VALUATION_METHODS = {
    "EARNINGS",
    "FCF",
    "REVENUE_WITH_MARGIN_BRIDGE",
}

UNIMPLEMENTED_METHOD_REASONS = {
    "BANK_PTB_ROE": "bank valuation requires tangible book value and ROE, which are not collected",
    "INSURER_PTB_ROE": "insurer valuation requires float, combined ratio, and reserve development, which are not collected",
    "REIT_AFFO": "REIT valuation requires an AFFO reconciliation and cap rate, which are not collected",
    "PRE_REVENUE_BIOTECH_RNPV": "pre-revenue biotech valuation requires per-programme probability of success and a discount rate, which are not collected",
}


def _unmodeled(symbol, company_name, field, reason):
    return {
        "symbol": symbol,
        "company_name": company_name or symbol,
        "status": "UNMODELED",
        "gaps": [{
            "field": field,
            "reason": reason,
            "owner": "Investment Thesis Agent",
            "renders": ["valuation model", "experimental classification", "order proposal"],
        }],
    }


def _required_method_for(sector, industry, ttm_revenue):
    """Map an industry classification to the valuation method it demands.

    Matching is on whole words. Substring matching previously routed
    "Investment Banking & Brokerage" to the bank model, which is a securities
    business valued on earnings, not on tangible book.
    """
    text = f"{sector or ''} {industry or ''}".lower()
    words = set(re.findall(r"[a-z]+", text))

    if "reit" in words or "real estate investment trust" in text:
        return "REIT_AFFO"
    if {"insurance", "insurer", "insurers"} & words:
        return "INSURER_PTB_ROE"
    # A depository bank is valued on book value; a broker or investment bank
    # is not, and both carry the word "banking".
    if {"bank", "banks"} & words and not ({"brokerage", "capital", "markets"} & words):
        return "BANK_PTB_ROE"
    if {"biotechnology", "biotech"} & words and (
        not isinstance(ttm_revenue, (int, float)) or ttm_revenue <= 0
    ):
        return "PRE_REVENUE_BIOTECH_RNPV"
    return None


def _model_experimental_distribution(
    symbol, current_price, shares_outstanding, ttm_revenue, sector, industry,
    company_name, filings, research,
):
    """Model method-specific valuation and scenario distribution without defaults."""
    params = research["valuation_parameters"]
    inputs = params["valuation_inputs"]
    method = params["valuation_method"]
    scenarios = research["forecast_scenarios"]
    horizon = float(params["horizon_years"])
    dilution = float(params["annual_share_dilution_rate"])
    uncertainty = float(params["uncertainty_score"])
    opportunity_cost = float(params["opportunity_cost_annualized"])
    conviction = float(params["conviction_score"])

    required_method = _required_method_for(sector, industry, ttm_revenue)
    if required_method and method != required_method:
        return _unmodeled(
            symbol, company_name, "valuation_parameters.valuation_method",
            f"industry classification requires {required_method}, received {method}",
        )
    if method not in IMPLEMENTED_VALUATION_METHODS:
        return _unmodeled(
            symbol, company_name, "valuation_parameters.valuation_method",
            f"{method} is declared but not implemented: "
            f"{UNIMPLEMENTED_METHOD_REASONS.get(method, 'no model exists for this method')}",
        )

    if not isinstance(current_price, (int, float)) or current_price <= 0:
        return _unmodeled(symbol, company_name, "current_price", "positive observed current price is required")
    if not isinstance(shares_outstanding, (int, float)) or shares_outstanding <= 0:
        return _unmodeled(symbol, company_name, "shares_outstanding", "positive SEC-observed diluted shares are required")
    current_price = float(current_price)
    shares = float(normalize_shares_outstanding(symbol, shares_outstanding) or shares_outstanding)
    future_shares = shares * ((1.0 + dilution) ** horizon)

    metric = float(inputs["current_metric_per_share"])
    primary_growth = float(inputs["annual_metric_growth"])
    target_multiple = float(inputs["target_multiple"])
    future_metric = metric * ((1.0 + primary_growth) ** horizon)
    current_multiple = current_price / metric if metric > 0 else None
    margin_bridge = None

    if method == "REVENUE_WITH_MARGIN_BRIDGE":
        # A revenue multiple is only defensible where profitability is not yet
        # representative, and then only if the path to profit is stated. Bridge
        # revenue through the target margin to earnings, and apply the multiple
        # to those earnings -- so target_multiple is an earnings multiple and
        # the margin assumption is load-bearing rather than decorative.
        target_margin_pct = float(inputs["target_margin_pct"])
        if target_margin_pct <= 0:
            return _unmodeled(
                symbol, company_name, "valuation_inputs.target_margin_pct",
                "a revenue-based valuation must bridge to a positive target margin",
            )
        future_earnings_per_share = (
            future_metric * (target_margin_pct / 100.0) / ((1.0 + dilution) ** horizon)
        )
        method_target = future_earnings_per_share * target_multiple
        margin_bridge = {
            "current_revenue_per_share": round(metric, 4),
            "horizon_revenue_per_share": round(future_metric, 4),
            "target_margin_pct": round(target_margin_pct, 4),
            "horizon_earnings_per_share": round(future_earnings_per_share, 4),
            "target_earnings_multiple": round(target_multiple, 4),
            "current_price_to_sales": round(current_multiple, 4) if current_multiple else None,
        }
    else:
        method_target = future_metric * target_multiple / ((1.0 + dilution) ** horizon)

    if method_target <= 0:
        return _unmodeled(symbol, company_name, "valuation_inputs", "method-specific valuation produced a non-positive target")
    base_target = float(scenarios["base"]["price_target"])
    divergence = abs(base_target - method_target) / method_target
    if divergence > 0.35:
        return _unmodeled(
            symbol, company_name, "forecast_scenarios.base.price_target",
            f"base scenario differs from the method-specific valuation by {divergence * 100.0:.1f} percent; reconcile inputs",
        )

    probabilities = {name: float(scenarios[name]["probability"]) for name in ("bear", "base", "bull")}
    targets = {name: float(scenarios[name]["price_target"]) for name in ("bear", "base", "bull")}
    expected_target = sum(probabilities[name] * targets[name] for name in targets)
    expected_cagr = (expected_target / current_price) ** (1.0 / horizon) - 1.0
    downside_probability = sum(probabilities[name] for name in targets if targets[name] < current_price)
    bear_total_return = targets["bear"] / current_price - 1.0
    classification_hurdle = max(0.20, opportunity_cost) + uncertainty * 0.05
    if conviction < 5.0 or bear_total_return <= -0.80:
        rating = "AVOID"
    elif expected_cagr >= classification_hurdle and downside_probability <= 0.35:
        rating = "BUY"
    elif expected_cagr >= opportunity_cost:
        rating = "HOLD"
    else:
        rating = "AVOID"

    total_roi_pct = (expected_target / current_price - 1.0) * 100.0
    annualized_roi_pct = expected_cagr * 100.0
    shares_m = shares / 1e6
    shares_projections = []
    for label, weeks, years in SHARE_HORIZONS:
        projected = shares * ((1.0 + dilution) ** years)
        shares_projections.append({
            "horizon_weeks": weeks,
            "horizon_label": label,
            "shares_outstanding_m": round(projected / 1e6, 3),
            "shares_outstanding_b": round(projected / 1e9, 6),
            "shares_outstanding": round(projected, 0),
            "net_annual_dilution_or_burn_rate_pct": round(dilution * 100.0, 4),
        })

    price_target_ranges = []
    for label, weeks, years in (("13 Weeks", 13, 0.25), ("52 Weeks (1Y)", 52, 1.0), ("104 Weeks (2Y)", 104, 2.0), ("156 Weeks (3Y)", 156, horizon)):
        fraction = min(years / horizon, 1.0)
        interpolated = {
            name: current_price * ((targets[name] / current_price) ** fraction)
            for name in targets
        }
        expected = sum(probabilities[name] * interpolated[name] for name in targets)
        price_target_ranges.append({
            "horizon_weeks": weeks,
            "horizon_label": label,
            "bear_price": round(interpolated["bear"], 2),
            "base_price": round(interpolated["base"], 2),
            "bull_price": round(interpolated["bull"], 2),
            "expected_price": round(expected, 2),
            "implied_ps_multiple": target_multiple if method == "REVENUE_WITH_MARGIN_BRIDGE" else None,
            "annualized_cagr_pct": round(((expected / current_price) ** (1.0 / years) - 1.0) * 100.0, 4),
        })

    forecast_rows = []
    if method == "REVENUE_WITH_MARGIN_BRIDGE":
        raw_revenue = float(ttm_revenue or 0.0)
        if raw_revenue <= 0:
            return _unmodeled(symbol, company_name, "ttm_revenue", "revenue method requires positive SEC-observed TTM revenue")
        quarterly_base = raw_revenue / 4.0
        for label, index, period_date in QUARTER_DEFS:
            projected = quarterly_base * ((1.0 + primary_growth) ** (index / 4.0))
            projected_shares = shares * ((1.0 + dilution) ** (index / 4.0))
            forecast_rows.append({
                "quarter_index": index,
                "quarter_label": label,
                "date": period_date,
                "period_type": "CURRENT" if index == 0 else "PROJECTED",
                "projected_revenue_usd": round(projected, 2),
                "projected_revenue_b": round(projected / 1e9, 6),
                "yoy_growth_pct": round(primary_growth * 100.0, 4),
                "projected_shares_b": round(projected_shares / 1e9, 6),
                "projected_shares_m": round(projected_shares / 1e6, 3),
                "projected_ps_multiple": target_multiple,
                "implied_stock_price": None,
                "basis": "AGENT_INPUT_STRAIGHT_LINE_NO_SEASONALITY_DEFAULT",
                "catalyst_name": None,
                "catalyst_incremental_revenue_b": 0.0,
            })

    balance_sheet = _extract_balance_sheet(filings)
    total_debt = balance_sheet["total_debt_usd"]
    cash = balance_sheet["cash_and_equivalents_usd"]
    target_roi_str = f"{annualized_roi_pct:.1f}%"
    return_engine = {
        "symbol": symbol,
        "company_name": company_name or symbol,
        "entry_strategy": None,
        "exit_strategy": None,
        "benchmark_entry_price": round(current_price, 2),
        "target_exit_price": round(expected_target, 2),
        "entry_date": None,
        "target_exit_date": None,
        "csp_proceeds": 0.0,
        "cc_proceeds": 0.0,
        "dividend_proceeds": 0.0,
        "initial_capital_outlay": round(current_price, 2),
        "total_proceeds": round(expected_target, 2),
        "net_profit": round(expected_target - current_price, 2),
        "holding_period_days": round(horizon * 365.25),
        "holding_period_years": horizon,
        "capital_gain_pct": round(total_roi_pct, 4),
        "options_yield_pct": 0.0,
        "total_roi_pct": round(total_roi_pct, 4),
        "annualized_roi_pct": round(annualized_roi_pct, 4),
        "target_roi_str": target_roi_str,
    }
    return {
        "symbol": symbol,
        "company_name": company_name or symbol,
        "status": "MODELED",
        "gaps": [],
        "sector": sector,
        "industry": industry,
        "valuation_method": method,
        "valuation_method_target": round(method_target, 2),
        "margin_bridge": margin_bridge,
        "scenario_distribution": {
            "probabilities": probabilities,
            "targets": targets,
            "expected_target": round(expected_target, 2),
            "expected_annualized_return_pct": round(annualized_roi_pct, 4),
            "downside_probability": round(downside_probability, 6),
            "bear_total_return_pct": round(bear_total_return * 100.0, 4),
            "uncertainty_score": uncertainty,
            "opportunity_cost_annualized": opportunity_cost,
        },
        "current_price": round(current_price, 2),
        "entry_price": round(current_price, 2),
        "target_exit_price": round(expected_target, 2),
        "rating": rating,
        "conviction_score": conviction,
        "holding_period": f"{horizon:g} Years",
        "holding_period_years": horizon,
        "target_strategy": "EXPERIMENTAL_CLASSIFICATION_ONLY",
        "entry_strategy": None,
        "exit_strategy": None,
        "annual_rev_growth": primary_growth if method == "REVENUE_WITH_MARGIN_BRIDGE" else None,
        "current_ps_multiple": current_multiple if method == "REVENUE_WITH_MARGIN_BRIDGE" else None,
        "target_ps_multiple": target_multiple if method == "REVENUE_WITH_MARGIN_BRIDGE" else None,
        "net_dilution_rate": dilution,
        "ttm_revenue_usd": ttm_revenue,
        "shares_outstanding": shares,
        "total_debt_usd": total_debt,
        "cash_and_equivalents_usd": cash,
        "net_cash_usd": cash - total_debt if isinstance(cash, float) and isinstance(total_debt, float) else None,
        "annual_dividend_usd": None,
        "dividend_yield_pct": None,
        "market_share": None,
        "return_engine": return_engine,
        "target_roi_str": target_roi_str,
        "annualized_roi_pct": round(annualized_roi_pct, 4),
        "historical_quarterly_revenue": [],
        "revenue_forecast_13q": forecast_rows,
        "quarterly_revenue_trajectory": forecast_rows,
        "shares_projections_6h": shares_projections,
        "price_target_ranges_4h": price_target_ranges,
    }


def _extract_balance_sheet(filings: Optional[List[Dict[str, Any]]]) -> Dict[str, Optional[float]]:
    """Reads debt and cash from the most recent Tier 1 filing.

    Returns None for any figure the filings do not carry. Callers report the
    absence; nothing here estimates a balance sheet from revenue or sector.
    """
    result = {"total_debt_usd": None, "cash_and_equivalents_usd": None}
    if not filings:
        return result

    balance_sheet = (filings[0].get("data") or {}).get("balance_sheet") or {}
    debt = balance_sheet.get("total_debt")
    cash = balance_sheet.get("cash_and_cash_equivalents")
    if isinstance(debt, (int, float)):
        result["total_debt_usd"] = float(debt)
    if isinstance(cash, (int, float)):
        result["cash_and_equivalents_usd"] = float(cash)
    return result


def model_equity_valuation(
    symbol: str,
    current_price: float,
    shares_outstanding: float,
    ttm_revenue: float,
    sector: str = "",
    industry: str = "",
    company_name: Optional[str] = None,
    filings: Optional[List[Dict[str, Any]]] = None,
    research: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Computes the multi-horizon model from agent-supplied parameters.

    Returns {"status": "UNMODELED", "gaps": [...]} when the agent has not
    written the parameters this model requires. Callers must check status
    before reading any modeled figure.
    """
    if research is None:
        research = research_store.load_research(symbol)

    gaps = research_store.require_fields(
        symbol, research_store.VALUATION_REQUIRED_FIELDS, research=research)
    if gaps:
        return {
            "symbol": symbol,
            "company_name": company_name or symbol,
            "status": "UNMODELED",
            "gaps": [
                {"field": g.field, "reason": g.reason, "owner": g.owner, "renders": g.renders}
                for g in gaps
            ],
        }

    return _model_experimental_distribution(
        symbol, current_price, shares_outstanding, ttm_revenue, sector, industry,
        company_name, filings, research,
    )
