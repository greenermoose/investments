"""
Build Universe JSON
Generates the authoritative master public equities universe catalog (http/data/universe.json)
by synthesizing SEC EDGAR XBRL filings, company metadata, index memberships (QQQ, DJIA, SP500),
and fundamental valuation metrics.
"""

import json
import os
import re

# Load base metadata file
meta_file = os.path.join(os.path.dirname(__file__), "data", "company_meta.json")
company_meta = {}
if os.path.exists(meta_file):
    with open(meta_file, "r", encoding="utf-8") as f:
        company_meta = json.load(f)

# Load ETF holdings for index membership & name/weight references
etf_holdings_map = {}
qqq_set = set()
dia_set = set()
spy_set = set()

qqq_file = os.path.join(os.path.dirname(__file__), "data", "qqq_holdings.json")
if os.path.exists(qqq_file):
    with open(qqq_file, "r", encoding="utf-8") as f:
        qqq_data = json.load(f)
        for h in qqq_data.get("holdings", []):
            t = h.get("ticker")
            if t:
                qqq_set.add(t)
                etf_holdings_map[t] = h

dia_file = os.path.join(os.path.dirname(__file__), "data", "dia_holdings.json")
if os.path.exists(dia_file):
    with open(dia_file, "r", encoding="utf-8") as f:
        dia_data = json.load(f)
        for h in dia_data.get("holdings", []):
            t = h.get("ticker")
            if t:
                dia_set.add(t)
                if t not in etf_holdings_map:
                    etf_holdings_map[t] = h

spy_file = os.path.join(os.path.dirname(__file__), "data", "spy_holdings.json")
if os.path.exists(spy_file):
    with open(spy_file, "r", encoding="utf-8") as f:
        spy_data = json.load(f)
        for h in spy_data.get("holdings", []):
            t = h.get("ticker")
            if t:
                spy_set.add(t)
                if t not in etf_holdings_map:
                    etf_holdings_map[t] = h

# Load market closing prices
prices_file = os.path.join(os.path.dirname(__file__), "data", "market_prices.json")
market_prices = {}
if os.path.exists(prices_file):
    with open(prices_file, "r", encoding="utf-8") as f:
        market_prices = json.load(f)

# 1. Load SEC summary metrics
sec_data_path = os.path.join("http", "sec-data.json")
sec_summary = {}
if os.path.exists(sec_data_path):
    with open(sec_data_path, "r", encoding="utf-8") as f:
        sec_summary = json.load(f)

# 2. Iterate through all company files in http/data
data_dir = os.path.join("http", "data")
all_files = [f for f in os.listdir(data_dir) if f.endswith(".json") and f != "universe.json"]

universe = []

for filename in sorted(all_files):
    sym = filename.replace(".json", "")
    filepath = os.path.join(data_dir, filename)
    
    with open(filepath, "r", encoding="utf-8") as f:
        comp_data = json.load(f)
        
    filings = comp_data.get("filings", [])
    latest_filing = filings[0] if filings else None
    latest_bs = latest_filing.get("data", {}).get("balance_sheet", {}) if latest_filing else {}
    
    # Resolve metadata
    meta = company_meta.get(sym, {})
    
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
    
    # Fallback to latest filing shares if missing in summary
    if (not shares or shares == 0) and filings:
        shares = filings[0].get("data", {}).get("shares_outstanding")
        
    # Debt & Cash from SEC
    total_debt = sec_metrics.get("total_debt")
    if total_debt is None:
        total_debt = latest_bs.get("total_debt", 0)
        
    cash_equiv = sec_metrics.get("cash_and_cash_equivalents")
    if cash_equiv is None:
        cash_equiv = latest_bs.get("cash_and_cash_equivalents", 0)
        
    # Market price
    price_info = market_prices.get(sym, {})
    closing_price = price_info.get("closing_price")
    if not closing_price or closing_price == 0:
        closing_price = meta.get("current_price", 100.0)
        
    entry_price = meta.get("entry_price", 100.0)
    target_exit_price = meta.get("target_exit_price", 150.0)
    
    # Target ROI
    target_roi_str = meta.get("target_roi")
    if not target_roi_str and entry_price and target_exit_price:
        roi_pct = ((target_exit_price - entry_price) / entry_price) * 100.0
        target_roi_str = f"{roi_pct:.1f}%"
    elif not target_roi_str:
        target_roi_str = "20.0%"
        
    # Market Cap & Enterprise Value
    market_cap = (shares * closing_price) if (shares and closing_price) else None
    
    if market_cap:
        enterprise_value = market_cap + (total_debt or 0) - (cash_equiv or 0)
    else:
        enterprise_value = None
        
    shares_b = (shares / 1e9) if shares else None
    ev_b = (enterprise_value / 1e9) if enterprise_value is not None else None
    market_cap_b = (market_cap / 1e9) if market_cap is not None else None
    
    universe.append({
        "symbol": sym,
        "name": meta.get("name", f"{sym} Corporation"),
        "sector": meta.get("sector", "Information Technology"),
        "industry": meta.get("industry", "US Equity"),
        "description": meta.get("description", f"Public company {sym}."),
        "thesis_status": meta.get("thesis_status", "HOLD"),
        "conviction_score": meta.get("conviction_score", 8.0),
        "entry_price": entry_price,
        "target_exit_price": target_exit_price,
        "current_price": closing_price,
        "closing_price": closing_price,
        "holding_period": meta.get("holding_period", "3 to 5 Years"),
        "target_roi": target_roi_str,
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
        "filings": filings
    })

# Save output universe.json
out_universe_path = os.path.join("http", "data", "universe.json")
with open(out_universe_path, "w", encoding="utf-8") as f:
    json.dump(universe, f, indent=2)

print(f"Generated {out_universe_path} with {len(universe)} public companies.")
print(f"Index memberships breakdown:")
print(f"  QQQ: {len([u for u in universe if 'QQQ' in u['indices']])}")
print(f"  DJIA: {len([u for u in universe if 'DJIA' in u['indices']])}")
print(f"  SP500: {len([u for u in universe if 'SP500' in u['indices']])}")
print(f"  Total in at least one index: {len([u for u in universe if u['is_index_member']])}")

