#!/usr/bin/env python3
"""
scripts/screen_market.py
Deterministic Equity Screener CLI for the Equity Research Agent.

Filters US exchange-listed public equities against quantitative criteria
targeting an experimental hypothesis of generating >= 20% annualized ROI.
Performs solvency and runway sanity checks to ensure survival and compounding.
"""

import argparse
import json
import math
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
HTTP_DATA_DIR = ROOT_DIR / "http" / "data"
UNIVERSE_JSON = HTTP_DATA_DIR / "universe.json"
MARKET_PRICES_JSON = ROOT_DIR / "scripts" / "data" / "market_prices.json"


def load_universe():
    if UNIVERSE_JSON.exists():
        with open(UNIVERSE_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
            if isinstance(data, dict) and "companies" in data:
                return data["companies"]
    return []


def calculate_estimated_roi(growth_rate, current_ps, target_ps, years=3):
    """
    Calculates estimated annualized ROI based on revenue growth and multiple expansion/contraction.
    Formula: ((1 + growth_rate)^years * (target_ps / current_ps))^(1/years) - 1
    """
    if current_ps <= 0 or target_ps <= 0:
        return 0.0
    future_revenue_multiplier = math.pow(1.0 + (growth_rate / 100.0), years)
    multiple_change = target_ps / current_ps
    total_return_multiplier = future_revenue_multiplier * multiple_change
    if total_return_multiplier <= 0:
        return 0.0
    annualized_roi = (math.pow(total_return_multiplier, 1.0 / years) - 1.0) * 100.0
    return round(annualized_roi, 2)


def _num(item, *keys, default=0.0):
    """First numeric value among keys, else default.

    dict.get(key, default) returns None when the key is present and null, which
    it now is for every ticker awaiting authored valuation parameters. This
    walks the candidate keys and only accepts an actual number.
    """
    for key in keys:
        value = item.get(key)
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            return float(value)
    return default


def _is_unrated(item):
    """Whether this ticker has no rating because its research is unauthored.

    An unrated ticker is not a SELL. Screens exclude it and say so rather than
    ranking it against tickers that have been researched.
    """
    return item.get("triage_status") == "AWAITING_RESEARCH" or not item.get("thesis_status")


def screen_candidates(
    min_roi=20.0,
    min_market_cap_b=1.0,
    max_debt_to_equity=4.0,
    target_sector=None,
    status_filter=None,
    exclude_avoid=False,
):
    universe = load_universe()
    if not universe:
        print("Warning: Master universe data not found or empty. Please run build_universe_json.py first.", file=sys.stderr)
        return []

    candidates = []
    unrated = []

    for item in universe:
        symbol = item.get("symbol", "")
        name = item.get("name", "")
        sector = item.get("sector", "Technology")
        if _is_unrated(item):
            unrated.append(symbol)
            continue

        market_cap_b = _num(item, "market_cap_b", "marketCapB")
        price = _num(item, "current_price", "price", "closing_price")
        entry_price = _num(item, "entry_price", "benchmarkEntry", default=price)
        target_exit_price = _num(item, "target_exit_price", default=price * 1.5)
        annualized_roi = _num(item, "annualized_roi_pct", "annualized_roi")
        conviction = _num(item, "conviction_score", default=5.0)
        thesis_status = item.get("thesis_status") or "HOLD"
        triage_status = item.get("triage_status") or "QUALIFIED_CANDIDATE"
        moat = item.get("moat") or ""

        total_debt = _num(item, "total_debt")
        cash = _num(item, "cash_and_cash_equivalents")
        net_debt = total_debt - cash
        market_cap = _num(item, "market_cap", default=market_cap_b * 1e9)

        # Solvency evaluation: Net Debt / Market Cap or Cash Runway
        debt_to_market_cap = round(total_debt / market_cap, 2) if market_cap > 0 else 0.0
        
        if annualized_roi <= 0.0 and price > 0 and target_exit_price > price:
            annualized_roi = round(((target_exit_price / price) ** (1.0 / 3.0) - 1.0) * 100.0, 2)

        if exclude_avoid and (thesis_status.upper() == "AVOID" or triage_status.upper() == "AVOID"):
            continue
        if target_sector and sector.lower() != target_sector.lower():
            continue
        if market_cap_b > 0 and market_cap_b < min_market_cap_b:
            continue
        if status_filter and thesis_status.upper() != status_filter.upper():
            continue

        if annualized_roi >= min_roi:
            if debt_to_market_cap < 0.3 or cash > total_debt:
                solvency_status = "NET_CASH_OR_MINIMAL_DEBT"
            elif debt_to_market_cap < 0.6:
                solvency_status = "MODERATE_LEVERAGE_SECURE"
            else:
                solvency_status = "LEVERAGED_RUNWAY_MONITORED"

            candidates.append({
                "symbol": symbol,
                "name": name,
                "sector": sector,
                "price": price,
                "benchmark_entry": entry_price,
                "target_exit_price": target_exit_price,
                "annualized_roi_pct": annualized_roi,
                "conviction_score": conviction,
                "thesis_status": thesis_status,
                "debt_to_market_cap": debt_to_market_cap,
                "solvency_status": solvency_status,
                "moat": moat
            })

    candidates.sort(key=lambda x: (x["annualized_roi_pct"], x["conviction_score"]), reverse=True)
    return candidates


def categorize_all_universe():
    universe = load_universe()
    if not universe:
        print("Warning: Master universe data not found or empty. Please run build_universe_json.py first.", file=sys.stderr)
        return {}

    categories = {
        "BUY": [],
        "HOLD": [],
        "SELL": [],
        "AVOID": [],
        # Tickers in coverage whose valuation parameters have not been authored.
        # They are neither a buy nor a sell; nobody has evaluated them yet.
        "AWAITING_RESEARCH": []
    }

    for item in universe:
        symbol = item.get("symbol", "")
        name = item.get("name", "")
        sector = item.get("sector", "Technology")
        price = _num(item, "current_price", "price", "closing_price")
        entry_price = _num(item, "entry_price", "benchmarkEntry", default=price)
        target_exit_price = _num(item, "target_exit_price", default=price * 1.5)
        annualized_roi = _num(item, "annualized_roi_pct", "annualized_roi")
        conviction = _num(item, "conviction_score", default=5.0)
        thesis_status = str(item.get("thesis_status") or "").upper()
        triage_status = str(item.get("triage_status") or "QUALIFIED_CANDIDATE").upper()

        if _is_unrated(item):
            cat = "AWAITING_RESEARCH"
        elif triage_status == "AVOID" or thesis_status == "AVOID":
            cat = "AVOID"
        elif thesis_status in categories:
            cat = thesis_status
        elif annualized_roi >= 20.0:
            cat = "BUY"
        elif annualized_roi >= 10.0:
            cat = "HOLD"
        else:
            cat = "SELL"

        record = {
            "symbol": symbol,
            "name": name,
            "sector": sector,
            "price": price,
            "benchmark_entry": entry_price,
            "target_exit_price": target_exit_price,
            "annualized_roi_pct": annualized_roi,
            "conviction_score": conviction,
            "thesis_status": cat
        }
        categories[cat].append(record)

    for cat in categories:
        categories[cat].sort(key=lambda x: (x["annualized_roi_pct"], x["conviction_score"]), reverse=True)

    return categories


def main():
    parser = argparse.ArgumentParser(
        description="Deterministic Equity Screener CLI for Equity Research Agent"
    )
    parser.add_argument("--min-roi", type=float, default=20.0, help="Minimum annualized ROI target (default: 20.0%%)")
    parser.add_argument("--min-cap", type=float, default=1.0, help="Minimum Market Cap in $B (default: 1.0)")
    parser.add_argument("--sector", type=str, default=None, help="Filter by sector")
    parser.add_argument("--status", type=str, default=None, help="Filter by rating status (BUY, HOLD, SELL, AVOID)")
    parser.add_argument("--exclude-avoid", action="store_true", help="Exclude all AVOID list equities from results")
    parser.add_argument("--summary", action="store_true", help="Show full universe categorization summary across BUY, HOLD, SELL, and AVOID")
    parser.add_argument("--categorize-all", action="store_true", help="Alias for --summary")
    parser.add_argument("--json", action="store_true", help="Output raw JSON array")
    parser.add_argument("--limit", type=int, default=20, help="Max candidates to output (default: 20)")

    args = parser.parse_args()

    if args.summary or args.categorize_all:
        cats = categorize_all_universe()
        total_count = sum(len(v) for v in cats.values())

        if args.json:
            print(json.dumps(cats, indent=2))
            return

        print("=" * 80)
        print("MASTER PUBLIC EQUITIES UNIVERSE CATEGORIZATION SUMMARY")
        print("=" * 80)
        print(f"Total Tracked Public Equities: {total_count}\n")

        for cat_name in ["BUY", "HOLD", "SELL", "AVOID", "AWAITING_RESEARCH"]:
            items = cats.get(cat_name, [])
            pct = round((len(items) / total_count * 100.0), 1) if total_count > 0 else 0.0

            if cat_name == "AWAITING_RESEARCH":
                print(f"[{cat_name}] {len(items)} Equities ({pct}%) | No rating: "
                      "valuation parameters unauthored")
                if items:
                    print("  Run: python scripts/research_gaps.py --field valuation_parameters")
                print("-" * 80)
                continue

            rois = [it["annualized_roi_pct"] for it in items]
            median_roi = round(sorted(rois)[len(rois) // 2], 1) if rois else 0.0

            print(f"[{cat_name}] {len(items)} Equities ({pct}%) | Median 3Y CAGR: {median_roi:+}%")
            if items:
                top_syms = ", ".join([f"{it['symbol']} ({it['annualized_roi_pct']:+}%)" for it in items[:6]])
                print(f"  Top Constituents: {top_syms}")
            print("-" * 80)
        print("=" * 80)
        return

    results = screen_candidates(
        min_roi=args.min_roi,
        min_market_cap_b=args.min_cap,
        target_sector=args.sector,
        status_filter=args.status,
        exclude_avoid=args.exclude_avoid,
    )

    results = results[:args.limit]

    if args.json:
        print(json.dumps(results, indent=2))
        return

    print("=" * 80)
    print(f"EQUITY RESEARCH SCREENER: >= {args.min_roi}% ANNUALIZED ROI CANDIDATES")
    print("=" * 80)
    print(f"Found {len(results)} candidate equities meeting criteria.\n")

    if not results:
        print("No equities matched the specified screening criteria.")
        return

    print(f"{'SYMBOL':<8} {'PRICE':<9} {'ENTRY':<9} {'TARGET':<9} {'ANN ROI%':<10} {'RATING':<8} {'SOLVENCY STATUS':<26}")
    print("-" * 80)
    for c in results:
        print(
            f"{c['symbol']:<8} "
            f"${c['price']:<8.2f} "
            f"${c['benchmark_entry']:<8.2f} "
            f"${c['target_exit_price']:<8.2f} "
            f"{c['annualized_roi_pct']:>5.1f}%    "
            f"{c['thesis_status']:<8} "
            f"{c['solvency_status']:<26}"
        )
    print("=" * 80)


if __name__ == "__main__":
    main()

