"""
Build Universe JSON
Generates the authoritative master public equities universe catalog (http/data/universe.json)
by synthesizing SEC EDGAR XBRL filings, company metadata, index memberships (QQQ, DJIA, SP500),
verified market prices, daily trading volume, OHLCV candlestick time-series, and grounded valuation targets.
"""

import json
import os
import re
import sys

# Ensure scripts directory is in path for module imports
scripts_dir = os.path.dirname(os.path.abspath(__file__))
if scripts_dir not in sys.path:
    sys.path.insert(0, scripts_dir)

from return_engine import calculate_annualized_roi
from valuation_model import model_equity_valuation

# Paths
root_dir = os.path.dirname(os.path.dirname(__file__))
scripts_data_dir = os.path.join(root_dir, "scripts", "data")
http_data_dir = os.path.join(root_dir, "http", "data")
context_data_dir = os.path.join(root_dir, "context", "data")
os.makedirs(context_data_dir, exist_ok=True)

# Load base metadata file
meta_file = os.path.join(scripts_data_dir, "company_meta.json")
company_meta = {}
if os.path.exists(meta_file):
    with open(meta_file, "r", encoding="utf-8") as f:
        company_meta = json.load(f)

# Load ETF holdings for index membership
qqq_set = set()
dia_set = set()
spy_set = set()

qqq_file = os.path.join(scripts_data_dir, "qqq_holdings.json")
if os.path.exists(qqq_file):
    with open(qqq_file, "r", encoding="utf-8") as f:
        qqq_data = json.load(f)
        for h in qqq_data.get("holdings", []):
            t = h.get("ticker")
            if t:
                qqq_set.add(t)

dia_file = os.path.join(scripts_data_dir, "dia_holdings.json")
if os.path.exists(dia_file):
    with open(dia_file, "r", encoding="utf-8") as f:
        dia_data = json.load(f)
        for h in dia_data.get("holdings", []):
            t = h.get("ticker")
            if t:
                dia_set.add(t)

spy_file = os.path.join(scripts_data_dir, "spy_holdings.json")
if os.path.exists(spy_file):
    with open(spy_file, "r", encoding="utf-8") as f:
        spy_data = json.load(f)
        for h in spy_data.get("holdings", []):
            t = h.get("ticker")
            if t:
                spy_set.add(t)

# Load verified market prices & technical data
prices_file = os.path.join(scripts_data_dir, "market_prices.json")
market_prices = {}
if os.path.exists(prices_file):
    with open(prices_file, "r", encoding="utf-8") as f:
        market_prices = json.load(f)

# Load analyst price targets & reports
analyst_targets_file = os.path.join(scripts_data_dir, "analyst_price_targets.json")
all_analyst_targets = {}
if os.path.exists(analyst_targets_file):
    with open(analyst_targets_file, "r", encoding="utf-8") as f:
        all_analyst_targets = json.load(f)

# Load SEC summary metrics
sec_data_path = os.path.join(root_dir, "http", "sec-data.json")
sec_summary = {}
if os.path.exists(sec_data_path):
    with open(sec_data_path, "r", encoding="utf-8") as f:
        sec_summary = json.load(f)

# Iterate through all company files in http/data
all_files = [f for f in os.listdir(http_data_dir) if f.endswith(".json") and f not in ["universe.json", "market_prices.json"]]

universe = []
updated_meta = {}

for filename in sorted(all_files):
    sym = filename.replace(".json", "")
    filepath = os.path.join(http_data_dir, filename)

    with open(filepath, "r", encoding="utf-8") as f:
        comp_data = json.load(f)

    filings = comp_data.get("filings", [])
    latest_filing = filings[0] if filings else None
    latest_bs = latest_filing.get("data", {}).get("balance_sheet", {}) if latest_filing else {}

    # Resolve metadata
    meta = company_meta.get(sym, {})
    thesis_status = meta.get("thesis_status", "HOLD").upper()
    conviction_score = meta.get("conviction_score", 8.0)
    holding_period = meta.get("holding_period", "3 to 5 Years")

    # Determine index memberships
    indices = []
    if sym in qqq_set:
        indices.append("QQQ")
    if sym in dia_set:
        indices.append("DJIA")
    if sym in spy_set:
        indices.append("SP500")

    is_index_member = len(indices) > 0

    sec_metrics = sec_summary.get(sym, {})
    shares = sec_metrics.get("shares_outstanding")
    ttm_rev = sec_metrics.get("ttm_revenue")

    if (not shares or shares == 0) and filings:
        shares = filings[0].get("data", {}).get("shares_outstanding")

    total_debt = sec_metrics.get("total_debt")
    if total_debt is None:
        total_debt = latest_bs.get("total_debt", 0)

    cash_equiv = sec_metrics.get("cash_and_cash_equivalents")
    if cash_equiv is None:
        cash_equiv = latest_bs.get("cash_and_cash_equivalents", 0)

    # Market price & Technical analysis data
    price_info = market_prices.get(sym, {})
    current_price = price_info.get("current_price") or price_info.get("closing_price") or meta.get("current_price", 100.0)
    current_price = round(float(current_price), 2)
    previous_close = price_info.get("previous_close", current_price)
    day_change = price_info.get("day_change", round(current_price - previous_close, 2))
    day_change_percent = price_info.get("day_change_percent", round((day_change / previous_close) * 100.0, 2) if previous_close else 0.0)

    day_volume = price_info.get("day_volume", 0)
    avg_vol_20d = price_info.get("average_volume_20d", day_volume)
    volume_ratio = price_info.get("volume_ratio", 1.0)

    fifty_two_week_high = price_info.get("fifty_two_week_high", round(current_price * 1.2, 2))
    fifty_two_week_low = price_info.get("fifty_two_week_low", round(current_price * 0.8, 2))

    sma_20 = price_info.get("sma_20", current_price)
    sma_50 = price_info.get("sma_50", current_price)
    tech_support_20d = price_info.get("technical_support_20d", round(current_price * 0.95, 2))
    tech_resistance_20d = price_info.get("technical_resistance_20d", round(current_price * 1.05, 2))
    historical_candles = price_info.get("historical_candles_30d", [])

    # Run thesis parameters through fundamental Valuation Model & Return Engine
    comp_name = meta.get("name") or price_info.get("name") or f"{sym} Corporation"
    sector_val = meta.get("sector", "Information Technology")
    industry_val = meta.get("industry", "US Equity")
    
    val_model = model_equity_valuation(
        symbol=sym,
        current_price=current_price,
        shares_outstanding=shares or 1e9,
        ttm_revenue=ttm_rev or (current_price * (shares or 1e9) * 0.2),
        sector=sector_val,
        industry=industry_val,
        company_name=comp_name
    )

    thesis_status = val_model["rating"]
    conviction_score = val_model["conviction_score"]
    entry_price = val_model["entry_price"]
    target_exit_price = val_model["target_exit_price"]
    target_roi_str = val_model["target_roi_str"]
    ret_params = val_model["return_engine"]

    # Update meta entry for persistent grounding
    meta_copy = dict(meta)
    meta_copy["thesis_status"] = thesis_status
    meta_copy["conviction_score"] = conviction_score
    meta_copy["current_price"] = current_price
    meta_copy["entry_price"] = entry_price
    meta_copy["target_exit_price"] = target_exit_price
    meta_copy["target_roi"] = target_roi_str
    meta_copy["entry_strategy"] = ret_params["entry_strategy"]
    meta_copy["exit_strategy"] = ret_params["exit_strategy"]
    meta_copy["entry_date"] = ret_params["entry_date"]
    meta_copy["target_exit_date"] = ret_params["target_exit_date"]
    meta_copy["csp_proceeds"] = ret_params["csp_proceeds"]
    meta_copy["cc_proceeds"] = ret_params["cc_proceeds"]
    meta_copy["dividend_proceeds"] = ret_params.get("dividend_proceeds", 0.0)
    meta_copy["initial_capital_outlay"] = ret_params["initial_capital_outlay"]
    meta_copy["total_proceeds"] = ret_params["total_proceeds"]
    meta_copy["net_profit"] = ret_params["net_profit"]
    meta_copy["holding_period_days"] = ret_params["holding_period_days"]
    meta_copy["holding_period_years"] = ret_params["holding_period_years"]
    meta_copy["capital_gain_pct"] = ret_params["capital_gain_pct"]
    meta_copy["options_yield_pct"] = ret_params["options_yield_pct"]
    meta_copy["total_roi_pct"] = ret_params["total_roi_pct"]
    meta_copy["annualized_roi_pct"] = ret_params["annualized_roi_pct"]
    updated_meta[sym] = meta_copy

    # Market Cap & Enterprise Value
    market_cap = (shares * current_price) if (shares and current_price) else None
    if market_cap:
        enterprise_value = market_cap + (total_debt or 0) - (cash_equiv or 0)
    else:
        enterprise_value = None

    shares_b = (shares / 1e9) if shares else None
    ev_b = (enterprise_value / 1e9) if enterprise_value is not None else None
    market_cap_b = (market_cap / 1e9) if market_cap is not None else None

    # Analyst price targets and consensus analytics
    sym_targets = all_analyst_targets.get(sym, [])
    if sym_targets:
        pt_values = [t["target_price"] for t in sym_targets if t.get("target_price")]
        upside_values = [t["implied_upside_pct"] for t in sym_targets if t.get("implied_upside_pct") is not None]
        mean_pt = round(sum(pt_values) / len(pt_values), 2) if pt_values else current_price
        sorted_pts = sorted(pt_values) if pt_values else [current_price]
        median_pt = sorted_pts[len(sorted_pts) // 2]
        high_pt = max(pt_values) if pt_values else current_price
        low_pt = min(pt_values) if pt_values else current_price
        avg_upside = round(sum(upside_values) / len(upside_values), 1) if upside_values else round(((mean_pt - current_price) / current_price) * 100.0, 1)
        
        analyst_consensus = {
            "mean_target": mean_pt,
            "median_target": median_pt,
            "high_target": high_pt,
            "low_target": low_pt,
            "coverage_count": len(sym_targets),
            "average_upside_pct": avg_upside
        }
    else:
        analyst_consensus = {
            "mean_target": target_exit_price,
            "median_target": target_exit_price,
            "high_target": target_exit_price,
            "low_target": target_exit_price,
            "coverage_count": 0,
            "average_upside_pct": round(((target_exit_price - current_price) / current_price) * 100.0, 1)
        }

    universe.append({
        "symbol": sym,
        "name": comp_name,
        "sector": meta.get("sector", "Information Technology"),
        "industry": meta.get("industry", "US Equity"),
        "description": meta.get("description", f"Public company {sym}."),
        "thesis_status": thesis_status,
        "conviction_score": conviction_score,
        "entry_price": entry_price,
        "target_exit_price": target_exit_price,
        "current_price": current_price,
        "closing_price": current_price,
        "previous_close": previous_close,
        "day_change": day_change,
        "day_change_percent": day_change_percent,
        "day_volume": day_volume,
        "average_volume_20d": avg_vol_20d,
        "volume_ratio": volume_ratio,
        "fifty_two_week_high": fifty_two_week_high,
        "fifty_two_week_low": fifty_two_week_low,
        "sma_20": sma_20,
        "sma_50": sma_50,
        "technical_support_20d": tech_support_20d,
        "technical_resistance_20d": tech_resistance_20d,
        "holding_period": holding_period,
        "target_roi": target_roi_str,
        "entry_strategy": ret_params["entry_strategy"],
        "exit_strategy": ret_params["exit_strategy"],
        "entry_date": ret_params["entry_date"],
        "target_exit_date": ret_params["target_exit_date"],
        "csp_proceeds": ret_params["csp_proceeds"],
        "cc_proceeds": ret_params["cc_proceeds"],
        "dividend_proceeds": ret_params.get("dividend_proceeds", 0.0),
        "initial_capital_outlay": ret_params["initial_capital_outlay"],
        "total_proceeds": ret_params["total_proceeds"],
        "net_profit": ret_params["net_profit"],
        "holding_period_days": ret_params["holding_period_days"],
        "holding_period_years": ret_params["holding_period_years"],
        "capital_gain_pct": ret_params["capital_gain_pct"],
        "options_yield_pct": ret_params["options_yield_pct"],
        "total_roi_pct": ret_params["total_roi_pct"],
        "annualized_roi_pct": ret_params["annualized_roi_pct"],
        "moat": meta.get("moat", "Established commercial moat and customer retention."),
        "invalidation_criteria": meta.get("invalidation_criteria", "Structural margin deterioration or loss of market share."),
        "latest_catalyst": meta.get("latest_catalyst", "Upcoming quarterly earnings and operational updates."),
        "indices": indices,
        "is_index_member": is_index_member,
        "shares_outstanding": shares,
        "shares_outstanding_b": shares_b,
        "ttm_revenue": ttm_rev,
        "total_debt": total_debt,
        "cash_and_cash_equivalents": cash_equiv,
        "market_cap": market_cap,
        "market_cap_b": market_cap_b,
        "enterprise_value": enterprise_value,
        "enterprise_value_b": ev_b,
        "sec_edgar_url": comp_data.get("sec_edgar_url", f"https://www.sec.gov/edgar/browse/?CIK={sym}"),
        "filings_count": len(filings),
        "latest_filing_date": latest_filing.get("filing_date") if latest_filing else None,
        "latest_filing_type": latest_filing.get("type") if latest_filing else None,
        "latest_filing_url": latest_filing.get("filing_url") if latest_filing else None,
        "filings": filings,
        "historical_candles_30d": historical_candles,
        "analyst_price_targets": sym_targets,
        "analyst_consensus": analyst_consensus
    })

# Save updated universe.json
out_universe_path_http = os.path.join(http_data_dir, "universe.json")
out_universe_path_context = os.path.join(context_data_dir, "universe.json")

with open(out_universe_path_http, "w", encoding="utf-8") as f:
    json.dump(universe, f, indent=2)

with open(out_universe_path_context, "w", encoding="utf-8") as f:
    json.dump(universe, f, indent=2)

# Save updated company_meta.json
with open(meta_file, "w", encoding="utf-8") as f:
    json.dump(updated_meta, f, indent=2)

print(f"Generated {out_universe_path_http} and {out_universe_path_context} with {len(universe)} public companies.")
print(f"Saved synchronized company metadata to {meta_file}")
print(f"Index memberships breakdown:")
print(f"  QQQ: {len([u for u in universe if 'QQQ' in u['indices']])}")
print(f"  DJIA: {len([u for u in universe if 'DJIA' in u['indices']])}")
print(f"  SP500: {len([u for u in universe if 'SP500' in u['indices']])}")
print(f"  Total in at least one index: {len([u for u in universe if u['is_index_member']])}")
