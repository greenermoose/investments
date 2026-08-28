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
from datetime import datetime, timezone

# Ensure scripts directory is in path for module imports
scripts_dir = os.path.dirname(os.path.abspath(__file__))
if scripts_dir not in sys.path:
    sys.path.insert(0, scripts_dir)

from return_engine import calculate_annualized_roi
from valuation_model import model_equity_valuation
from compare_roi_distribution import run_comparison, print_comparison_report
from adr_registry import normalize_shares_outstanding, convert_to_usd, get_listing_metadata
import research_store

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

# System-level dataset files to exclude from individual company ticker parsing
system_dataset_files = {
    "universe.json", "market_prices.json", "historical_price_archive.json",
    "analyst_coverage_registry.json", "sec_filing_calendar.json",
    "sentiment_surveillance.json", "short_seller_campaigns.json"
}

# Iterate through all company files in http/data
all_files = [f for f in os.listdir(http_data_dir) if f.endswith(".json") and f not in system_dataset_files]

def build_capital_needs_view(research, val_model):
    """Assembles the capital view the web UI consumes.

    Every value here is either authored research or computed from Tier 1
    filings. Sub-fields with no source are None, which the UI renders as an
    explicit absence. This function originates nothing.
    """
    capital = research.get("capital_strategy") or {}
    dividend = research.get("dividend_profile") or {}
    if not capital and not dividend:
        return None

    dilution = (research.get("valuation_parameters") or {}).get("annual_share_dilution_rate")
    capacity = capital.get("buyback_authorized_capacity_usd_b")
    debt = val_model.get("total_debt_usd")
    cash = val_model.get("cash_and_equivalents_usd")

    return {
        "capital_allocation_philosophy": capital.get("capital_allocation_philosophy"),
        "dividends": {
            "status": dividend.get("status"),
            "annual_dividend_usd": val_model.get("annual_dividend_usd"),
            "dividend_yield_pct": dividend.get("dividend_yield_pct"),
            "payout_ratio_pct": dividend.get("payout_ratio_pct"),
            "dividend_growth_rate_pct": dividend.get("annual_dividend_growth_pct"),
            "description": dividend.get("description"),
        } if dividend else None,
        "share_buybacks": {
            "buyback_program_active": (
                None if dilution is None else dilution < 0.0),
            "authorized_capacity_usd_b": capacity,
            "net_annual_share_change_pct": (
                None if dilution is None else round(dilution * 100.0, 1)),
        } if (capital or dilution is not None) else None,
        "share_and_debt_issuance": {
            "total_debt_usd_b": None if debt is None else round(debt / 1e9, 2),
            "cash_and_equivalents_usd_b": None if cash is None else round(cash / 1e9, 2),
            "net_cash_or_debt_usd_b": (
                None if val_model.get("net_cash_usd") is None
                else round(val_model["net_cash_usd"] / 1e9, 2)),
        },
        "anticipated_capital_needs": {
            "primary_needs": capital.get("primary_capital_needs"),
            "funding_strategy": capital.get("funding_strategy"),
            "going_concern_assessment": capital.get("going_concern_assessment"),
        } if capital else None,
        "narrative": capital.get("narrative"),
    }


universe = []
updated_meta = {}
unmodeled_symbols = []

for filename in sorted(all_files):
    sym = filename.replace(".json", "")
    filepath = os.path.join(http_data_dir, filename)

    with open(filepath, "r", encoding="utf-8") as f:
        comp_data = json.load(f)

    filings = comp_data.get("filings", [])
    latest_filing = filings[0] if filings else None
    latest_bs = latest_filing.get("data", {}).get("balance_sheet", {}) if latest_filing else {}

    # Resolve metadata. The rating, conviction, and holding period are set below
    # from the valuation model, or left unset when it has no authored parameters
    # to work from. They are deliberately not seeded from the cache here: a stale
    # rating carried forward is indistinguishable from a current one.
    meta = company_meta.get(sym, {})
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
    raw_shares = sec_metrics.get("shares_outstanding")
    raw_ttm_rev = sec_metrics.get("ttm_revenue")

    if (not raw_shares or raw_shares == 0) and filings:
        raw_shares = filings[0].get("data", {}).get("shares_outstanding")

    norm_shares = normalize_shares_outstanding(sym, raw_shares)
    shares = norm_shares if norm_shares is not None else raw_shares

    ttm_rev = convert_to_usd(raw_ttm_rev, symbol=sym) if raw_ttm_rev is not None else None

    raw_total_debt = sec_metrics.get("total_debt")
    if raw_total_debt is None:
        raw_total_debt = latest_bs.get("total_debt", 0)
    total_debt = convert_to_usd(raw_total_debt, symbol=sym) if raw_total_debt is not None else 0

    raw_cash_equiv = sec_metrics.get("cash_and_cash_equivalents")
    if raw_cash_equiv is None:
        raw_cash_equiv = latest_bs.get("cash_and_cash_equivalents", 0)
    cash_equiv = convert_to_usd(raw_cash_equiv, symbol=sym) if raw_cash_equiv is not None else 0

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
    
    research = research_store.load_research(sym)

    val_model = model_equity_valuation(
        symbol=sym,
        current_price=current_price,
        shares_outstanding=shares or 0.0,
        ttm_revenue=ttm_rev or 0.0,
        sector=sector_val,
        industry=industry_val,
        company_name=comp_name,
        filings=filings,
        research=research
    )

    # A ticker with no authored valuation parameters stays in the public catalog
    # with its market data and whatever research exists, but carries no rating,
    # no price target, and no ROI. Those are outputs of research this ticker has
    # not received yet, and a placeholder would be indistinguishable from one.
    if val_model["status"] != "MODELED":
        unmodeled_symbols.append(sym)
        thesis_status = None
        triage_status = "AWAITING_RESEARCH"
        conviction_score = None
        entry_price = None
        target_exit_price = None
        target_roi_str = None
        ret_params = {}
        current_ps_multiple = None
        target_ps_multiple = None
        historical_quarterly_revenue = []
        revenue_forecast_13q = []
        quarterly_revenue_trajectory = []
        shares_projections_6h = []
        price_target_ranges_4h = []
    else:
        thesis_status = val_model["rating"]
        triage_status = "QUALIFIED_CANDIDATE" if thesis_status != "AVOID" else "AVOID"
        conviction_score = val_model["conviction_score"]
        entry_price = val_model["entry_price"]
        target_exit_price = val_model["target_exit_price"]
        target_roi_str = val_model["target_roi_str"]
        ret_params = val_model["return_engine"]
        current_ps_multiple = val_model["current_ps_multiple"]
        target_ps_multiple = val_model["target_ps_multiple"]
        historical_quarterly_revenue = val_model["historical_quarterly_revenue"]
        revenue_forecast_13q = val_model["revenue_forecast_13q"]
        quarterly_revenue_trajectory = val_model["quarterly_revenue_trajectory"]
        shares_projections_6h = val_model["shares_projections_6h"]
        price_target_ranges_4h = val_model["price_target_ranges_4h"]

    # Resolve authoritative listing and ADR metadata
    listing_meta = get_listing_metadata(sym)
    is_adr_flag = listing_meta.get("is_adr", False)
    listing_type_val = listing_meta.get("listing_type", "US_COMMON_STOCK")
    country_of_origin = listing_meta.get("country_of_origin", "United States")
    primary_exchange = listing_meta.get("primary_exchange", "US Exchange")
    adr_ratio = listing_meta.get("adr_ratio")
    adr_underlying_desc = listing_meta.get("adr_underlying_description")
    depositary_bank = listing_meta.get("depositary_bank")

    # Update meta entry for persistent grounding
    meta_copy = dict(meta)
    meta_copy["thesis_status"] = thesis_status
    meta_copy["conviction_score"] = conviction_score
    meta_copy["current_price"] = current_price
    meta_copy["entry_price"] = entry_price
    meta_copy["target_exit_price"] = target_exit_price
    meta_copy["target_roi"] = target_roi_str
    meta_copy["current_ps_multiple"] = current_ps_multiple
    meta_copy["target_ps_multiple"] = target_ps_multiple
    # Return Engine outputs exist only for modelled tickers. On an unmodelled one
    # ret_params is empty and every downstream key is cleared rather than defaulted,
    # so a stale figure from a previous run cannot survive into the cache.
    for key in ("entry_strategy", "exit_strategy", "entry_date", "target_exit_date",
                "csp_proceeds", "cc_proceeds", "dividend_proceeds",
                "initial_capital_outlay", "total_proceeds", "net_profit",
                "holding_period_days", "holding_period_years", "capital_gain_pct",
                "options_yield_pct", "total_roi_pct", "annualized_roi_pct"):
        meta_copy[key] = ret_params.get(key)
    meta_copy["triage_status"] = triage_status
    meta_copy["is_adr"] = is_adr_flag
    meta_copy["listing_type"] = listing_type_val
    meta_copy["country_of_origin"] = country_of_origin
    meta_copy["primary_exchange"] = primary_exchange
    meta_copy["adr_ratio"] = adr_ratio
    meta_copy["adr_underlying_description"] = adr_underlying_desc
    meta_copy["depositary_bank"] = depositary_bank
    meta_copy["last_updated"] = datetime.now(timezone.utc).isoformat()
    if "investor_relations_url" in meta:
        meta_copy["investor_relations_url"] = meta["investor_relations_url"]
    elif "investor_relations_url" in comp_data:
        meta_copy["investor_relations_url"] = comp_data["investor_relations_url"]
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
            # No external coverage. Restating this repository's own target here
            # would dress a modeled number as an independent opinion.
            "mean_target": None,
            "median_target": None,
            "high_target": None,
            "low_target": None,
            "coverage_count": 0,
            "average_upside_pct": None
        }

    ir_url = comp_data.get("investor_relations_url") or meta.get("investor_relations_url") or f"https://investor.{sym.lower()}.com/"

    universe.append({
        "symbol": sym,
        "name": comp_name,
        "sector": meta.get("sector"),
        "industry": meta.get("industry"),
        "is_adr": is_adr_flag,
        "listing_type": listing_type_val,
        "country_of_origin": country_of_origin,
        "primary_exchange": primary_exchange,
        "adr_ratio": adr_ratio,
        "adr_underlying_description": adr_underlying_desc,
        "depositary_bank": depositary_bank,
        "description": research_store.get_text(research, "description"),
        "thesis_status": thesis_status,
        "conviction_score": conviction_score,
        "entry_price": entry_price,
        "target_exit_price": target_exit_price,
        "current_price": current_price,
        "nominal_current_price": price_info.get("nominal_current_price", current_price),
        "closing_price": current_price,
        "previous_close": previous_close,
        "nominal_previous_close": price_info.get("nominal_previous_close", previous_close),
        "split_adj_previous_close": price_info.get("split_adj_previous_close", previous_close),
        "adj_close": price_info.get("adj_close", current_price),
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
        "cumulative_split_factor": price_info.get("cumulative_split_factor", 1.0),
        "recent_splits": price_info.get("recent_splits", []),
        "recent_dividends": price_info.get("recent_dividends", []),
        "holding_period": holding_period,
        "target_roi": target_roi_str,
        "entry_strategy": ret_params.get("entry_strategy"),
        "exit_strategy": ret_params.get("exit_strategy"),
        "entry_date": ret_params.get("entry_date"),
        "target_exit_date": ret_params.get("target_exit_date"),
        "csp_proceeds": ret_params.get("csp_proceeds"),
        "cc_proceeds": ret_params.get("cc_proceeds"),
        "dividend_proceeds": ret_params.get("dividend_proceeds", 0.0),
        "initial_capital_outlay": ret_params.get("initial_capital_outlay"),
        "total_proceeds": ret_params.get("total_proceeds"),
        "net_profit": ret_params.get("net_profit"),
        "holding_period_days": ret_params.get("holding_period_days"),
        "holding_period_years": ret_params.get("holding_period_years"),
        "capital_gain_pct": ret_params.get("capital_gain_pct"),
        "options_yield_pct": ret_params.get("options_yield_pct"),
        "total_roi_pct": ret_params.get("total_roi_pct"),
        "annualized_roi_pct": ret_params.get("annualized_roi_pct"),
        "moat": research_store.get_text(research, "moat_summary"),
        "invalidation_criteria": (research.get("invalidation_criteria") or {}).get("items"),
        "latest_catalyst": research_store.get_text(research, "latest_catalyst"),
        "business_profile": research_store.get_text(research, "business_profile"),
        "competitive_moat_analysis": research_store.get_text(research, "competitive_moat_analysis"),
        "tam_and_market_share": research.get("tam_and_market_share"),
        "market_share": val_model.get("market_share"),
        "capital_strategy": research.get("capital_strategy"),
        "capital_needs_and_strategy": build_capital_needs_view(research, val_model),
        "stock_based_compensation": research.get("stock_based_compensation"),
        "off_balance_sheet_and_contingent_liabilities": research.get(
            "off_balance_sheet_and_contingent_liabilities"),
        "catalyst_timeline": (research.get("catalyst_timeline") or {}).get("items"),
        "triage_status": triage_status,
        "indices": indices,
        "is_index_member": is_index_member,
        "shares_outstanding": shares,
        "shares_outstanding_b": shares_b,
        "current_ps_multiple": current_ps_multiple,
        "target_ps_multiple": target_ps_multiple,
        "ttm_revenue": ttm_rev,
        "total_debt": total_debt,
        "cash_and_cash_equivalents": cash_equiv,
        "market_cap": market_cap,
        "market_cap_b": market_cap_b,
        "enterprise_value": enterprise_value,
        "enterprise_value_b": ev_b,
        "sec_edgar_url": comp_data.get("sec_edgar_url", f"https://www.sec.gov/edgar/browse/?CIK={sym}"),
        "investor_relations_url": ir_url,
        "filings_count": len(filings),
        "latest_filing_date": latest_filing.get("filing_date") if latest_filing else None,
        "latest_filing_type": latest_filing.get("type") if latest_filing else None,
        "latest_filing_url": latest_filing.get("filing_url") if latest_filing else None,
        "filings": filings,
        "historical_candles_30d": historical_candles,
        "historical_quarterly_revenue": historical_quarterly_revenue,
        "revenue_forecast_13q": revenue_forecast_13q,
        "quarterly_revenue_trajectory": quarterly_revenue_trajectory,
        "shares_projections_6h": shares_projections_6h,
        "price_target_ranges_4h": price_target_ranges_4h,
        "analyst_price_targets": sym_targets,
        "analyst_consensus": analyst_consensus,
        "last_updated": datetime.now(timezone.utc).isoformat()
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
if unmodeled_symbols:
    print("")
    print(f"{len(unmodeled_symbols)} equities carry no rating or price target because their")
    print("valuation parameters have not been authored. They remain in the catalog with market")
    print("data and whatever research exists. Run scripts/research_gaps.py for the queue.")
    print("")

print(f"Index memberships breakdown:")
print(f"  QQQ: {len([u for u in universe if 'QQQ' in u['indices']])}")
print(f"  DJIA: {len([u for u in universe if 'DJIA' in u['indices']])}")
print(f"  SP500: {len([u for u in universe if 'SP500' in u['indices']])}")
print(f"  Total in at least one index: {len([u for u in universe if u['is_index_member']])}")

# Run Deterministic Empirical Quality Control Gate
print("\nRunning Empirical Return Distribution Quality Control Gate...")
qc_res = run_comparison(root_dir)
print_comparison_report(qc_res)

if not qc_res["all_passed"]:
    print("CRITICAL ERROR: Generated universe failed empirical distribution quality control bounds.")
    sys.exit(1)
else:
    print("SUCCESS: Master universe confirmed in full alignment with empirical distribution benchmarks.")
