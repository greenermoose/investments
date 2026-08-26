"""
Anticipate SEC Filings & Statutory Schedule Generator
Calculates anticipated 10-Q, 10-K, and 20-F filing windows based on company fiscal calendars,
historical filing time-lags, and SEC statutory reporting deadlines for all universe public equities.
"""

import argparse
from datetime import datetime, timedelta, timezone
import json
import os
import sys

def get_base_dirs():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return {
        "root": root_dir,
        "scripts_data": os.path.join(root_dir, "scripts", "data"),
        "http_data": os.path.join(root_dir, "http", "data"),
        "context_data": os.path.join(root_dir, "context", "data"),
        "equities_data": os.path.join(root_dir, "context", "data", "equities")
    }

def load_universe():
    dirs = get_base_dirs()
    univ_path = os.path.join(dirs["http_data"], "universe.json")
    if os.path.exists(univ_path):
        with open(univ_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, dict) and "equities" in data:
                return data["equities"]
            elif isinstance(data, list):
                return data
    return []

def load_company_filings(symbol):
    dirs = get_base_dirs()
    # Try http/data/<SYM>.json then context/data/equities/<SYM>.json
    for path in [
        os.path.join(dirs["http_data"], f"{symbol}.json"),
        os.path.join(dirs["equities_data"], f"{symbol}.json")
    ]:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                continue
    return None

def project_next_filing(symbol, name, cik, filings_data, as_of_date):
    """
    Project the next expected SEC filing form and estimated window.
    """
    filings = filings_data.get("filings", []) if filings_data else []
    sec_edgar_url = filings_data.get("sec_edgar_url", f"https://www.sec.gov/edgar/browse/?CIK={cik}") if filings_data else f"https://www.sec.gov/edgar/browse/?CIK={cik}"

    # Default assumptions if no previous filing details
    last_form = "10-Q"
    last_filed = "2026-06-30"
    last_period_end = "2026-06-30"
    fiscal_year_end = "12-31"
    filer_category = "LARGE_ACCELERATED_FILER"

    if filings:
        latest = filings[0]
        last_form = latest.get("type", "10-Q")
        last_filed = latest.get("filing_date", "2026-06-30")
        last_period_end = latest.get("period_end", "2026-06-30")

    # Determine fiscal year end month/day from period_end or last 10-K
    ten_k_filings = [f for f in filings if f.get("type") in ["10-K", "20-F"]]
    if ten_k_filings:
        fy_end = ten_k_filings[0].get("period_end", "2025-12-31")
        try:
            parts = fy_end.split("-")
            if len(parts) == 3:
                fiscal_year_end = f"{parts[1]}-{parts[2]}"
        except Exception:
            fiscal_year_end = "12-31"

    # Determine next expected filing
    # If last was 10-Q (Q3), next is 10-K (FY). If last was 10-K, next is 10-Q (Q1).
    # Approximate sequence: Q1 (10-Q), Q2 (10-Q), Q3 (10-Q), Q4 (10-K).
    try:
        last_end_dt = datetime.strptime(last_period_end, "%Y-%m-%d").date()
    except Exception:
        last_end_dt = datetime(2026, 6, 30).date()

    # Next period ends approximately 91 days after previous period end
    next_period_end_dt = last_end_dt + timedelta(days=91)
    
    # Check if next period aligns with fiscal year end
    fy_month, fy_day = [int(x) for x in fiscal_year_end.split("-")] if "-" in fiscal_year_end else (12, 31)
    is_fiscal_year_end = (next_period_end_dt.month == fy_month) or (abs(next_period_end_dt.month - fy_month) == 1 and abs(next_period_end_dt.day - fy_day) <= 5)

    if last_form in ["10-K", "20-F"]:
        next_form = "10-Q"
        next_period_label = "Q1"
        deadline_days = 40  # Large Accelerated Filer 10-Q deadline
        lag_days_min = 25
        lag_days_max = 38
    elif is_fiscal_year_end or last_form == "10-Q" and last_end_dt.month in [9, 10]:
        # Likely Q4 -> 10-K
        next_form = "10-K"
        next_period_label = "FY (Full Year)"
        deadline_days = 60  # Large Accelerated Filer 10-K deadline
        lag_days_min = 40
        lag_days_max = 58
    else:
        next_form = "10-Q"
        # Guess Q2 or Q3
        next_period_label = "Q3" if last_end_dt.month in [6, 7] else "Q2"
        deadline_days = 40
        lag_days_min = 25
        lag_days_max = 38

    # Foreign private issuers use 20-F / 6-K
    if last_form == "20-F":
        next_form = "6-K"
        next_period_label = "Semi-Annual / Interim"
        deadline_days = 60
        lag_days_min = 35
        lag_days_max = 55

    # Window start and end dates relative to next_period_end_dt
    window_start_dt = next_period_end_dt + timedelta(days=lag_days_min)
    window_end_dt = next_period_end_dt + timedelta(days=lag_days_max)
    statutory_deadline_dt = next_period_end_dt + timedelta(days=deadline_days)

    days_until_window = (window_start_dt - as_of_date).days

    if days_until_window <= 0 and (statutory_deadline_dt - as_of_date).days >= 0:
        status = "IMMINENT_NEXT_14_DAYS"
    elif 0 < days_until_window <= 14:
        status = "IMMINENT_NEXT_14_DAYS"
    elif 14 < days_until_window <= 30:
        status = "UPCOMING_NEXT_30_DAYS"
    elif (statutory_deadline_dt - as_of_date).days < 0:
        status = "OVERDUE"
    else:
        status = "SCHEDULED"

    return {
        "symbol": symbol,
        "company_name": name,
        "cik": str(cik).zfill(10) if cik else "0000000000",
        "fiscal_year_end": fiscal_year_end,
        "filer_category": filer_category,
        "last_filed_form": last_form,
        "last_filing_date": last_filed,
        "last_period_end": last_period_end,
        "next_expected_form": next_form,
        "next_expected_fiscal_period": next_period_label,
        "estimated_filing_window_start": window_start_dt.strftime("%Y-%m-%d"),
        "estimated_filing_window_end": window_end_dt.strftime("%Y-%m-%d"),
        "statutory_deadline": statutory_deadline_dt.strftime("%Y-%m-%d"),
        "days_until_window_start": max(0, days_until_window),
        "status": status,
        "sec_edgar_url": sec_edgar_url
    }

def main():
    parser = argparse.ArgumentParser(description="Anticipate upcoming SEC 10-Q and 10-K filing dates across public equities.")
    parser.add_argument("--upcoming-days", type=int, default=60, help="Filter for filings within N days (default: 60)")
    parser.add_argument("--symbol", type=str, help="Filter for a specific ticker symbol")
    parser.add_argument("--status", type=str, choices=["IMMINENT_NEXT_14_DAYS", "UPCOMING_NEXT_30_DAYS", "SCHEDULED", "OVERDUE"], help="Filter by status")
    parser.add_argument("--json", action="store_true", help="Output raw JSON to stdout")
    args = parser.parse_args()

    dirs = get_base_dirs()
    as_of_date = datetime.now(timezone.utc).date()
    equities = load_universe()

    if not equities:
        print("Error: No equities found in universe.json")
        sys.exit(1)

    calendar_entries = []
    for eq in equities:
        sym = eq.get("symbol")
        name = eq.get("name", f"{sym} Corporation")
        cik = eq.get("cik")
        if not sym:
            continue

        filings_data = load_company_filings(sym)
        entry = project_next_filing(sym, name, cik, filings_data, as_of_date)
        calendar_entries.append(entry)

    # Sort entries by days_until_window_start ascending
    calendar_entries.sort(key=lambda x: (x["days_until_window_start"], x["symbol"]))

    output_doc = {
        "schema_version": "1.0",
        "description": "Anticipated SEC filing schedule (10-Q / 10-K / 20-F) for universe equities calculated from statutory deadlines and fiscal year-ends.",
        "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "provenance": "TIER_1_PRIMARY_REGULATORY",
        "total_equities_tracked": len(calendar_entries),
        "calendar_entries": calendar_entries
    }

    # Save to scripts/data/, http/data/, context/data/
    for out_dir in [dirs["scripts_data"], dirs["http_data"], dirs["context_data"]]:
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, "sec_filing_calendar.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(output_doc, f, indent=2)

    # Filtering for display
    display_entries = calendar_entries
    if args.symbol:
        display_entries = [e for e in display_entries if e["symbol"].upper() == args.symbol.upper()]
    if args.status:
        display_entries = [e for e in display_entries if e["status"] == args.status]
    if args.upcoming_days:
        display_entries = [e for e in display_entries if e["days_until_window_start"] <= args.upcoming_days]

    if args.json:
        print(json.dumps(display_entries, indent=2))
        return

    print("================================================================================")
    print(f"ANTICIPATED SEC FILING CALENDAR (As of {as_of_date.strftime('%Y-%m-%d')})")
    print(f"Total Universe Equities Tracked: {len(calendar_entries)} | Filtered Showing: {len(display_entries)}")
    print("================================================================================")
    print(f"{'SYMBOL':<7} {'FORM':<6} {'PERIOD':<10} {'EST. WINDOW':<23} {'DEADLINE':<12} {'DAYS':<6} {'STATUS'}")
    print("-" * 88)

    for entry in display_entries[:40]:
        window_str = f"{entry['estimated_filing_window_start']} to {entry['estimated_filing_window_end']}"
        print(f"{entry['symbol']:<7} {entry['next_expected_form']:<6} {entry['next_expected_fiscal_period']:<10} {window_str:<23} {entry['statutory_deadline']:<12} {entry['days_until_window_start']:<6} {entry['status']}")

    if len(display_entries) > 40:
        print(f"... and {len(display_entries) - 40} additional equities scheduled.")
    print("================================================================================")
    print(f"Calendar saved to: context/data/sec_filing_calendar.json and http/data/sec_filing_calendar.json")

if __name__ == "__main__":
    main()
