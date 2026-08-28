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


def _build_historical_quarters(
    filings: Optional[List[Dict[str, Any]]],
    quarterly_rev_base: float,
    shares_b: float,
    current_price: float,
    current_ps: float,
    growth_rate: float,
    dilution_rate: float,
) -> List[Dict[str, Any]]:
    """Reported quarters where filings supply them, back-cast where they do not.

    Back-cast rows are labelled period_type BACKCAST so a reader can tell a
    reported figure from an extrapolation of the agent's growth assumption.
    """
    filings_by_period = {}
    for filing in filings or []:
        period_end = filing.get("period_end") or filing.get("filing_date")
        if period_end:
            filings_by_period[period_end] = filing

    quarters = []
    for label, date, offset in HISTORICAL_QUARTER_DEFS:
        growth_factor = (1.0 + growth_rate) ** (offset / 4.0)
        seasonality = 1.08 if (offset % 4 == 1) else (
            0.94 if (offset % 4 == 2) else (0.98 if (offset % 4 == 3) else 1.02))
        revenue_b = quarterly_rev_base * growth_factor * seasonality
        quarter_shares_b = shares_b * ((1.0 + dilution_rate) ** (offset / 4.0))
        period_type = "BACKCAST"

        matched = None
        for period_end, filing in filings_by_period.items():
            if period_end.startswith(date[:7]):
                matched = filing
                break

        if matched:
            data = matched.get("data", {})
            reported_revenue = data.get("revenue")
            reported_shares = data.get("shares_outstanding")
            if reported_revenue and reported_revenue > 0:
                # Filings carry either a quarterly or a year-to-date figure.
                ttm_scale = quarterly_rev_base * 4.0 * 1e9
                if reported_revenue > ttm_scale * 0.6:
                    revenue_b = (reported_revenue / 4.0) / 1e9
                else:
                    revenue_b = reported_revenue / 1e9
                period_type = "REPORTED"
            if reported_shares and reported_shares > 0:
                quarter_shares_b = reported_shares / 1e9

        ps_multiple = round(
            (quarter_shares_b * 1e9 * current_price) / (revenue_b * 4.0 * 1e9), 2
        ) if revenue_b > 0 else round(current_ps, 2)
        implied_price = round(
            ((revenue_b * 4.0) * ps_multiple) / quarter_shares_b, 2
        ) if quarter_shares_b > 0 else current_price

        quarters.append({
            "quarter_label": f"{label} (Hist)",
            "date": date,
            "period_type": period_type,
            "revenue_b": round(revenue_b, 2),
            "revenue_usd": round(revenue_b * 1e9, 2),
            "yoy_growth_pct": round(growth_rate * 100.0, 1),
            "shares_b": round(quarter_shares_b, 3),
            "shares_m": round(quarter_shares_b * 1000.0, 1),
            "ps_multiple": ps_multiple,
            "implied_stock_price": implied_price,
        })

    return quarters


def _catalyst_ramp(catalysts: List[Dict[str, Any]]) -> Dict[int, Dict[str, Any]]:
    """Maps each catalyst's revenue impact onto the quarters it ramps through.

    The S-curve shape (20 percent in the launch quarter, 50 percent in the next,
    75 percent thereafter) is a modeling convention applied uniformly. The
    revenue impact and the launch window are the agent's numbers.
    """
    ramp = {q: {"incremental_revenue_b": 0.0, "catalyst_name": None} for q in range(13)}

    for catalyst in catalysts:
        window = catalyst.get("target_window", "")
        impact = float(catalyst.get("expected_revenue_impact_b", 0.0) or 0.0)
        name = catalyst.get("product_or_service_name")

        launch_idx = None
        for label, idx, _ in QUARTER_DEFS:
            if window and window in label:
                launch_idx = idx
                break
        if launch_idx is None:
            # A catalyst dated outside the 13-quarter window contributes no
            # modeled revenue rather than being snapped to an arbitrary quarter.
            continue

        ramp[launch_idx]["catalyst_name"] = name
        for q in range(launch_idx, 13):
            factor = 0.20 if q == launch_idx else (0.50 if q == launch_idx + 1 else 0.75)
            ramp[q]["incremental_revenue_b"] += impact * factor

    return ramp


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

    params = research["valuation_parameters"]
    growth_rate = float(params["annual_revenue_growth"])
    multiple_factor = float(params["target_ps_multiple_multiplier"])
    dilution_rate = float(params["annual_share_dilution_rate"])
    conviction_score = float(params["conviction_score"])

    # Normalize the traded security to US ADR-equivalent shares and USD revenue.
    current_price = round(float(current_price), 2)
    raw_shares = float(shares_outstanding or 0.0)
    if raw_shares <= 0:
        return {
            "symbol": symbol,
            "company_name": company_name or symbol,
            "status": "UNMODELED",
            "gaps": [{
                "field": "shares_outstanding",
                "reason": "no positive share count available from SEC filings or market data",
                "owner": "deterministic ingestion (fetch_sec.py)",
                "renders": ["valuation model"],
            }],
        }

    normalized_shares = normalize_shares_outstanding(symbol, raw_shares)
    shares = float(normalized_shares) if normalized_shares else raw_shares
    shares_m = round(shares / 1e6, 0)
    shares_b = shares / 1e9

    raw_revenue = float(ttm_revenue or 0.0)
    if raw_revenue <= 0:
        return {
            "symbol": symbol,
            "company_name": company_name or symbol,
            "status": "UNMODELED",
            "gaps": [{
                "field": "ttm_revenue",
                "reason": "no positive trailing twelve month revenue available from SEC filings",
                "owner": "deterministic ingestion (fetch_sec.py)",
                "renders": ["valuation model"],
            }],
        }

    converted_revenue = convert_to_usd(raw_revenue, symbol=symbol)
    ttm_rev = float(converted_revenue) if converted_revenue else raw_revenue
    ttm_rev_b = ttm_rev / 1e9
    quarterly_rev_base = ttm_rev_b / 4.0

    current_ps = (shares * current_price) / ttm_rev

    # Multiple compression guard rails. These bound the agent's multiplier at
    # extreme starting multiples; they do not originate a multiple.
    if current_ps > 40.0:
        multiple_factor = min(multiple_factor, 0.78)
    elif current_ps > 25.0:
        multiple_factor = min(multiple_factor, 0.85)

    target_ps_3y = round(current_ps * multiple_factor, 2)
    if target_ps_3y < 0.05:
        target_ps_3y = round(max(current_ps * 0.5, 0.01), 2)

    historical_quarters = _build_historical_quarters(
        filings, quarterly_rev_base, shares_b, current_price,
        current_ps, growth_rate, dilution_rate)

    catalysts = (research.get("catalyst_timeline") or {}).get("items") or []
    ramp = _catalyst_ramp(catalysts)

    # 13-Quarter Revenue Forecast Matrix
    forecast_rows: List[Dict[str, Any]] = []
    for label, idx, date in QUARTER_DEFS:
        seasonality = 1.06 if (idx % 4 == 1) else (
            0.95 if (idx % 4 == 2) else (0.98 if (idx % 4 == 3) else 1.01))
        core_growth_factor = (1.0 + (growth_rate * 0.92)) ** (idx / 4.0)
        base_revenue = quarterly_rev_base * core_growth_factor * seasonality
        incremental = ramp[idx]["incremental_revenue_b"]
        projected_revenue = base_revenue + incremental

        if idx >= 4:
            prior_revenue = forecast_rows[idx - 4]["projected_revenue_b"]
        elif idx < len(historical_quarters):
            prior_revenue = historical_quarters[idx]["revenue_b"]
        else:
            prior_revenue = 0.0
        yoy_growth = (
            ((projected_revenue - prior_revenue) / prior_revenue) * 100.0
            if prior_revenue > 0 else growth_rate * 100.0
        )

        projected_shares_b = shares_b * ((1.0 + dilution_rate) ** (idx / 4.0))
        projected_ps = round(current_ps + (target_ps_3y - current_ps) * (idx / 12.0), 2)
        if projected_ps < 0.05:
            projected_ps = 0.05
        projected_ttm_rev_b = projected_revenue * 4.0
        implied_price = round(
            (projected_ttm_rev_b * projected_ps) / projected_shares_b, 2
        ) if projected_shares_b > 0 else current_price

        catalyst_name = ramp[idx]["catalyst_name"]
        forecast_rows.append({
            "quarter_index": idx,
            "quarter_label": label,
            "date": date,
            "period_type": "CURRENT" if idx == 0 else "PROJECTED",
            "projected_revenue_usd": round(projected_revenue * 1e9, 2),
            "projected_revenue_b": round(projected_revenue, 2),
            "yoy_growth_pct": round(yoy_growth, 1),
            "projected_shares_b": round(projected_shares_b, 3),
            "projected_shares_m": round(projected_shares_b * 1000.0, 1),
            "projected_ps_multiple": projected_ps,
            "implied_stock_price": implied_price,
            # Mechanical description of how this row was produced. The renderer
            # names the agent's catalyst; it does not narrate a growth story.
            "basis": "CATALYST_RAMP" if incremental > 0 else "BASELINE_EXTRAPOLATION",
            "catalyst_name": catalyst_name,
            "catalyst_incremental_revenue_b": round(incremental, 3),
        })

    # Combined historical and projected trajectory
    quarterly_trajectory = [
        {
            "quarter_label": q["quarter_label"],
            "date": q["date"],
            "period_type": q["period_type"],
            "revenue_b": q["revenue_b"],
            "revenue_usd": q["revenue_usd"],
            "yoy_growth_pct": q["yoy_growth_pct"],
            "shares_b": q["shares_b"],
            "shares_m": q["shares_m"],
            "ps_multiple": q["ps_multiple"],
            "implied_stock_price": q["implied_stock_price"],
        }
        for q in historical_quarters
    ] + [
        {
            "quarter_label": f["quarter_label"],
            "date": f["date"],
            "period_type": f["period_type"],
            "revenue_b": f["projected_revenue_b"],
            "revenue_usd": f["projected_revenue_usd"],
            "yoy_growth_pct": f["yoy_growth_pct"],
            "shares_b": f["projected_shares_b"],
            "shares_m": f["projected_shares_m"],
            "ps_multiple": f["projected_ps_multiple"],
            "implied_stock_price": f["implied_stock_price"],
        }
        for f in forecast_rows
    ]

    # 6-Horizon Shares Outstanding
    shares_projections = []
    for label, weeks, years in SHARE_HORIZONS:
        projected_m = shares_m * ((1.0 + dilution_rate) ** years)
        shares_projections.append({
            "horizon_weeks": weeks,
            "horizon_label": label,
            "shares_outstanding_m": round(projected_m, 0),
            "shares_outstanding_b": round(projected_m / 1000.0, 3),
            "shares_outstanding": round(projected_m * 1e6, 0),
            "net_annual_dilution_or_burn_rate_pct": round(dilution_rate * 100.0, 1),
        })

    # 4-Horizon Price Target Ranges against true trailing four-quarter sums
    price_horizons = [
        ("13 Weeks", 13, 0.25, current_ps * 0.98, (1, 2), 1),
        ("52 Weeks (1Y)", 52, 1.0, current_ps + (target_ps_3y - current_ps) * 0.33, (1, 5), 4),
        ("104 Weeks (2Y)", 104, 2.0, current_ps + (target_ps_3y - current_ps) * 0.67, (5, 9), 8),
        ("156 Weeks (3Y)", 156, 3.0, target_ps_3y, (9, 13), 12),
    ]
    price_target_ranges = []
    for label, weeks, years, target_ps, rev_slice, shares_idx in price_horizons:
        target_ps = round(target_ps, 2)
        start, stop = rev_slice
        if weeks == 13:
            ttm_revenue_usd = forecast_rows[1]["projected_revenue_b"] * 4.0 * 1e9
        else:
            ttm_revenue_usd = sum(
                forecast_rows[k]["projected_revenue_b"] for k in range(start, stop)) * 1e9
        horizon_shares = forecast_rows[shares_idx]["projected_shares_b"] * 1e9

        base_price = round(
            (ttm_revenue_usd * target_ps) / horizon_shares, 2) if horizon_shares > 0 else current_price
        if base_price < 0.01:
            base_price = round(max(current_price * 0.5, 0.01), 2)
        annualized_cagr = round(
            (((base_price / current_price) ** (1.0 / years)) - 1.0) * 100.0, 1
        ) if (years > 0 and current_price > 0) else 0.0

        price_target_ranges.append({
            "horizon_weeks": weeks,
            "horizon_label": label,
            "bear_price": round(max(base_price * 0.80, 0.01), 2),
            "base_price": base_price,
            "bull_price": round(max(base_price * 1.20, 0.01), 2),
            "implied_ps_multiple": target_ps,
            "annualized_cagr_pct": annualized_cagr,
        })

    target_exit_price = max(price_target_ranges[-1]["base_price"], 0.01)
    base_3y_cagr = price_target_ranges[-1]["annualized_cagr_pct"]

    # Rating and options overlay follow deterministically from the modeled CAGR
    # and the agent's conviction score. The thresholds are the strategy rules in
    # AGENTS.md section 5, not a judgment formed here.
    dividend = research.get("dividend_profile") or {}
    dividend_yield_pct = float(dividend.get("dividend_yield_pct") or 0.0)
    annual_dividend_usd = round((dividend_yield_pct / 100.0) * current_price, 2)

    if conviction_score < 6.0 or base_3y_cagr < 0.0:
        rating = "AVOID"
        target_strategy = "Capital Preservation & Risk Avoidance"
        entry_strategy, exit_strategy = "LIMIT_BUY", "LIMIT_SELL"
        csp_proceeds = cc_proceeds = 0.0
    elif (base_3y_cagr >= 17.5 and conviction_score >= 8.7) or (
            base_3y_cagr >= 20.0 and conviction_score >= 8.5):
        rating = "BUY"
        if conviction_score >= 9.4 and base_3y_cagr >= 20.0:
            target_strategy = "High-Conviction Secular Growth Leader with Limit Buy Accumulation"
            entry_strategy, exit_strategy = "LIMIT_BUY", "LIMIT_SELL"
            csp_proceeds = cc_proceeds = 0.0
        else:
            target_strategy = "High-Growth Secular Compounder with Cash-Secured Put Entry"
            entry_strategy, exit_strategy = "SELL_CSP", "LIMIT_SELL"
            csp_proceeds, cc_proceeds = round(current_price * 0.035, 2), 0.0
    elif base_3y_cagr >= 7.0:
        rating = "HOLD"
        target_strategy = "Quality Compounder with Disciplined Covered Call Yield Harvesting"
        entry_strategy, exit_strategy = "LIMIT_BUY", "SELL_COVERED_CALLS"
        csp_proceeds, cc_proceeds = 0.0, round(current_price * 0.09, 2)
    else:
        rating = "SELL"
        target_strategy = "Capital Reallocation & Controlled Limit Exit"
        entry_strategy, exit_strategy = "LIMIT_BUY", "LIMIT_SELL"
        csp_proceeds = cc_proceeds = 0.0

    return_result = calculate_annualized_roi(
        benchmark_entry_price=current_price,
        target_exit_price=target_exit_price,
        entry_strategy=entry_strategy,
        exit_strategy=exit_strategy,
        entry_date=MODEL_ENTRY_DATE,
        holding_period_years=MODEL_HOLDING_PERIOD_YEARS,
        csp_proceeds=csp_proceeds,
        cc_proceeds=cc_proceeds,
        symbol=symbol,
        company_name=company_name or symbol,
    )

    # Reconcile the rating with the Return Engine: a BUY must clear the hurdle
    # after the options overlay, not merely on price appreciation.
    if rating == "BUY" and return_result.annualized_roi_pct < 20.0:
        rating = "HOLD"
        target_strategy = "Quality Compounder with Disciplined Covered Call Yield Harvesting"
        entry_strategy, exit_strategy = "LIMIT_BUY", "SELL_COVERED_CALLS"
        csp_proceeds, cc_proceeds = 0.0, round(current_price * 0.09, 2)
        return_result = calculate_annualized_roi(
            benchmark_entry_price=current_price,
            target_exit_price=target_exit_price,
            entry_strategy=entry_strategy,
            exit_strategy=exit_strategy,
            entry_date=MODEL_ENTRY_DATE,
            holding_period_years=MODEL_HOLDING_PERIOD_YEARS,
            csp_proceeds=csp_proceeds,
            cc_proceeds=cc_proceeds,
            symbol=symbol,
            company_name=company_name or symbol,
        )

    balance_sheet = _extract_balance_sheet(filings)
    total_debt_usd = balance_sheet["total_debt_usd"]
    cash_usd = balance_sheet["cash_and_equivalents_usd"]

    # Market share arithmetic, only where the agent supplied a TAM estimate.
    tam = research.get("tam_and_market_share") or {}
    tam_estimate_b = tam.get("tam_estimate_usd_b")
    market_share = None
    if isinstance(tam_estimate_b, (int, float)) and tam_estimate_b > 0:
        tam_cagr = float(tam.get("tam_cagr_pct") or 0.0) / 100.0
        tam_3y_b = tam_estimate_b * ((1.0 + tam_cagr) ** 3.0)
        projected_ttm_rev_3y_b = sum(
            forecast_rows[k]["projected_revenue_b"] for k in range(9, 13))
        market_share = {
            "tam_estimate_usd_b": tam_estimate_b,
            "tam_cagr_pct": tam.get("tam_cagr_pct"),
            "current_market_share_pct": round((ttm_rev_b / tam_estimate_b) * 100.0, 2),
            "projected_market_share_3y_pct": round(
                (projected_ttm_rev_3y_b / tam_3y_b) * 100.0, 2) if tam_3y_b > 0 else None,
            "projected_tam_3y_usd_b": round(tam_3y_b, 1),
        }

    return {
        "symbol": symbol,
        "company_name": company_name or symbol,
        "status": "MODELED",
        "gaps": [],
        "sector": sector,
        "industry": industry,
        "current_price": current_price,
        "entry_price": current_price,
        "target_exit_price": target_exit_price,
        "rating": rating,
        "conviction_score": conviction_score,
        "holding_period": "3 to 5 Years",
        "holding_period_years": MODEL_HOLDING_PERIOD_YEARS,
        "target_strategy": target_strategy,
        "entry_strategy": entry_strategy,
        "exit_strategy": exit_strategy,
        "annual_rev_growth": growth_rate,
        "current_ps_multiple": round(current_ps, 1),
        "target_ps_multiple": target_ps_3y,
        "net_dilution_rate": dilution_rate,
        "ttm_revenue_usd": ttm_rev,
        "shares_outstanding": shares,
        "total_debt_usd": total_debt_usd,
        "cash_and_equivalents_usd": cash_usd,
        "net_cash_usd": (
            cash_usd - total_debt_usd
            if isinstance(cash_usd, float) and isinstance(total_debt_usd, float) else None
        ),
        "annual_dividend_usd": annual_dividend_usd,
        "dividend_yield_pct": dividend_yield_pct,
        "market_share": market_share,
        "return_engine": return_result.to_dict(),
        "target_roi_str": return_result.target_roi_str,
        "annualized_roi_pct": return_result.annualized_roi_pct,
        "historical_quarterly_revenue": historical_quarters,
        "revenue_forecast_13q": forecast_rows,
        "quarterly_revenue_trajectory": quarterly_trajectory,
        "shares_projections_6h": shares_projections,
        "price_target_ranges_4h": price_target_ranges,
    }
