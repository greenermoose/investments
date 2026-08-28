"""
Fetch SEC EDGAR XBRL Filings & Financial Metrics
Extracts authoritative 10-K/10-Q/20-F XBRL data for all public companies in the equity universe.
"""

import argparse
from datetime import datetime, timezone
import json
import os
import re
import sys
import time
import urllib.request

scripts_dir = os.path.dirname(os.path.abspath(__file__))
if scripts_dir not in sys.path:
    sys.path.insert(0, scripts_dir)

from adr_registry import (
    normalize_shares_outstanding,
    convert_to_usd,
    get_adr_ratio,
    TICKER_PRIMARY_CURRENCIES,
    normalize_financial_filing_data
)

HEADERS = {
    "User-Agent": "InvestmentApp System (AdminContact@example.com)"
}

CORE_EXISTING_SYMBOLS = [
    "AAPL", "ABNB", "ADBE", "AMD", "AVGO", "BAM", "BEAM", "BETA", "BRK-B", "CRM", 
    "CRSP", "CSIQ", "DIS", "EDIT", "ENPH", "ENVX", "EOSE", "GNRC", "GOOGL", "GOOG",
    "GWH", "JNJ", "JPM", "KO", "MA", "META", "MSFT", "NFLX", "NRGV", "NTLA", 
    "NVDA", "SBUX", "SEDG", "SLDP", "STOK", "TDOC", "TMUS", "TSLA", "UNH", "WMT", 
    "XYZ", "ZM"
]

def load_universe_symbols():
    symbols = set(CORE_EXISTING_SYMBOLS)
    
    # Check QQQ holdings
    qqq_path = os.path.join(os.path.dirname(__file__), "data", "qqq_holdings.json")
    if os.path.exists(qqq_path):
        try:
            with open(qqq_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for h in data.get("holdings", []):
                    t = h.get("ticker")
                    if t and t != "UNKNOWN" and len(t) <= 5:
                        symbols.add(t)
        except Exception as e:
            print(f"Warning: Could not read QQQ holdings from {qqq_path}: {e}")
            
    # Check DIA holdings
    dia_path = os.path.join(os.path.dirname(__file__), "data", "dia_holdings.json")
    if os.path.exists(dia_path):
        try:
            with open(dia_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for h in data.get("holdings", []):
                    t = h.get("ticker")
                    if t and t != "UNKNOWN" and len(t) <= 5:
                        symbols.add(t)
        except Exception as e:
            print(f"Warning: Could not read DIA holdings from {dia_path}: {e}")
            
    # Check existing http/data files
    system_dataset_files = {
        "universe.json", "market_prices.json", "historical_price_archive.json",
        "analyst_coverage_registry.json", "sec_filing_calendar.json",
        "sentiment_surveillance.json", "short_seller_campaigns.json"
    }
    http_data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "http", "data")
    if os.path.exists(http_data_dir):
        for fname in os.listdir(http_data_dir):
            if fname.endswith(".json") and fname not in system_dataset_files:
                sym = fname.replace(".json", "")
                symbols.add(sym)
                
    return sorted(list(symbols))

def extract_metric(facts, taxonomies, possible_tags, preferred_unit="USD"):
    best_entries = []
    for tax in taxonomies:
        if tax in facts:
            for tag in possible_tags:
                if tag in facts[tax]:
                    units = facts[tax][tag].get("units", {})
                    if not units:
                        continue
                    if preferred_unit and preferred_unit in units:
                        unit_key = preferred_unit
                    else:
                        unit_key = list(units.keys())[0]
                    entries = units[unit_key]
                    
                    annotated_entries = []
                    for item in entries:
                        item_copy = dict(item)
                        item_copy["_unit"] = unit_key
                        annotated_entries.append(item_copy)
                    
                    # Sort by end date descending
                    entries_sorted = sorted(annotated_entries, key=lambda x: x.get("end", ""), reverse=True)
                    if not best_entries or (entries_sorted and entries_sorted[0].get("end", "") > best_entries[0].get("end", "")):
                        best_entries = entries_sorted
    return best_entries

def fetch_company_sec_data(sym, cik, out_dir, ticker_to_cik):
    url = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"
    req = urllib.request.Request(url, headers=HEADERS)
    
    time.sleep(0.12)  # Enforce SEC rate limit (< 10 req/sec)
    
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode("utf-8"))
        facts = data.get("facts", {})
        
        # Taxonomy lists: support both US GAAP and IFRS
        taxonomies = ["us-gaap", "ifrs-full", "dei"]
        
        # Shares
        shares = extract_metric(facts, ["dei", "us-gaap", "ifrs-full"], [
            "EntityCommonStockSharesOutstanding",
            "CommonStockSharesOutstanding",
            "WeightedAverageNumberOfSharesOutstandingBasic",
            "WeightedAverageNumberOfDilutedSharesOutstanding",
            "NumberOfSharesOutstanding",
            "WeightedAverageNumberOfShares"
        ])
        
        # Revenue
        revenue = extract_metric(facts, ["us-gaap", "ifrs-full"], [
            "Revenues",
            "Revenue",
            "RevenuesNetOfInterestExpense",
            "InterestAndNoninterestRevenue",
            "RegulatedAndUnregulatedOperatingRevenue",
            "SalesRevenueNet",
            "RevenueFromContractWithCustomerExcludingAssessedTax",
            "RevenueFromContractWithCustomerIncludingAssessedTax",
            "RevenuesNetOfYearc",
            "GrossRevenue"
        ])
        
        # Assets
        assets = extract_metric(facts, ["us-gaap", "ifrs-full"], ["Assets", "TotalAssets"])
        
        # Liabilities
        liabilities = extract_metric(facts, ["us-gaap", "ifrs-full"], ["Liabilities", "TotalLiabilities", "LiabilitiesAndStockholdersEquity"])
        
        # Equity
        equity = extract_metric(facts, ["us-gaap", "ifrs-full"], [
            "StockholdersEquity",
            "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
            "Equity",
            "TotalEquity"
        ])
        
        # Debt metrics
        short_debt = extract_metric(facts, ["us-gaap", "ifrs-full"], [
            "DebtCurrent",
            "LongTermDebtCurrent",
            "CommercialPaper",
            "ShortTermBorrowings",
            "OtherShortTermBorrowings",
            "CurrentBorrowings",
            "FinanceLeaseLiabilityCurrent"
        ])
        
        long_debt = extract_metric(facts, ["us-gaap", "ifrs-full"], [
            "LongTermDebtNoncurrent",
            "LongTermDebt",
            "NoncurrentBorrowings",
            "Borrowings",
            "FinanceLeaseLiabilityNoncurrent"
        ])
        
        total_debt_explicit = extract_metric(facts, ["us-gaap", "ifrs-full"], [
            "DebtAndCapitalLeaseObligations",
            "LongTermDebtAndCapitalLeaseObligations",
            "DebtInstrumentCarryingAmount"
        ])
        
        # Cash & Marketable Securities metrics
        cash_primary = extract_metric(facts, ["us-gaap", "ifrs-full"], [
            "CashAndCashEquivalentsAtCarryingValue",
            "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
            "Cash",
            "CashAndCashEquivalents",
            "CashAndCashEquivalentsAtFairValue"
        ])
        
        marketable_sec = extract_metric(facts, ["us-gaap", "ifrs-full"], [
            "MarketableSecuritiesCurrent",
            "AvailableForSaleSecuritiesDebtSecuritiesCurrent",
            "ShortTermInvestments"
        ])
        
        cash_and_inv = extract_metric(facts, ["us-gaap", "ifrs-full"], [
            "CashCashEquivalentsAndShortTermInvestments"
        ])
        
        # Find candidate filing dates
        valid_dates = []
        valid_forms = ["10-Q", "10-K", "20-F", "40-F", "6-K"]
        
        date_sources = assets if assets else revenue
        for entry in date_sources:
            form = entry.get("form")
            end_date = entry.get("end")
            if form in valid_forms and end_date and end_date not in [d["end"] for d in valid_dates]:
                valid_dates.append({
                    "end": end_date,
                    "form": form,
                    "fy": entry.get("fy"),
                    "fp": entry.get("fp"),
                    "filed": entry.get("filed", end_date),
                    "accn": entry.get("accn")
                })
            if len(valid_dates) >= 4:
                break
                
        # If no dates from assets/revenue, try shares
        if not valid_dates and shares:
            for s in shares:
                form = s.get("form")
                end_date = s.get("end")
                if form in valid_forms and end_date and end_date not in [d["end"] for d in valid_dates]:
                    valid_dates.append({
                        "end": end_date,
                        "form": form,
                        "fy": s.get("fy"),
                        "fp": s.get("fp"),
                        "filed": s.get("filed", end_date),
                        "accn": s.get("accn")
                    })
                if len(valid_dates) >= 4:
                    break
                    
        filings = []
        for d in valid_dates:
            end_date = d["end"]
            filed_date = d.get("filed", end_date)
            
            def val_to_usd(node, default=0.0):
                if not node:
                    return default
                v = node.get("val", default)
                u = node.get("_unit")
                conv = convert_to_usd(v, currency=u, symbol=sym)
                return conv if conv is not None else default

            s_node = next((x for x in shares if x.get("end", "") <= end_date), None) if shares else None
            s_raw = s_node.get("val", 0) if s_node else (shares[0].get("val", 0) if shares else 0)
            s_val = normalize_shares_outstanding(sym, s_raw) or s_raw
                
            r_entry = next((x for x in revenue if x.get("end") == end_date), None) if revenue else None
            r_val = val_to_usd(r_entry)
            period_start = r_entry.get("start", end_date) if r_entry else end_date
            
            a_node = next((x for x in assets if x.get("end") == end_date), None) if assets else None
            a_val = val_to_usd(a_node)
            
            l_node = next((x for x in liabilities if x.get("end") == end_date), None) if liabilities else None
            l_val = val_to_usd(l_node)
            
            e_node = next((x for x in equity if x.get("end") == end_date), None) if equity else None
            e_val = val_to_usd(e_node)
            
            # Debt calculation
            st_d_node = next((x for x in short_debt if x.get("end") == end_date), None) if short_debt else None
            st_d = val_to_usd(st_d_node)
            
            lt_d_node = next((x for x in long_debt if x.get("end") == end_date), None) if long_debt else None
            lt_d = val_to_usd(lt_d_node)
            
            tot_d_exp_node = next((x for x in total_debt_explicit if x.get("end") == end_date), None) if total_debt_explicit else None
            tot_d_exp = val_to_usd(tot_d_exp_node)
            
            calculated_debt = tot_d_exp if tot_d_exp > 0 else (st_d + lt_d)
            if calculated_debt == 0 and lt_d > 0:
                calculated_debt = lt_d
                
            # Cash & Equivalents calculation
            c_node = next((x for x in cash_primary if x.get("end") == end_date), None) if cash_primary else None
            c_val = val_to_usd(c_node)
            
            m_node = next((x for x in marketable_sec if x.get("end") == end_date), None) if marketable_sec else None
            m_val = val_to_usd(m_node)
            
            ci_node = next((x for x in cash_and_inv if x.get("end") == end_date), None) if cash_and_inv else None
            ci_val = val_to_usd(ci_node)
            
            calculated_cash = ci_val if ci_val > 0 else (c_val + m_val)
            if calculated_cash == 0 and c_val > 0:
                calculated_cash = c_val
            
            filings.append({
                "type": d["form"],
                "filing_date": filed_date,
                "period_start": period_start,
                "period_end": end_date,
                "filing_url": f"https://www.sec.gov/edgar/browse/?CIK={int(cik)}",
                "data": {
                    "shares_outstanding": s_val,
                    "revenue": r_val,
                    "balance_sheet": {
                        "total_assets": a_val,
                        "total_liabilities": l_val,
                        "total_shareholders_equity": e_val,
                        "total_debt": calculated_debt,
                        "short_term_debt": st_d,
                        "long_term_debt": lt_d,
                        "cash_and_cash_equivalents": calculated_cash,
                        "cash_primary": c_val,
                        "marketable_securities_current": m_val
                    }
                }
            })
            
        out_obj = {
            "symbol": sym,
            "sec_edgar_url": f"https://www.sec.gov/edgar/browse/?CIK={int(cik)}",
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "filings": filings
        }
        
        out_file = os.path.join(out_dir, f"{sym}.json")
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(out_obj, f, indent=2)
            
        context_equities_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "context", "data", "equities")
        os.makedirs(context_equities_dir, exist_ok=True)
        context_out_file = os.path.join(context_equities_dir, f"{sym}.json")
        with open(context_out_file, "w", encoding="utf-8") as f:
            json.dump(out_obj, f, indent=2)
            
        return len(filings)

def main():
    parser = argparse.ArgumentParser(description="Fetch SEC EDGAR financial filings for equity universe.")
    parser.add_argument("--symbols", nargs="+", help="Specific symbols to fetch (default: all universe)")
    parser.add_argument("--offline", action="store_true", help="Offline mode: use local cache in http/data/ without querying SEC API")
    parser.add_argument("--live", action="store_true", help="Live mode: query SEC EDGAR API (default)")
    args = parser.parse_args()
    
    out_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "http", "data")
    os.makedirs(out_dir, exist_ok=True)
    
    symbols = args.symbols if args.symbols else load_universe_symbols()
    offline_mode = args.offline and not args.live

    if offline_mode:
        print(f"Offline Mode: Verifying and normalizing local SEC filings cache for {len(symbols)} public equities...")
        success_count = 0
        missing_count = 0
        context_equities_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "context", "data", "equities")
        os.makedirs(context_equities_dir, exist_ok=True)

        for i, sym in enumerate(symbols, 1):
            sym_clean = sym.upper()
            filepath = os.path.join(out_dir, f"{sym_clean}.json")
            if os.path.exists(filepath):
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        cdata = json.load(f)
                    filings = cdata.get("filings", [])
                    
                    # Normalize filings data
                    normalized_filings = []
                    for filing in filings:
                        f_copy = dict(filing)
                        if "data" in f_copy:
                            f_copy["data"] = normalize_financial_filing_data(sym_clean, f_copy["data"])
                        normalized_filings.append(f_copy)
                    
                    cdata["filings"] = normalized_filings
                    cdata["last_updated"] = datetime.now(timezone.utc).isoformat()
                    
                    with open(filepath, "w", encoding="utf-8") as f:
                        json.dump(cdata, f, indent=2)

                    context_out_file = os.path.join(context_equities_dir, f"{sym_clean}.json")
                    with open(context_out_file, "w", encoding="utf-8") as f:
                        json.dump(cdata, f, indent=2)

                    print(f"[{i}/{len(symbols)}] Verified & normalized cache: {sym_clean}.json ({len(filings)} filings cached)")
                    success_count += 1
                except Exception as e:
                    print(f"[{i}/{len(symbols)}] Error reading/normalizing cached {sym_clean}.json: {e}")
                    missing_count += 1
            else:
                print(f"[{i}/{len(symbols)}] Warning: Cached file not found for {sym_clean}")
                missing_count += 1
        print(f"\nSEC Cache Verification & Normalization Complete: {success_count} verified, {missing_count} missing, total {len(symbols)}.")
        return

    # 1. Fetch SEC ticker-CIK directory
    print("Fetching SEC Master CIK directory...")
    req = urllib.request.Request("https://www.sec.gov/files/company_tickers.json", headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        tickers_data = json.loads(resp.read().decode("utf-8"))
        
    ticker_to_cik = {
        "AEP": "0000004904",
        "BRK-B": "0001067983"
    }
    for entry in tickers_data.values():
        t = entry["ticker"].upper()
        if t not in ticker_to_cik:
            ticker_to_cik[t] = str(entry["cik_str"]).zfill(10)
        
    print(f"Ingesting live SEC EDGAR data for {len(symbols)} public equities...")
    
    success_count = 0
    skip_count = 0
    fail_count = 0
    
    for i, sym in enumerate(symbols, 1):
        sym_clean = sym.upper()
        
        lookup_sym = sym_clean
        if lookup_sym not in ticker_to_cik and "-" in lookup_sym:
            alt = lookup_sym.replace("-", "")
            if alt in ticker_to_cik:
                lookup_sym = alt
                
        if lookup_sym not in ticker_to_cik:
            print(f"[{i}/{len(symbols)}] Warning: CIK not found for {sym_clean}")
            fail_count += 1
            continue
            
        cik = ticker_to_cik[lookup_sym]
        try:
            filing_count = fetch_company_sec_data(sym_clean, cik, out_dir, ticker_to_cik)
            print(f"[{i}/{len(symbols)}] Saved {sym_clean}.json ({filing_count} filings, CIK {cik})")
            success_count += 1
        except Exception as e:
            print(f"[{i}/{len(symbols)}] Error fetching {sym_clean} (CIK {cik}): {e}")
            fail_count += 1
            
    print(f"\nLive SEC Ingestion Complete: {success_count} succeeded, {fail_count} failed, total {len(symbols)}.")

if __name__ == "__main__":
    main()
