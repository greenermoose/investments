"""
Valuation Model & Quantitative Forecasting Engine
Deterministic bottom-up financial forecasting, multi-horizon valuation modeling,
and Return Engine parameterization for all 144 universe equities.

Conforms to:
- context/schemas/investment_thesis_schema.json
- context/schemas/return_engine_schema.json
- AGENTS.md (No emojis, locked 2x2 grid card metric matrix, 20-year hurdle standard)
"""

import math
import os
import sys
from typing import Dict, Any, List, Tuple, Optional

# Add scripts directory to sys.path
scripts_dir = os.path.dirname(os.path.abspath(__file__))
if scripts_dir not in sys.path:
    sys.path.insert(0, scripts_dir)

from return_engine import calculate_annualized_roi, parse_iso_date

# 13-Quarter Forecasting Framework
QUARTER_DEFS = [
    ("2026-Q3 (Current)", 0),
    ("2026-Q4", 1),
    ("2027-Q1", 2),
    ("2027-Q2", 3),
    ("2027-Q3", 4),
    ("2027-Q4", 5),
    ("2028-Q1", 6),
    ("2028-Q2", 7),
    ("2028-Q3", 8),
    ("2028-Q4", 9),
    ("2029-Q1", 10),
    ("2029-Q2", 11),
    ("2029-Q3 (Q12)", 12)
]

# Curated Company Growth & Valuation Multiplier Profiles
# Schema: (annual_revenue_growth, target_ps_multiple_multiplier, annual_share_dilution_rate, conviction_score)
COMPANY_PROFILES = {
    # Mega-Cap Tech & Cloud Compounders
    "NVDA":  (0.28, 0.85, -0.020, 9.5),
    "MSFT":  (0.13, 0.95, -0.015, 9.4),
    "GOOGL": (0.12, 0.95, -0.025, 9.3),
    "GOOG":  (0.12, 0.95, -0.025, 9.3),
    "META":  (0.14, 0.95, -0.020, 9.2),
    "AMZN":  (0.13, 0.95, 0.005, 9.2),
    "AAPL":  (0.08, 0.95, -0.025, 9.0),
    "PLTR":  (0.25, 0.82, 0.015, 9.2),
    "ARM":   (0.24, 0.80, 0.010, 8.9),
    "APP":   (0.26, 0.82, 0.010, 8.9),
    "CRWD":  (0.23, 0.85, 0.015, 9.1),
    "DDOG":  (0.22, 0.85, 0.015, 8.8),
    "NET":   (0.22, 0.82, 0.020, 8.6),
    "MELI":  (0.25, 0.90, -0.005, 9.3),
    "DASH":  (0.21, 0.88, 0.010, 8.7),
    "SPOT":  (0.21, 0.90, -0.010, 8.9),
    "AMD":   (0.21, 0.90, 0.005, 8.8),
    "ASML":  (0.19, 0.95, -0.015, 9.1),
    "TSM":   (0.20, 0.95, -0.005, 9.3),
    "AVGO":  (0.18, 0.92, -0.010, 9.0),
    "QCOM":  (0.08, 0.92, -0.015, 8.3),
    "TXN":   (0.06, 0.92, -0.010, 8.1),
    "ADBE":  (0.11, 0.90, -0.020, 8.7),
    "CRM":   (0.10, 0.90, -0.015, 8.6),
    "NOW":   (0.19, 0.88, 0.010, 9.0),
    "INTU":  (0.12, 0.92, -0.010, 8.8),
    "SNOW":  (0.22, 0.75, 0.025, 7.8),
    "MDB":   (0.20, 0.78, 0.025, 7.6),
    "PANW":  (0.16, 0.85, 0.010, 8.4),
    "FTNT":  (0.16, 0.95, -0.020, 8.8),
    "KLAC":  (0.14, 0.95, -0.015, 8.8),
    "LRCX":  (0.13, 0.95, -0.020, 8.7),
    "AMAT":  (0.11, 0.92, -0.020, 8.6),
    "ADI":   (0.07, 0.92, -0.010, 8.0),
    "CDNS":  (0.13, 0.92, -0.005, 8.7),
    "SNPS":  (0.13, 0.92, -0.005, 8.7),
    "WDAY":  (0.13, 0.88, 0.010, 8.3),
    "ORCL":  (0.09, 0.90, 0.005, 8.2),
    "IBM":   (0.04, 0.92, -0.005, 7.7),
    "CSCO":  (0.03, 0.90, -0.015, 7.5),
    "INTC":  (-0.02, 0.80, 0.015, 5.0),
    "MU":    (0.14, 0.85, 0.005, 7.8),
    "MSTR":  (0.12, 0.75, 0.030, 6.5),

    # Consumer Platforms & Retail
    "ABNB":  (0.15, 0.92, -0.015, 8.9),
    "BKNG":  (0.11, 0.95, -0.030, 9.1),
    "COST":  (0.09, 0.92, -0.005, 8.9),
    "WMT":   (0.05, 0.92, -0.005, 8.3),
    "HD":    (0.04, 0.92, -0.015, 8.2),
    "LOW":   (0.04, 0.92, -0.020, 8.1),
    "NKE":   (0.06, 0.90, -0.015, 7.9),
    "SBUX":  (0.05, 0.90, -0.010, 7.8),
    "MCD":   (0.05, 0.92, -0.010, 8.2),
    "CMG":   (0.13, 0.90, -0.010, 8.7),
    "PDD":   (0.16, 0.88, -0.005, 8.2),
    "CPRT":  (0.10, 0.95, -0.005, 8.7),
    "FAST":  (0.07, 0.92, -0.005, 8.3),
    "ORLY":  (0.07, 0.95, -0.025, 8.8),
    "AZO":   (0.06, 0.95, -0.035, 8.9),
    "TJX":   (0.06, 0.92, -0.010, 8.3),
    "ROST":  (0.06, 0.92, -0.010, 8.2),

    # Financials & Payments
    "V":     (0.10, 0.95, -0.015, 9.1),
    "MA":    (0.11, 0.95, -0.015, 9.1),
    "AXP":   (0.10, 0.95, -0.020, 9.0),
    "JPM":   (0.07, 0.95, -0.015, 8.9),
    "GS":    (0.07, 0.95, -0.015, 8.6),
    "MS":    (0.06, 0.95, -0.015, 8.5),
    "BRK-B": (0.07, 0.98, -0.010, 9.4),
    "BAM":   (0.12, 0.95, -0.005, 8.8),
    "BLK":   (0.08, 0.95, -0.010, 8.7),
    "PYPL":  (0.05, 0.88, -0.025, 7.5),
    "SQ":    (0.11, 0.88, 0.005, 8.0),
    "XYZ":   (0.11, 0.88, 0.005, 8.0),

    # Healthcare, MedTech & Biotech
    "ISRG":  (0.17, 0.95, -0.005, 9.0),
    "VRTX":  (0.18, 0.95, -0.010, 9.0),
    "ALNY":  (0.24, 0.88, 0.015, 8.7),
    "AXON":  (0.25, 0.88, 0.010, 8.9),
    "LLY":   (0.19, 0.82, 0.000, 9.0),
    "DXCM":  (0.16, 0.90, 0.005, 8.5),
    "IDXX":  (0.10, 0.92, -0.010, 8.5),
    "UNH":   (0.08, 0.95, -0.010, 8.8),
    "ELV":   (0.07, 0.92, -0.015, 8.4),
    "MDT":   (0.04, 0.95, -0.010, 7.8),
    "SYK":   (0.09, 0.95, -0.005, 8.6),
    "BSX":   (0.12, 0.92, 0.000, 8.6),
    "REGN":  (0.08, 0.92, -0.015, 8.4),
    "GILD":  (0.03, 0.92, -0.010, 7.2),
    "AMGN":  (0.05, 0.90, -0.010, 7.8),
    "BIIB":  (0.02, 0.88, 0.000, 6.8),
    "MRNA":  (0.05, 0.75, 0.020, 6.2),
    "BNTX":  (0.04, 0.75, 0.015, 6.2),
    "INSM":  (0.18, 0.80, 0.025, 7.2),
    "BEAM":  (0.15, 0.70, 0.030, 6.0),
    "CRSP":  (0.15, 0.70, 0.030, 6.0),
    "EDIT":  (0.10, 0.65, 0.035, 5.5),
    "NTLA":  (0.10, 0.65, 0.035, 5.5),

    # Industrials, Defense & Transport
    "GE":    (0.10, 0.95, -0.015, 8.7),
    "CAT":   (0.06, 0.95, -0.020, 8.5),
    "RTX":   (0.06, 0.95, -0.015, 8.4),
    "HON":   (0.05, 0.95, -0.015, 8.3),
    "UNP":   (0.05, 0.95, -0.020, 8.5),
    "CSX":   (0.04, 0.95, -0.020, 8.2),
    "NSC":   (0.04, 0.95, -0.015, 8.2),
    "WM":    (0.06, 0.95, -0.015, 8.6),
    "RSG":   (0.06, 0.95, -0.015, 8.5),
    "CTAS":  (0.08, 0.95, -0.015, 8.7),
    "PCAR":  (0.04, 0.90, -0.010, 8.0),
    "BA":    (0.05, 0.85, 0.020, 5.8),
    "BETA":  (0.15, 0.70, 0.030, 5.5),
    "JOBY":  (0.15, 0.70, 0.035, 5.5),
    "ACHR":  (0.15, 0.70, 0.035, 5.5),

    # Consumer Staples
    "PG":    (0.04, 0.95, -0.015, 8.4),
    "KO":    (0.04, 0.95, -0.010, 8.2),
    "PEP":   (0.04, 0.95, -0.010, 8.1),
    "PM":    (0.06, 0.92, -0.010, 8.2),
    "MO":    (0.02, 0.90, -0.015, 7.3),
    "MDLZ":  (0.04, 0.92, -0.010, 8.0),
    "KDP":   (0.04, 0.90, -0.005, 7.8),
    "MNST":  (0.10, 0.92, -0.015, 8.5),
    "CCEP":  (0.05, 0.92, -0.010, 8.1),

    # Energy & Utilities
    "XOM":   (0.03, 0.90, -0.015, 7.6),
    "CVX":   (0.03, 0.90, -0.015, 7.5),
    "COP":   (0.04, 0.90, -0.015, 7.8),
    "BKR":   (0.05, 0.90, -0.010, 7.8),
    "SLB":   (0.05, 0.90, -0.015, 7.8),
    "CEG":   (0.08, 0.88, 0.000, 8.2),
    "NEE":   (0.06, 0.90, 0.010, 7.9),
    "SO":    (0.03, 0.92, 0.005, 7.2),
    "DUK":   (0.03, 0.92, 0.005, 7.1),
    "AEP":   (0.03, 0.92, 0.005, 7.0),
    "EXC":   (0.03, 0.90, 0.005, 6.9),
    "SRE":   (0.04, 0.90, 0.005, 7.2),
    "PEG":   (0.04, 0.90, 0.005, 7.2),
    "XEL":   (0.04, 0.90, 0.005, 7.2),
    "WEC":   (0.03, 0.90, 0.005, 7.1),
    "ED":    (0.03, 0.90, 0.005, 7.0),

    # Telecom & Media
    "CMCSA": (0.02, 0.88, -0.020, 7.0),
    "CHTR":  (-0.01, 0.80, 0.020, 5.2),
    "WBD":   (-0.03, 0.75, 0.010, 4.5),
    "DIS":   (0.05, 0.90, -0.010, 7.8),
    "NFLX":  (0.14, 0.90, -0.015, 8.8),
    "VZ":    (0.01, 0.90, 0.000, 6.8),
    "T":     (0.01, 0.90, 0.000, 6.7),
    "TMUS":  (0.05, 0.92, -0.025, 8.2),

    # Speculative / Energy Tech
    "ENVX":  (0.15, 0.65, 0.035, 5.2),
    "SLDP":  (0.15, 0.65, 0.035, 5.2),
    "QS":    (0.15, 0.65, 0.035, 5.2),
    "CSIQ":  (0.03, 0.75, 0.015, 5.5),
    "FSLR":  (0.12, 0.85, 0.005, 8.0),
}

# Sector Default Baselines
SECTOR_DEFAULTS = {
    "Information Technology": (0.12, 0.90, 0.005, 8.2),
    "Communication Services": (0.09, 0.90, 0.000, 7.9),
    "Consumer Discretionary": (0.09, 0.90, -0.005, 8.0),
    "Health Care":            (0.07, 0.92, 0.000, 7.8),
    "Industrials":            (0.06, 0.92, -0.010, 8.0),
    "Financials":             (0.06, 0.95, -0.015, 8.2),
    "Consumer Staples":       (0.04, 0.92, -0.010, 7.8),
    "Energy":                 (0.03, 0.90, -0.015, 7.5),
    "Utilities":              (0.03, 0.90, 0.005, 7.2),
    "Real Estate":            (0.04, 0.90, 0.010, 7.0),
    "Materials":              (0.04, 0.90, -0.010, 7.4),
}


def model_equity_valuation(
    symbol: str,
    current_price: float,
    shares_outstanding: float,
    ttm_revenue: float,
    sector: str = "Information Technology",
    industry: str = "US Public Equity",
    company_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Computes rigorous bottom-up fundamental valuation, 13-quarter revenue path,
    6-horizon shares, 4-horizon price ranges, and returns Return Engine parameters.
    """
    curr_px = round(float(current_price), 2)
    shares = float(shares_outstanding or 1e9)

    # Normalize Berkshire Hathaway Class B share count (Class B equivalent ~2.16B shares)
    if symbol in ["BRK-B", "BRK.B"] and shares < 100e6:
        shares = 2.16e9

    shares_m = round(shares / 1e6, 0)
    shares_b = shares / 1e9
    ttm_rev = float(ttm_revenue or (shares * curr_px * 0.2))
    ttm_rev_b = ttm_rev / 1e9
    quarterly_rev_base = ttm_rev_b / 4.0

    curr_ps = (shares * curr_px) / ttm_rev if ttm_rev > 0 else 5.0

    # Retrieve profile
    if symbol in COMPANY_PROFILES:
        growth_rate, mult_factor, dilution_rate, conv_score = COMPANY_PROFILES[symbol]
    else:
        growth_rate, mult_factor, dilution_rate, conv_score = SECTOR_DEFAULTS.get(
            sector, (0.07, 0.90, 0.000, 7.5)
        )

    # Dynamic multiple compression adjustment for extreme multiples
    if curr_ps > 35.0:
        mult_factor = min(mult_factor, 0.70)
    elif curr_ps > 18.0:
        mult_factor = min(mult_factor, 0.82)
    elif curr_ps < 2.0 and growth_rate > 0.05:
        mult_factor = max(mult_factor, 1.10)

    target_ps_3y = round(curr_ps * mult_factor, 2)
    if target_ps_3y < 0.5:
        target_ps_3y = 0.5

    # 3-Year Fundamental Target
    h_years = 3.0
    proj_rev_3y = ttm_rev * ((1.0 + growth_rate) ** h_years)
    proj_shares_3y = shares * ((1.0 + dilution_rate) ** h_years)
    target_exit_px = round((proj_rev_3y * target_ps_3y) / proj_shares_3y, 2)

    # 13-Quarter Revenue Forecast Matrix
    forecast_rows = []
    for q_label, q_idx in QUARTER_DEFS:
        seasonality = 1.10 if (q_idx % 4 == 1) else (0.95 if (q_idx % 4 == 2) else 1.0)
        growth_factor = (1.0 + growth_rate) ** (q_idx / 4.0)
        proj_q_rev = quarterly_rev_base * growth_factor * seasonality
        yoy_growth = growth_rate * 100.0

        driver = f"{sector} core demand expansion and operational execution"
        if q_idx == 0:
            driver = "Current operational baseline and contract fulfillment"
        elif q_idx == 1:
            driver = "Year-end commercial procurement and budget deployment"
        elif q_idx == 4:
            driver = "Next-generation product cycle introduction and market share capture"
        elif q_idx == 8:
            driver = "International market expansion and enterprise subscription scaling"
        elif q_idx == 12:
            driver = "Platform ecosystem maturation and adjacent TAM monetization"

        forecast_rows.append({
            "quarter_index": q_idx,
            "quarter_label": q_label,
            "projected_revenue_usd": round(proj_q_rev * 1e9, 2),
            "projected_revenue_b": round(proj_q_rev, 2),
            "yoy_growth_pct": round(yoy_growth, 1),
            "primary_growth_driver": driver
        })

    # 6-Horizon Shares Outstanding
    share_horizons = [
        ("13 Weeks (1Q)", 13, 0.25),
        ("26 Weeks (2Q)", 26, 0.5),
        ("39 Weeks (3Q)", 39, 0.75),
        ("52 Weeks (1Y)", 52, 1.0),
        ("104 Weeks (2Y)", 104, 2.0),
        ("156 Weeks (3Y)", 156, 3.0)
    ]
    dilution_pct = dilution_rate * 100.0
    dilution_desc = "Open-market share repurchases funded by operational free cash flow" if dilution_rate < 0 else (
        "Stock-based compensation dilution partially offset by tactical buybacks" if dilution_rate > 0 else "Stable share count with neutral dilution"
    )

    shares_projections = []
    for h_label, h_wks, h_yrs in share_horizons:
        proj_s = shares_m * ((1.0 + dilution_rate) ** h_yrs)
        shares_projections.append({
            "horizon_weeks": h_wks,
            "horizon_label": h_label,
            "shares_outstanding_m": round(proj_s, 0),
            "shares_outstanding": round(proj_s * 1e6, 0),
            "net_annual_dilution_or_burn_rate_pct": round(dilution_pct, 1),
            "rationale": dilution_desc
        })

    # 4-Horizon Price Ranges
    price_horizons = [
        ("13 Weeks", 13, 0.25, 0.98),
        ("52 Weeks (1Y)", 52, 1.0, (1.0 + (mult_factor - 1.0) * 0.33)),
        ("104 Weeks (2Y)", 104, 2.0, (1.0 + (mult_factor - 1.0) * 0.67)),
        ("156 Weeks (3Y)", 156, 3.0, mult_factor)
    ]
    price_target_ranges = []
    for p_label, p_wks, p_yrs, p_mult_fact in price_horizons:
        p_rev = ttm_rev * ((1.0 + growth_rate) ** p_yrs)
        p_s = shares * ((1.0 + dilution_rate) ** p_yrs)
        p_target_ps = curr_ps * p_mult_fact
        base_p = round((p_rev * p_target_ps) / p_s, 2)
        bear_p = round(base_p * 0.80, 2)
        bull_p = round(base_p * 1.20, 2)
        ann_cagr = round((((base_p / curr_px) ** (1.0 / p_yrs)) - 1.0) * 100.0, 1) if p_yrs > 0 else 0.0

        price_target_ranges.append({
            "horizon_weeks": p_wks,
            "horizon_label": p_label,
            "bear_price": bear_p,
            "base_price": base_p,
            "bull_price": bull_p,
            "implied_ps_multiple": round(p_target_ps, 1),
            "annualized_cagr_pct": ann_cagr
        })

    # Derive Rating and Options Strategies
    base_3y_cagr = price_target_ranges[-1]["annualized_cagr_pct"]

    if base_3y_cagr >= 20.0:
        rating = "BUY"
        target_strategy = "High-Growth Secular Compounder with Cash-Secured Put Entry" if conv_score < 9.0 else "High-Conviction Secular Growth Leader with Limit Buy Accumulation"
        if conv_score >= 9.0:
            entry_strat = "LIMIT_BUY"
            exit_strat = "LIMIT_SELL"
            csp_cash = 0.0
            cc_cash = 0.0
        else:
            entry_strat = "SELL_CSP"
            exit_strat = "LIMIT_SELL"
            # 0.20-0.30 Delta CSP upfront premium (~3.5% discount)
            csp_cash = round(curr_px * 0.035, 2)
            cc_cash = 0.0
    elif base_3y_cagr >= 10.0:
        rating = "HOLD"
        target_strategy = "Quality Compounder with Disciplined Covered Call Yield Harvesting"
        entry_strat = "LIMIT_BUY"
        exit_strat = "SELL_COVERED_CALLS"
        csp_cash = 0.0
        # Covered call harvest yield ~3.0% annual yield over 3 years (~9% total)
        cc_cash = round(curr_px * 0.09, 2)
    elif base_3y_cagr >= 0.0:
        rating = "SELL"
        target_strategy = "Capital Reallocation & Controlled Limit Exit"
        entry_strat = "LIMIT_BUY"
        exit_strat = "LIMIT_SELL"
        csp_cash = 0.0
        cc_cash = 0.0
    else:
        rating = "AVOID"
        target_strategy = "Capital Preservation & Risk Avoidance"
        entry_strat = "LIMIT_BUY"
        exit_strat = "LIMIT_SELL"
        csp_cash = 0.0
        cc_cash = 0.0

    # Return Engine Execution
    ret_res = calculate_annualized_roi(
        benchmark_entry_price=curr_px,
        target_exit_price=target_exit_px,
        entry_strategy=entry_strat,
        exit_strategy=exit_strat,
        entry_date="2026-08-17",
        holding_period_years=h_years,
        csp_proceeds=csp_cash,
        cc_proceeds=cc_cash,
        symbol=symbol,
        company_name=company_name or symbol
    )

    return {
        "symbol": symbol,
        "company_name": company_name or symbol,
        "current_price": curr_px,
        "entry_price": curr_px,
        "target_exit_price": target_exit_px,
        "rating": rating,
        "conviction_score": conv_score,
        "holding_period": "3 to 5 Years",
        "holding_period_years": h_years,
        "target_strategy": target_strategy,
        "annual_rev_growth": growth_rate,
        "target_ps_multiple": target_ps_3y,
        "net_dilution_rate": dilution_rate,
        "current_ps_multiple": round(curr_ps, 1),
        "return_engine": ret_res.to_dict(),
        "target_roi_str": ret_res.target_roi_str,
        "annualized_roi_pct": ret_res.annualized_roi_pct,
        "revenue_forecast_13q": forecast_rows,
        "shares_projections_6h": shares_projections,
        "price_target_ranges_4h": price_target_ranges
    }
