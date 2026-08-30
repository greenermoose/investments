"""
Fetch SEC EDGAR XBRL Filings & Financial Metrics
Extracts authoritative 10-K/10-Q/20-F XBRL data for all public companies in the equity universe.
"""

import argparse
from datetime import datetime, timezone
import hashlib
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

# A trailing-twelve-month window, allowing for 52/53-week fiscal years and
# period ends that drift by a few days.
TTM_MIN_DAYS = 330
TTM_MAX_DAYS = 390
# A discrete quarter, allowing for 13/14-week quarters.
QUARTER_MAX_DAYS = 100

HEADERS = {
    "User-Agent": ""
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


def _ratio(numerator, denominator):
    if numerator is None or denominator in (None, 0):
        return None
    return numerator / denominator


def _period_days(filing):
    start, end = filing.get("period_start"), filing.get("period_end")
    if not start or not end:
        return None
    try:
        start_date = datetime.strptime(start, "%Y-%m-%d").date()
        end_date = datetime.strptime(end, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return None
    days = (end_date - start_date).days
    return days if days > 0 else None


def compute_ttm_revenue(filings):
    """Trailing twelve months of revenue from filings that may be cumulative.

    SEC Company Facts reports interim periods **cumulatively**: a Q3 10-Q states
    nine months of revenue, not three. Summing Q1, Q2, and Q3 as though they
    were quarters counts the first quarter three times and the second twice.
    For Apple that turned $466.8B into $763.1B, which then flowed into every
    price-to-sales ratio and onto the company card on the site.

    Which convention a filer uses is not assumed; it is read from the period the
    filing itself declares. An annual period is the answer outright. A
    cumulative year-to-date period is completed with the identity
    ``TTM = latest_YTD + prior_FY - prior_year_YTD``, which is how the missing
    fourth quarter is recovered. Genuinely quarterly periods are summed, newest
    first, until a year is covered.

    Returns None rather than a partial sum when a full year cannot be
    reconstructed. An understated TTM is not more useful than an absent one, and
    it is far harder to notice.
    """
    dated = []
    for filing in filings or []:
        revenue = (filing.get("data") or {}).get("revenue")
        days = _period_days(filing)
        if revenue is None or days is None:
            continue
        dated.append((filing, float(revenue), days))
    if not dated:
        return None

    dated.sort(key=lambda item: item[0]["period_end"], reverse=True)
    latest, latest_revenue, latest_days = dated[0]

    if TTM_MIN_DAYS <= latest_days <= TTM_MAX_DAYS:
        return latest_revenue

    if latest_days > QUARTER_MAX_DAYS:
        # Cumulative year-to-date. Complete the year from the prior annual
        # figure, less the same stretch of the prior year.
        period = latest.get("fiscal_period")
        year = latest.get("fiscal_year")
        if not period or not isinstance(year, int):
            return None
        prior_annual = next(
            (rev for f, rev, days in dated
             if f.get("fiscal_year") == year - 1 and f.get("fiscal_period") == "FY"
             and TTM_MIN_DAYS <= days <= TTM_MAX_DAYS),
            None,
        )
        prior_ytd = next(
            (rev for f, rev, _ in dated
             if f.get("fiscal_year") == year - 1 and f.get("fiscal_period") == period),
            None,
        )
        if prior_annual is None or prior_ytd is None:
            return None
        total = latest_revenue + prior_annual - prior_ytd
        return total if total > 0 else None

    # Discrete quarters: take them newest first until a year is covered.
    total_days = 0
    total_revenue = 0.0
    previous_start = None
    for filing, revenue, days in dated:
        if days > QUARTER_MAX_DAYS:
            continue
        if previous_start is not None and filing["period_end"] > previous_start:
            continue
        total_days += days
        total_revenue += revenue
        previous_start = filing["period_start"]
        if total_days >= TTM_MIN_DAYS:
            break
    if not (TTM_MIN_DAYS <= total_days <= TTM_MAX_DAYS):
        return None
    return total_revenue


def derive_fundamental_metrics(values):
    """Derive standardized metrics without substituting missing observations."""
    revenue = values.get("revenue")
    gross_profit = values.get("gross_profit")
    operating_income = values.get("operating_income")
    operating_cash_flow = values.get("operating_cash_flow")
    capital_expenditure = values.get("capital_expenditure")
    interest_expense = values.get("interest_expense")
    total_debt = values.get("total_debt")
    equity = values.get("total_shareholders_equity")
    cash = values.get("cash_and_cash_equivalents")
    pretax_income = values.get("pretax_income")
    income_tax = values.get("income_tax")

    free_cash_flow = None
    if operating_cash_flow is not None and capital_expenditure is not None:
        free_cash_flow = operating_cash_flow - abs(capital_expenditure)

    effective_tax_rate = _ratio(income_tax, pretax_income)
    if effective_tax_rate is not None:
        effective_tax_rate = min(max(effective_tax_rate, 0.0), 1.0)
    nopat = None
    if operating_income is not None and effective_tax_rate is not None:
        nopat = operating_income * (1.0 - effective_tax_rate)
    invested_capital = None
    if total_debt is not None and equity is not None and cash is not None:
        invested_capital = total_debt + equity - cash

    monthly_burn = None
    runway_months = None
    if free_cash_flow is not None and free_cash_flow < 0 and cash is not None:
        monthly_burn = abs(free_cash_flow) / 12.0
        runway_months = _ratio(cash, monthly_burn)

    return {
        "gross_margin_pct": None if _ratio(gross_profit, revenue) is None else _ratio(gross_profit, revenue) * 100.0,
        "operating_margin_pct": None if _ratio(operating_income, revenue) is None else _ratio(operating_income, revenue) * 100.0,
        "free_cash_flow": free_cash_flow,
        "fcf_conversion_pct": None if _ratio(free_cash_flow, values.get("net_income")) is None else _ratio(free_cash_flow, values.get("net_income")) * 100.0,
        "interest_coverage_ratio": _ratio(operating_income, interest_expense),
        "net_leverage": None if total_debt is None or cash is None else total_debt - cash,
        "debt_to_equity_ratio": _ratio(total_debt, equity),
        "effective_tax_rate_pct": None if effective_tax_rate is None else effective_tax_rate * 100.0,
        "nopat": nopat,
        "invested_capital": invested_capital,
        "roic_pct": None if _ratio(nopat, invested_capital) is None else _ratio(nopat, invested_capital) * 100.0,
        "monthly_cash_burn": monthly_burn,
        "liquidity_runway_months": runway_months,
    }

def write_json_file(path, payload, attempts=5):
    """Write a JSON document by way of a temporary file, then move it into place.

    Two failure modes motivate this. Writing in place truncates the target
    before the new content is known to be writable, so a failure leaves the
    record destroyed rather than merely stale -- and because each equity record
    is written to two locations, a failure on the second write leaves the two
    copies disagreeing about whether the company has filings at all. Windows
    also intermittently rejects an open() with EINVAL while a scan of the
    just-written tree is still in flight, which is not a real error and is
    resolved by waiting. Retry, then surface the error if it persists.
    """
    directory = os.path.dirname(path)
    if directory:
        os.makedirs(directory, exist_ok=True)
    last_error = None
    for attempt in range(attempts):
        tmp_path = f"{path}.{os.getpid()}.{attempt}.tmp"
        try:
            with open(tmp_path, "w", encoding="utf-8") as handle:
                json.dump(payload, handle, indent=2)
            os.replace(tmp_path, path)
            return
        except OSError as error:
            last_error = error
            try:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
            except OSError:
                pass
            time.sleep(0.2 * (attempt + 1))
    raise last_error


def fetch_company_sec_data(sym, cik, out_dir, ticker_to_cik):
    url = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"
    req = urllib.request.Request(url, headers=HEADERS)
    
    time.sleep(0.12)  # Enforce SEC rate limit (< 10 req/sec)
    
    with urllib.request.urlopen(req) as response:
        raw_response = response.read()
        raw_content_hash = hashlib.sha256(raw_response).hexdigest()
        retrieved_at = datetime.now(timezone.utc).isoformat()
        data = json.loads(raw_response.decode("utf-8"))
        raw_archive_dir = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "context", "data", "raw", "sec",
            "companyfacts", retrieved_at[:10],
        )
        os.makedirs(raw_archive_dir, exist_ok=True)
        raw_archive_path = os.path.join(raw_archive_dir, f"CIK{str(cik).zfill(10)}-{raw_content_hash}.json")
        if os.path.exists(raw_archive_path):
            with open(raw_archive_path, "rb") as raw_file:
                if raw_file.read() != raw_response:
                    raise RuntimeError(f"immutable SEC raw archive collision: {raw_archive_path}")
        else:
            with open(raw_archive_path, "wb") as raw_file:
                raw_file.write(raw_response)
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

        gross_profit = extract_metric(facts, ["us-gaap", "ifrs-full"], [
            "GrossProfit", "GrossProfitLoss"
        ])
        operating_income = extract_metric(facts, ["us-gaap", "ifrs-full"], [
            "OperatingIncomeLoss", "ProfitLossFromOperatingActivities"
        ])
        pretax_income = extract_metric(facts, ["us-gaap", "ifrs-full"], [
            "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest",
            "IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments",
            "IncomeBeforeTaxExpenseBenefit", "ProfitLossBeforeTax"
        ])
        income_tax = extract_metric(facts, ["us-gaap", "ifrs-full"], [
            "IncomeTaxExpenseBenefit", "IncomeTaxExpenseContinuingOperations", "IncomeTaxExpense"
        ])
        net_income = extract_metric(facts, ["us-gaap", "ifrs-full"], [
            "NetIncomeLoss", "ProfitLoss", "NetIncomeLossAvailableToCommonStockholdersBasic"
        ])
        operating_cash_flow = extract_metric(facts, ["us-gaap", "ifrs-full"], [
            "NetCashProvidedByUsedInOperatingActivities",
            "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations",
            "CashFlowsFromUsedInOperatingActivities"
        ])
        capital_expenditure = extract_metric(facts, ["us-gaap", "ifrs-full"], [
            "PaymentsToAcquirePropertyPlantAndEquipment",
            "PaymentsForProceedsFromPropertyPlantAndEquipment",
            "PurchaseOfPropertyPlantAndEquipment"
        ])
        interest_expense = extract_metric(facts, ["us-gaap", "ifrs-full"], [
            "InterestExpenseNonOperating", "InterestExpense", "FinanceCosts"
        ])
        stock_compensation = extract_metric(facts, ["us-gaap", "ifrs-full"], [
            "ShareBasedCompensation", "StockBasedCompensation", "ShareBasedPayment"
        ])
        share_repurchases = extract_metric(facts, ["us-gaap", "ifrs-full"], [
            "PaymentsForRepurchaseOfCommonStock", "PaymentsForRepurchaseOfEquity"
        ])
        dividends_paid = extract_metric(facts, ["us-gaap", "ifrs-full"], [
            "PaymentsOfDividendsCommonStock", "PaymentsOfDividends", "DividendsPaid"
        ])
        acquisitions = extract_metric(facts, ["us-gaap", "ifrs-full"], [
            "PaymentsToAcquireBusinessesNetOfCashAcquired", "PaymentsToAcquireBusinesses"
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

        lease_liabilities = extract_metric(facts, ["us-gaap", "ifrs-full"], [
            "OperatingLeaseLiability", "OperatingLeaseLiabilityCurrent",
            "OperatingLeaseLiabilityNoncurrent", "LeaseLiabilities"
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
            if len(valid_dates) >= 24:
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
                if len(valid_dates) >= 24:
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

            def optional_val_to_usd(node):
                if not node or node.get("val") is None:
                    return None
                return convert_to_usd(node.get("val"), currency=node.get("_unit"), symbol=sym)

            def exact_node(series):
                candidates = [x for x in series if x.get("end") == end_date]
                accession = d.get("accn")
                if accession:
                    exact = next((x for x in candidates if x.get("accn") == accession), None)
                    if exact:
                        return exact
                return candidates[0] if candidates else None

            s_node = next((x for x in shares if x.get("end", "") <= end_date), None) if shares else None
            s_raw = s_node.get("val") if s_node else None
            s_val = normalize_shares_outstanding(sym, s_raw) if s_raw is not None else None
                
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

            reported_values = {
                "revenue": optional_val_to_usd(exact_node(revenue)),
                "gross_profit": optional_val_to_usd(exact_node(gross_profit)),
                "operating_income": optional_val_to_usd(exact_node(operating_income)),
                "pretax_income": optional_val_to_usd(exact_node(pretax_income)),
                "income_tax": optional_val_to_usd(exact_node(income_tax)),
                "net_income": optional_val_to_usd(exact_node(net_income)),
                "operating_cash_flow": optional_val_to_usd(exact_node(operating_cash_flow)),
                "capital_expenditure": optional_val_to_usd(exact_node(capital_expenditure)),
                "interest_expense": optional_val_to_usd(exact_node(interest_expense)),
                "stock_based_compensation": optional_val_to_usd(exact_node(stock_compensation)),
                "share_repurchases": optional_val_to_usd(exact_node(share_repurchases)),
                "dividends_paid": optional_val_to_usd(exact_node(dividends_paid)),
                "acquisitions": optional_val_to_usd(exact_node(acquisitions)),
                "total_assets": optional_val_to_usd(a_node),
                "total_liabilities": optional_val_to_usd(l_node),
                "total_shareholders_equity": optional_val_to_usd(e_node),
                "total_debt": calculated_debt if calculated_debt else None,
                "cash_and_cash_equivalents": calculated_cash if calculated_cash else None,
                "lease_liabilities": optional_val_to_usd(exact_node(lease_liabilities)),
            }
            derived_metrics = derive_fundamental_metrics(reported_values)
            
            filings.append({
                "type": d["form"],
                "filing_date": filed_date,
                "period_start": period_start,
                "period_end": end_date,
                "filing_url": f"https://www.sec.gov/edgar/browse/?CIK={int(cik)}",
                "accession_number": d.get("accn"),
                "fiscal_year": d.get("fy"),
                "fiscal_period": d.get("fp"),
                "retrieved_at": retrieved_at,
                "raw_content_hash": raw_content_hash,
                "data": {
                    "shares_outstanding": s_val,
                    "revenue": reported_values["revenue"],
                    "income_statement": {
                        key: reported_values[key] for key in (
                            "revenue", "gross_profit", "operating_income", "pretax_income",
                            "income_tax", "net_income"
                        )
                    },
                    "cash_flow": {
                        key: reported_values[key] for key in (
                            "operating_cash_flow", "capital_expenditure", "stock_based_compensation",
                            "share_repurchases", "dividends_paid", "acquisitions"
                        )
                    },
                    "balance_sheet": {
                        "total_assets": reported_values["total_assets"],
                        "total_liabilities": reported_values["total_liabilities"],
                        "total_shareholders_equity": reported_values["total_shareholders_equity"],
                        "total_debt": reported_values["total_debt"],
                        "short_term_debt": st_d,
                        "long_term_debt": lt_d,
                        "cash_and_cash_equivalents": reported_values["cash_and_cash_equivalents"],
                        "cash_primary": c_val,
                        "marketable_securities_current": m_val,
                        "lease_liabilities": reported_values["lease_liabilities"]
                    },
                    "derived_metrics": derived_metrics
                }
            })

        fundamental_observations = []
        for filing in filings:
            filing_data = filing.get("data", {})
            balance = filing_data.get("balance_sheet") or {}
            reported = {
                "shares_outstanding": filing_data.get("shares_outstanding"),
                **(filing_data.get("income_statement") or {}),
                **(filing_data.get("cash_flow") or {}),
                **{
                    key: balance.get(key) for key in (
                        "total_assets", "total_liabilities", "total_shareholders_equity",
                        "total_debt", "cash_and_cash_equivalents", "lease_liabilities",
                    )
                },
            }
            for metric, value in reported.items():
                if not isinstance(value, (int, float)):
                    continue
                identity = "|".join((
                    sym, metric, filing.get("period_end", ""),
                    filing.get("accession_number") or "", str(value),
                ))
                observation_id = "FUND-" + hashlib.sha256(identity.encode("utf-8")).hexdigest()[:24].upper()
                fundamental_observations.append({
                    "observation_id": observation_id,
                    "symbol": sym,
                    "metric": metric,
                    "value": value,
                    "unit": "shares" if metric == "shares_outstanding" else "USD",
                    "period_start": filing.get("period_start"),
                    "period_end": filing.get("period_end"),
                    "fiscal_year": filing.get("fiscal_year"),
                    "fiscal_period": filing.get("fiscal_period"),
                    "taxonomy": None,
                    "concept": None,
                    "form": filing.get("type"),
                    "accession_number": filing.get("accession_number"),
                    "filed_at": filing.get("filing_date"),
                    "source_class": "REGULATORY",
                    "source_locator": url,
                    "retrieved_at": retrieved_at,
                    "raw_content_hash": raw_content_hash,
                    "verification_status": "VERIFIED_PRIMARY",
                    "supersedes_observation_id": None,
                })
            
        out_obj = {
            "symbol": sym,
            "cik": str(cik).zfill(10),
            "sec_edgar_url": f"https://www.sec.gov/edgar/browse/?CIK={int(cik)}",
            "last_updated": retrieved_at,
            "source": {
                "source_class": "TIER_1_SEC_EDGAR_COMPANY_FACTS",
                "url": url,
                "raw_archive_path": os.path.relpath(raw_archive_path, os.path.dirname(os.path.dirname(__file__))).replace("\\", "/"),
                "retrieved_at": retrieved_at,
                "raw_content_hash": raw_content_hash,
                "verification_status": "SOURCE_OBSERVED"
            },
            "data_layers": {
                "immutable_raw_source_observations": [
                    os.path.relpath(raw_archive_path, os.path.dirname(os.path.dirname(__file__))).replace("\\", "/")
                ],
                "normalized_reported_facts": "fundamental_observations",
                "deterministically_derived_metrics": "filings[].data.derived_metrics",
                "agent_authored_hypotheses_and_forecasts": "research"
            },
            "filings": filings,
            "fundamental_observations": fundamental_observations
        }

        def merge_preserved_fields(target_path, payload):
            if not os.path.exists(target_path):
                return payload
            try:
                with open(target_path, "r", encoding="utf-8") as f:
                    existing = json.load(f)
                previous_hash = (existing.get("source") or {}).get("raw_content_hash")
                current_hash = (payload.get("source") or {}).get("raw_content_hash")
                if previous_hash and current_hash and previous_hash != current_hash:
                    payload["research_refresh_required"] = True
                    payload["research_refresh_reasons"] = [
                        "SEC Company Facts content hash changed; an agent must review affected hypotheses."
                    ]
                else:
                    payload["research_refresh_required"] = existing.get("research_refresh_required", False)
                    payload["research_refresh_reasons"] = existing.get("research_refresh_reasons", [])
                for key in (
                    "research",
                    "research_last_updated",
                    "off_balance_sheet_and_contingent_liabilities",
                    "investor_relations_url",
                ):
                    if key in existing and key not in payload:
                        payload[key] = existing[key]
            except (OSError, json.JSONDecodeError):
                pass
            return payload
        
        out_file = os.path.join(out_dir, f"{sym}.json")
        context_equities_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "context", "data", "equities")
        context_out_file = os.path.join(context_equities_dir, f"{sym}.json")

        # Merge both destinations before writing either, so a failure part way
        # through cannot leave the two copies describing different companies.
        out_obj = merge_preserved_fields(out_file, out_obj)
        out_obj = merge_preserved_fields(context_out_file, out_obj)
        write_json_file(out_file, out_obj)
        write_json_file(context_out_file, out_obj)
            
        return len(filings)

def main():
    parser = argparse.ArgumentParser(description="Fetch SEC EDGAR financial filings for equity universe.")
    parser.add_argument("--symbols", nargs="+", help="Specific symbols to fetch (default: all universe)")
    parser.add_argument("--offline", action="store_true", help="Offline mode: use local cache in http/data/ without querying SEC API")
    parser.add_argument("--live", action="store_true", help="Live mode: query SEC EDGAR API (default)")
    parser.add_argument("--user-agent", help="SEC-compliant user agent with application name and real contact email; may also use SEC_USER_AGENT")
    args = parser.parse_args()
    
    out_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "http", "data")
    os.makedirs(out_dir, exist_ok=True)
    
    symbols = args.symbols if args.symbols else load_universe_symbols()
    offline_mode = args.offline and not args.live

    if not offline_mode:
        sec_user_agent = args.user_agent or os.environ.get("SEC_USER_AGENT")
        if not sec_user_agent or "@" not in sec_user_agent:
            parser.error("live SEC access requires --user-agent or SEC_USER_AGENT containing a real contact email")
        HEADERS["User-Agent"] = sec_user_agent

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
            if os.environ.get("SEC_DEBUG_TRACEBACK"):
                import traceback
                traceback.print_exc()
            fail_count += 1
            
    print(f"\nLive SEC Ingestion Complete: {success_count} succeeded, {fail_count} failed, total {len(symbols)}.")

if __name__ == "__main__":
    main()
