#!/usr/bin/env python3
"""
scripts/manage_universe.py
Master Deterministic Universe Management & System Workflow CLI Engine.

Provides a unified command-line interface for human traders and autonomous AI agents
to query, inspect, filter, and synchronize the public equities universe and execute
deterministic system workflows:

1. List, Count, Filter & Sort Universe Equities (Multi-dimensional query engine)
2. Ingest & Cache Market Share Prices (OHLC), Daily Volume, Technicals & 52W Channels
3. Refresh SEC EDGAR XBRL Filings, ETF Constituents, Analyst Targets & Non-Price Data
4. Execute Deterministic Workflows (QC Audit, Screener, Triage, Pricing, Memory, Snapshot, Onboard, Rebuild)
"""

import argparse
import csv
import io
import json
import math
import os
import re
import subprocess
import sys
import time
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = ROOT_DIR / "scripts"
SCRIPTS_DATA_DIR = SCRIPTS_DIR / "data"
HTTP_DATA_DIR = ROOT_DIR / "http" / "data"
CONTEXT_DATA_DIR = ROOT_DIR / "context" / "data"
UNIVERSE_JSON_HTTP = HTTP_DATA_DIR / "universe.json"
UNIVERSE_JSON_CONTEXT = CONTEXT_DATA_DIR / "universe.json"
MARKET_PRICES_JSON = SCRIPTS_DATA_DIR / "market_prices.json"
COMPANY_META_JSON = SCRIPTS_DATA_DIR / "company_meta.json"

if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))


def load_master_universe():
    """Loads the master equity universe catalog from universe.json."""
    for p in [UNIVERSE_JSON_HTTP, UNIVERSE_JSON_CONTEXT]:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        return data
                    if isinstance(data, dict) and "companies" in data:
                        return data["companies"]
            except Exception as e:
                print(f"Warning: Could not load universe from {p}: {e}", file=sys.stderr)
    return []


def load_index_sets():
    """Loads constituent ticker sets for QQQ, DIA, and SPY from scripts/data/."""
    qqq_set = set()
    dia_set = set()
    spy_set = set()

    qqq_file = SCRIPTS_DATA_DIR / "qqq_holdings.json"
    if qqq_file.exists():
        try:
            with open(qqq_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                for h in data.get("holdings", []):
                    t = h.get("ticker")
                    if t:
                        qqq_set.add(t.upper())
        except Exception:
            pass

    dia_file = SCRIPTS_DATA_DIR / "dia_holdings.json"
    if dia_file.exists():
        try:
            with open(dia_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                for h in data.get("holdings", []):
                    t = h.get("ticker")
                    if t:
                        dia_set.add(t.upper())
        except Exception:
            pass

    spy_file = SCRIPTS_DATA_DIR / "spy_holdings.json"
    if spy_file.exists():
        try:
            with open(spy_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                for h in data.get("holdings", []):
                    t = h.get("ticker")
                    if t:
                        spy_set.add(t.upper())
        except Exception:
            pass

    return qqq_set, dia_set, spy_set


# ==============================================================================
# WORKFLOW 1: LIST, COUNT, FILTER & SORT EQUITIES
# ==============================================================================

def filter_equities(universe, args):
    """Applies multi-dimensional filters to the universe records."""
    qqq_set, dia_set, spy_set = load_index_sets()
    filtered = []

    target_symbols = None
    if getattr(args, "symbols", None):
        target_symbols = {s.strip().upper() for s in args.symbols}

    for item in universe:
        sym = item.get("symbol", "").upper()
        name = item.get("name", "")
        sector = item.get("sector", "")
        industry = item.get("industry", "")
        status = item.get("thesis_status", item.get("rating", "HOLD")).upper()
        triage_status = item.get("triage_status", "").upper()

        price = float(item.get("current_price", item.get("price", item.get("closing_price", 0.0))))
        roi = float(item.get("annualized_roi_pct", item.get("annualized_roi", 0.0)))
        if roi <= 0.0 and price > 0:
            target_exit = float(item.get("target_exit_price", 0.0))
            if target_exit > price:
                roi = round(((target_exit / price) ** (1.0 / 3.0) - 1.0) * 100.0, 2)

        conviction = float(item.get("conviction_score", item.get("conviction", 5.0)))
        market_cap_b = float(item.get("market_cap_b", item.get("marketCapB", 0.0)))
        if market_cap_b <= 0:
            mc_raw = float(item.get("market_cap", 0.0))
            if mc_raw > 0:
                market_cap_b = round(mc_raw / 1e9, 2)

        pe = float(item.get("pe_ratio", item.get("pe", 0.0)))
        ps = float(item.get("ps_ratio", item.get("ps", item.get("price_to_sales", 0.0))))
        revenue_b = float(item.get("ttm_revenue_b", item.get("revenue_b", 0.0)))
        if revenue_b <= 0:
            rev_raw = float(item.get("ttm_revenue", item.get("revenue", 0.0)))
            if rev_raw > 0:
                revenue_b = round(rev_raw / 1e9, 2)

        gross_margin = float(item.get("gross_margin_pct", item.get("gross_margin", 0.0)))
        debt_to_equity = float(item.get("debt_to_equity", 0.0))

        low_52w = float(item.get("fifty_two_week_low", 0.0))
        high_52w = float(item.get("fifty_two_week_high", 0.0))

        # 1. Target symbols filter
        if target_symbols and sym not in target_symbols:
            continue

        # 2. Text search query
        search_query = getattr(args, "search", None)
        if search_query:
            q = search_query.lower()
            if q not in sym.lower() and q not in name.lower() and q not in sector.lower() and q not in industry.lower():
                continue

        # 3. Status / Rating filter
        status_filter = getattr(args, "status", None)
        if status_filter:
            allowed_statuses = [s.strip().upper() for s in status_filter.split(",")]
            if status not in allowed_statuses and triage_status not in allowed_statuses:
                continue

        if getattr(args, "exclude_avoid", False) and (status == "AVOID" or triage_status == "AVOID"):
            continue

        # 4. Sector & Industry filter
        sector_filter = getattr(args, "sector", None)
        if sector_filter and sector.lower() != sector_filter.lower():
            continue

        industry_filter = getattr(args, "industry", None)
        if industry_filter and industry_filter.lower() not in industry.lower():
            continue

        # 5. Index filter
        index_filter = getattr(args, "index", None)
        if index_filter:
            idx = index_filter.upper()
            if idx in ("QQQ", "NASDAQ100", "NASDAQ-100") and sym not in qqq_set:
                continue
            elif idx in ("DIA", "DJIA", "DOW") and sym not in dia_set:
                continue
            elif idx in ("SPY", "SP500", "S&P500") and sym not in spy_set:
                continue

        # 6. Target ROI filter
        min_roi = getattr(args, "min_roi", None)
        if min_roi is not None and roi < float(min_roi):
            continue
        max_roi = getattr(args, "max_roi", None)
        if max_roi is not None and roi > float(max_roi):
            continue

        # 7. Conviction Score filter
        min_conviction = getattr(args, "min_conviction", None)
        if min_conviction is not None and conviction < float(min_conviction):
            continue
        max_conviction = getattr(args, "max_conviction", None)
        if max_conviction is not None and conviction > float(max_conviction):
            continue

        # 8. Market Cap filter (in Billions)
        min_mc = getattr(args, "min_market_cap", None)
        if min_mc is not None and market_cap_b < float(min_mc):
            continue
        max_mc = getattr(args, "max_market_cap", None)
        if max_mc is not None and market_cap_b > float(max_mc):
            continue

        # 9. Share Price filter
        min_price = getattr(args, "min_price", None)
        if min_price is not None and price < float(min_price):
            continue
        max_price = getattr(args, "max_price", None)
        if max_price is not None and price > float(max_price):
            continue

        # 10. Valuation Multiples filter
        min_pe = getattr(args, "min_pe", None)
        if min_pe is not None and (pe <= 0 or pe < float(min_pe)):
            continue
        max_pe = getattr(args, "max_pe", None)
        if max_pe is not None and (pe <= 0 or pe > float(max_pe)):
            continue

        min_ps = getattr(args, "min_ps", None)
        if min_ps is not None and (ps <= 0 or ps < float(min_ps)):
            continue
        max_ps = getattr(args, "max_ps", None)
        if max_ps is not None and (ps <= 0 or ps > float(max_ps)):
            continue

        min_rev = getattr(args, "min_revenue", None)
        if min_rev is not None and revenue_b < float(min_rev):
            continue

        min_gm = getattr(args, "min_gross_margin", None)
        if min_gm is not None and gross_margin < float(min_gm):
            continue

        max_de = getattr(args, "max_debt_equity", None)
        if max_de is not None and debt_to_equity > float(max_de):
            continue

        # 11. 52-Week Price Channels
        near_52w_low = getattr(args, "near_52w_low", None)
        if near_52w_low is not None and low_52w > 0 and price > 0:
            pct_above_low = ((price - low_52w) / low_52w) * 100.0
            if pct_above_low > float(near_52w_low):
                continue

        near_52w_high = getattr(args, "near_52w_high", None)
        if near_52w_high is not None and high_52w > 0 and price > 0:
            pct_below_high = ((high_52w - price) / high_52w) * 100.0
            if pct_below_high > float(near_52w_high):
                continue

        # Store enriched normalized attributes for sorting & formatting
        item_copy = dict(item)
        item_copy["_normalized_roi"] = roi
        item_copy["_normalized_price"] = price
        item_copy["_normalized_market_cap_b"] = market_cap_b
        item_copy["_normalized_revenue_b"] = revenue_b
        item_copy["_normalized_pe"] = pe
        item_copy["_normalized_ps"] = ps
        item_copy["_normalized_conviction"] = conviction
        item_copy["_normalized_gross_margin"] = gross_margin
        item_copy["_normalized_debt_equity"] = debt_to_equity
        item_copy["_normalized_day_change_pct"] = float(item.get("day_change_percent", item.get("day_change_pct", 0.0)))
        item_copy["_indices"] = []
        if sym in qqq_set:
            item_copy["_indices"].append("QQQ")
        if sym in dia_set:
            item_copy["_indices"].append("DIA")
        if sym in spy_set:
            item_copy["_indices"].append("SPY")

        filtered.append(item_copy)

    return filtered


def sort_equities(equities, sort_by="symbol", order="asc"):
    """Sorts the filtered equities according to requested column and order."""
    sort_key_map = {
        "symbol": lambda x: x.get("symbol", "").upper(),
        "name": lambda x: x.get("name", "").lower(),
        "roi": lambda x: x.get("_normalized_roi", 0.0),
        "target_roi": lambda x: x.get("_normalized_roi", 0.0),
        "price": lambda x: x.get("_normalized_price", 0.0),
        "market_cap": lambda x: x.get("_normalized_market_cap_b", 0.0),
        "ev": lambda x: float(x.get("enterprise_value_b", x.get("enterpriseValueB", x.get("_normalized_market_cap_b", 0.0)))),
        "revenue": lambda x: x.get("_normalized_revenue_b", 0.0),
        "pe": lambda x: x.get("_normalized_pe", 9999.0 if order == "asc" else -1.0),
        "ps": lambda x: x.get("_normalized_ps", 9999.0 if order == "asc" else -1.0),
        "gross_margin": lambda x: x.get("_normalized_gross_margin", 0.0),
        "debt_equity": lambda x: x.get("_normalized_debt_equity", 0.0),
        "day_change": lambda x: x.get("_normalized_day_change_pct", 0.0),
        "conviction": lambda x: x.get("_normalized_conviction", 0.0),
        "sector": lambda x: x.get("sector", "").lower(),
        "status": lambda x: x.get("thesis_status", "HOLD").upper(),
    }

    key_func = sort_key_map.get(sort_by.lower(), sort_key_map["symbol"])
    reverse = (order.lower() == "desc")
    return sorted(equities, key=key_func, reverse=reverse)


def format_equities_output(equities, total_universe_count, args):
    """Formats and prints the sorted and filtered list of equities."""
    out_format = getattr(args, "format", "table").lower()
    limit = getattr(args, "limit", None)

    displayed = equities[:limit] if limit and limit > 0 else equities

    if getattr(args, "count_only", False):
        print(f"Total matching equities: {len(equities)} (of {total_universe_count} in universe)")
        return

    if out_format == "symbols":
        print(" ".join([e.get("symbol", "") for e in displayed]))
        return

    if out_format == "json":
        clean_list = []
        for e in displayed:
            c = {k: v for k, v in e.items() if not k.startswith("_")}
            clean_list.append(c)
        print(json.dumps({
            "total_count": len(equities),
            "universe_count": total_universe_count,
            "displayed_count": len(displayed),
            "equities": clean_list
        }, indent=2))
        return

    if out_format == "csv":
        out = io.StringIO()
        writer = csv.writer(out)
        writer.writerow(["Symbol", "Company Name", "Sector", "Status", "Price", "Target ROI %", "Market Cap ($B)", "TTM Rev ($B)", "P/E", "P/S", "Conviction", "Indices"])
        for e in displayed:
            writer.writerow([
                e.get("symbol", ""),
                e.get("name", ""),
                e.get("sector", ""),
                e.get("thesis_status", "HOLD"),
                f"{e.get('_normalized_price', 0.0):.2f}",
                f"{e.get('_normalized_roi', 0.0):.1f}%",
                f"{e.get('_normalized_market_cap_b', 0.0):.2f}",
                f"{e.get('_normalized_revenue_b', 0.0):.2f}",
                f"{e.get('_normalized_pe', 0.0):.1f}" if e.get('_normalized_pe', 0.0) > 0 else "N/A",
                f"{e.get('_normalized_ps', 0.0):.1f}" if e.get('_normalized_ps', 0.0) > 0 else "N/A",
                f"{e.get('_normalized_conviction', 0.0):.1f}",
                ",".join(e.get("_indices", []))
            ])
        print(out.getvalue().strip())
        return

    if out_format == "compact":
        for i, e in enumerate(displayed, 1):
            sym = e.get("symbol", "")
            name = e.get("name", "")[:26]
            sector = e.get("sector", "")[:15]
            status = e.get("thesis_status", "HOLD")
            price = e.get("_normalized_price", 0.0)
            roi = e.get("_normalized_roi", 0.0)
            mc = e.get("_normalized_market_cap_b", 0.0)
            idxs = "/".join(e.get("_indices", [])) or "---"
            print(f"[{i:3d}] {sym:5s} | {name:26s} | {sector:15s} | {status:4s} | ${price:7.2f} | ROI: {roi:5.1f}% | MC: ${mc:6.1f}B | {idxs}")
        print(f"\nTotal: {len(equities)} matching (Universe total: {total_universe_count})")
        return

    # Default: Rich ASCII Table
    header = f"{'#':>3}  {'SYM':<5}  {'COMPANY NAME':<24}  {'SECTOR':<18}  {'STATUS':<6}  {'PRICE':>8}  {'ROI (%)':>8}  {'MCAP($B)':>9}  {'REV($B)':>8}  {'P/E':>6}  {'P/S':>6}  {'INDICES':<7}"
    divider = "-" * len(header)

    print("\n" + divider)
    print(f"  EQUITY UNIVERSE EXPLORER - MATCHED {len(equities)} OF {total_universe_count} COMPANIES")
    print(divider)
    print(header)
    print(divider)

    for i, e in enumerate(displayed, 1):
        sym = e.get("symbol", "")
        name = e.get("name", "")[:24]
        sector = e.get("sector", "")[:18]
        status = e.get("thesis_status", "HOLD")[:6]
        price = f"${e.get('_normalized_price', 0.0):.2f}"
        roi = f"{e.get('_normalized_roi', 0.0):.1f}%"
        mc = f"${e.get('_normalized_market_cap_b', 0.0):.1f}"
        rev = f"${e.get('_normalized_revenue_b', 0.0):.1f}"
        pe_val = e.get("_normalized_pe", 0.0)
        pe = f"{pe_val:.1f}" if pe_val > 0 else "-"
        ps_val = e.get("_normalized_ps", 0.0)
        ps = f"{ps_val:.1f}" if ps_val > 0 else "-"
        indices = ",".join(e.get("_indices", []))[:7] or "-"

        print(f"{i:3d}  {sym:<5}  {name:<24}  {sector:<18}  {status:<6}  {price:>8}  {roi:>8}  {mc:>9}  {rev:>8}  {pe:>6}  {ps:>6}  {indices:<7}")

    print(divider)

    # Summary Statistics
    if equities:
        avg_roi = sum(e.get("_normalized_roi", 0.0) for e in equities) / len(equities)
        avg_mc = sum(e.get("_normalized_market_cap_b", 0.0) for e in equities) / len(equities)
        status_counts = {}
        for e in equities:
            st = e.get("thesis_status", "HOLD").upper()
            status_counts[st] = status_counts.get(st, 0) + 1
        status_str = " | ".join([f"{k}: {v}" for k, v in sorted(status_counts.items())])

        print(f"Summary: Total {len(equities)} equities | Avg Target ROI: {avg_roi:.1f}% | Avg MCap: ${avg_mc:.1f}B")
        print(f"Rating Distribution: {status_str}")
        if limit and len(equities) > limit:
            print(f"(Display limited to top {limit} entries. Use --limit 0 or --format to view all)")
    print(divider + "\n")


def execute_list_command(args):
    """Handler for 'list' subcommand."""
    universe = load_master_universe()
    if not universe:
        print("Error: Universe dataset is empty or missing. Run build_universe_json.py first.", file=sys.stderr)
        return 1

    filtered = filter_equities(universe, args)
    sort_by = getattr(args, "sort_by", "symbol")
    order = getattr(args, "order", "asc")

    # If sorting by ROI or market cap and order was not explicitly specified, default to desc
    if sort_by.lower() in ("roi", "target_roi", "market_cap", "ev", "revenue", "conviction", "day_change") and not getattr(args, "order_specified", False):
        order = "desc"

    sorted_list = sort_equities(filtered, sort_by=sort_by, order=order)
    format_equities_output(sorted_list, len(universe), args)
    return 0


# ==============================================================================
# WORKFLOW 2: UPDATE MARKET SHARE PRICES (OHLC) & TRADING VOLUME
# ==============================================================================

def execute_update_prices_command(args):
    """Handler for 'update-prices' subcommand."""
    fetch_market_prices_script = SCRIPTS_DIR / "fetch_market_prices.py"
    if not fetch_market_prices_script.exists():
        print(f"Error: {fetch_market_prices_script} not found.", file=sys.stderr)
        return 1

    cmd = [sys.executable, str(fetch_market_prices_script)]

    if getattr(args, "verify", False) or getattr(args, "offline", False):
        # Offline verification
        cmd.append("--offline")
    else:
        # Default for update-prices is live sync
        cmd.append("--live")

    if getattr(args, "symbols", None):
        cmd.extend(["--symbols"] + args.symbols)

    if getattr(args, "archive", False):
        cmd.append("--archive")

    print(f"Executing: {' '.join(cmd)}")
    res = subprocess.run(cmd, cwd=str(ROOT_DIR))
    if res.returncode != 0:
        return res.returncode

    # If prices were updated live, trigger universe.json price sync
    if "--live" in cmd:
        print("\nSynchronizing master universe.json with freshly cached prices...")
        build_universe_script = SCRIPTS_DIR / "build_universe_json.py"
        if build_universe_script.exists():
            subprocess.run([sys.executable, str(build_universe_script)], cwd=str(ROOT_DIR))

    return 0


# ==============================================================================
# WORKFLOW 3: REFRESH SEC DATA & NON-PRICE DATASETS
# ==============================================================================

def execute_refresh_sec_command(args):
    """Handler for 'refresh-sec' subcommand."""
    print("================================================================================")
    print("  REFRESHING SEC EDGAR XBRL & NON-PRICE REGULATORY INTELLIGENCE")
    print("================================================================================")

    target_symbols = getattr(args, "symbols", None)
    refresh_all = getattr(args, "all", False)
    filings_calendar = getattr(args, "filings_calendar", False)
    etf_holdings = getattr(args, "etf_holdings", False)
    analysts = getattr(args, "analysts", False)
    off_balance_sheet = getattr(args, "off_balance_sheet", False)
    rebuild_catalog = getattr(args, "rebuild_catalog", False)

    # If no specific sub-dataset was flagged, perform standard SEC fetch
    if not (filings_calendar or etf_holdings or analysts or off_balance_sheet or rebuild_catalog):
        fetch_sec_script = SCRIPTS_DIR / "fetch_sec.py"
        cmd = [sys.executable, str(fetch_sec_script)]
        if getattr(args, "live", True):
            cmd.append("--live")
        if target_symbols:
            cmd.extend(["--symbols"] + target_symbols)
        print(f"\n[Step 1/1] Fetching SEC EDGAR XBRL statements: {' '.join(cmd)}")
        res = subprocess.run(cmd, cwd=str(ROOT_DIR))
        if res.returncode != 0:
            print("Warning: fetch_sec.py encountered issues.", file=sys.stderr)

    if refresh_all or etf_holdings:
        fetch_etf_script = SCRIPTS_DIR / "fetch_etf_holdings.py"
        if fetch_etf_script.exists():
            print("\nRefreshing ETF constituent holdings (QQQ, DIA, SPY) from SEC Form NPORT-P...")
            subprocess.run([sys.executable, str(fetch_etf_script)], cwd=str(ROOT_DIR))

    if refresh_all or analysts:
        fetch_analysts_script = SCRIPTS_DIR / "fetch_analyst_targets.py"
        build_registry_script = SCRIPTS_DIR / "build_analyst_registry.py"
        if fetch_analysts_script.exists():
            print("\nRefreshing sell-side analyst price targets...")
            subprocess.run([sys.executable, str(fetch_analysts_script), "--live"], cwd=str(ROOT_DIR))
        if build_registry_script.exists():
            print("Rebuilding analyst coverage registry...")
            subprocess.run([sys.executable, str(build_registry_script)], cwd=str(ROOT_DIR))

    if refresh_all or off_balance_sheet:
        obs_script = SCRIPTS_DIR / "build_off_balance_sheet_data.py"
        if obs_script.exists():
            print("\nCompiling off-balance sheet liabilities and commitments...")
            subprocess.run([sys.executable, str(obs_script)], cwd=str(ROOT_DIR))

    if refresh_all or filings_calendar:
        anticipate_sec_script = SCRIPTS_DIR / "anticipate_sec_filings.py"
        if anticipate_sec_script.exists():
            print("\nRebuilding statutory 10-Q/10-K filing deadline calendar...")
            subprocess.run([sys.executable, str(anticipate_sec_script)], cwd=str(ROOT_DIR))

    if refresh_all or rebuild_catalog or not (filings_calendar or etf_holdings or analysts or off_balance_sheet):
        build_universe_script = SCRIPTS_DIR / "build_universe_json.py"
        if build_universe_script.exists():
            print("\nRe-synthesizing master universe catalog (http/data/universe.json)...")
            subprocess.run([sys.executable, str(build_universe_script)], cwd=str(ROOT_DIR))

        # Check for build_sec_data.js (if Node is present)
        build_sec_js = SCRIPTS_DIR / "build_sec_data.js"
        if build_sec_js.exists():
            try:
                subprocess.run(["node", str(build_sec_js)], cwd=str(ROOT_DIR), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception:
                pass

    print("\nSEC & non-price dataset refresh complete.")
    return 0


# ==============================================================================
# WORKFLOW 4: OTHER DETERMINISTIC CLI WORKFLOWS
# ==============================================================================

def execute_audit_command(args):
    """Handler for 'audit' / 'qc' subcommand."""
    qc_script = SCRIPTS_DIR / "quality_control.py"
    cmd = [sys.executable, str(qc_script)]
    if getattr(args, "fix", False):
        cmd.append("--fix")
    else:
        cmd.append("--audit")
    if getattr(args, "symbols", None):
        cmd.extend(["--symbols"] + args.symbols)
    return subprocess.run(cmd, cwd=str(ROOT_DIR)).returncode


def execute_screen_command(args):
    """Handler for 'screen' subcommand."""
    screen_script = SCRIPTS_DIR / "screen_market.py"
    cmd = [sys.executable, str(screen_script)]
    if getattr(args, "min_roi", None) is not None:
        cmd.extend(["--min-roi", str(args.min_roi)])
    if getattr(args, "sector", None):
        cmd.extend(["--sector", args.sector])
    if getattr(args, "exclude_avoid", False):
        cmd.append("--exclude-avoid")
    if getattr(args, "limit", None):
        cmd.extend(["--limit", str(args.limit)])
    if getattr(args, "json", False):
        cmd.append("--json")
    if getattr(args, "summary", False):
        cmd.append("--summary")
    return subprocess.run(cmd, cwd=str(ROOT_DIR)).returncode


def execute_triage_command(args):
    """Handler for 'triage' subcommand."""
    triage_script = SCRIPTS_DIR / "triage_universe.py"
    cmd = [sys.executable, str(triage_script)]
    if getattr(args, "symbol", None):
        cmd.extend(["--symbol", args.symbol])
    if getattr(args, "symbols", None):
        cmd.extend(["--symbols"] + args.symbols)
    if getattr(args, "summary", False):
        cmd.append("--summary")
    if getattr(args, "min_gross_margin", None):
        cmd.extend(["--min-gross-margin", str(args.min_gross_margin)])
    if getattr(args, "max_dilution", None):
        cmd.extend(["--max-dilution", str(args.max_dilution)])
    if getattr(args, "max_debt_equity", None):
        cmd.extend(["--max-debt-to-equity", str(args.max_debt_equity)])
    return subprocess.run(cmd, cwd=str(ROOT_DIR)).returncode


# The experimental program's scripts each own their own argument contract.
# This maps a memorable subcommand onto the script and passes the remaining
# arguments straight through, so the CLI cannot drift out of step with the
# script it fronts.
EXPERIMENT_SUBCOMMANDS = {
    "freeze": ("freeze_experiment.py", "Freeze an immutable weekly snapshot of inputs, proposals, and hashes."),
    "freeze-forecast": ("freeze_forecast.py", "Freeze a scenario forecast before its outcome can be observed."),
    "score": ("score_experiment.py", "Score a frozen forecast against the outcome that followed it."),
    "record-execution": ("record_execution.py", "Record one immutable private execution event per file."),
    "record-performance": ("record_performance.py", "Record a private account performance snapshot."),
    "reconcile": ("reconcile_accounts.py", "Reconcile one account between two portfolio snapshots."),
    "security-master": ("build_security_master.py", "Build a dated security-master snapshot from SEC and Nasdaq listings."),
    "archive-chain": ("archive_option_chain.py", "Archive a delayed Cboe option chain as an immutable snapshot."),
    "check-claims": ("check_experimental_claims.py", "Fail when repository text makes prohibited non-experimental claims."),
}


def execute_experiment_command(args):
    """Handler for the 'experiment' subcommand family."""
    command = getattr(args, "experiment_command", None)
    if not command:
        print("Specify an experiment subcommand. Available:")
        print("")
        for name, (script, help_text) in sorted(EXPERIMENT_SUBCOMMANDS.items()):
            print(f"  {name:18s} {help_text}")
            print(f"  {'':18s} (scripts/{script})")
        return 1

    script_name, _ = EXPERIMENT_SUBCOMMANDS[command]
    cmd = [sys.executable, str(SCRIPTS_DIR / script_name)]
    cmd.extend(getattr(args, "experiment_args", None) or [])
    return subprocess.run(cmd, cwd=str(ROOT_DIR)).returncode


def execute_pricing_command(args):
    """Handler for 'pricing' subcommand."""
    pricing_script = SCRIPTS_DIR / "calculate_pricing.py"
    cmd = [sys.executable, str(pricing_script)]
    # Pass all trailing pricing arguments directly
    if getattr(args, "pricing_args", None):
        cmd.extend(args.pricing_args)
    return subprocess.run(cmd, cwd=str(ROOT_DIR)).returncode


def execute_onboard_command(args):
    """Handler for 'onboard' subcommand."""
    onboard_script = SCRIPTS_DIR / "onboard_company.py"
    cmd = [sys.executable, str(onboard_script)]
    if getattr(args, "symbol", None):
        cmd.extend(["--symbol", args.symbol])
    if getattr(args, "symbols", None):
        cmd.extend(["--symbols"] + args.symbols)
    if getattr(args, "screen", False):
        cmd.append("--screen")
    if getattr(args, "min_roi", None):
        cmd.extend(["--min-roi", str(args.min_roi)])
    if getattr(args, "sector", None):
        cmd.extend(["--sector", args.sector])
    if getattr(args, "limit", None):
        cmd.extend(["--limit", str(args.limit)])
    if getattr(args, "live", False):
        cmd.append("--live")
    if getattr(args, "offline", False):
        cmd.append("--offline")
    return subprocess.run(cmd, cwd=str(ROOT_DIR)).returncode


def execute_memory_command(args):
    """Handler for 'memory' subcommand."""
    memory_script = SCRIPTS_DIR / "manage_memory.py"
    cmd = [sys.executable, str(memory_script)]
    if getattr(args, "symbol", None):
        cmd.extend(["--symbol", args.symbol])
    if getattr(args, "invalidations_only", False):
        cmd.append("--invalidations-only")
    if getattr(args, "catalysts_only", False):
        cmd.append("--catalysts-only")
    if getattr(args, "json", False):
        cmd.append("--json")
    return subprocess.run(cmd, cwd=str(ROOT_DIR)).returncode


def execute_snapshot_command(args):
    """Handler for 'snapshot' subcommand."""
    snapshot_script = SCRIPTS_DIR / "parse_snapshot.py"
    cmd = [sys.executable, str(snapshot_script)]
    if getattr(args, "demo", False):
        cmd.append("--demo")
    if getattr(args, "json", False):
        cmd.append("--json")
    if getattr(args, "file", None):
        cmd.extend(["--file", args.file])
    return subprocess.run(cmd, cwd=str(ROOT_DIR)).returncode


def execute_gaps_command(args):
    """Handler for the research authoring queue.

    Delegates to scripts/research_gaps.py so the report has one implementation.
    Exits non-zero when gaps exist, matching that script's contract.
    """
    cmd = [sys.executable, str(SCRIPTS_DIR / "research_gaps.py")]
    if getattr(args, "symbol", None):
        cmd += ["--symbol"] + list(args.symbol)
    if getattr(args, "role", None):
        cmd += ["--role", args.role]
    if getattr(args, "field", None):
        cmd += ["--field"] + list(args.field)
    if getattr(args, "thesis_only", False):
        cmd.append("--thesis-only")
    if getattr(args, "summary", False):
        cmd.append("--summary")
    if getattr(args, "by_symbol", False):
        cmd.append("--by-symbol")
    if getattr(args, "format", "text") != "text":
        cmd += ["--format", args.format]
    return subprocess.run(cmd, cwd=str(ROOT_DIR)).returncode


def execute_rebuild_all_command(args):
    """Handler for Cadence 6 full ground-truth rebuild."""
    print("================================================================================")
    print("  CADENCE 6: FULL GROUND-TRUTH REBUILD & RECONCILIATION PIPELINE")
    print("================================================================================")
    print("Rebuilding entire intelligence layer from Tier 1 primary sources...\n")

    steps = [
        ("Step 1/7: Fetching Tier 1 SEC EDGAR XBRL Statements", [sys.executable, str(SCRIPTS_DIR / "fetch_sec.py"), "--live"]),
        ("Step 2/7: Synchronizing ETF Constituents from SEC Form NPORT-P", [sys.executable, str(SCRIPTS_DIR / "fetch_etf_holdings.py")]),
        ("Step 3/7: Ingesting Live Market Prices & 52W Channels", [sys.executable, str(SCRIPTS_DIR / "fetch_market_prices.py"), "--live", "--archive"]),
        ("Step 4/7: Refreshing Sell-Side Analyst Targets & Registry", [sys.executable, str(SCRIPTS_DIR / "fetch_analyst_targets.py"), "--live"]),
        ("Step 5/8: Propagating Authored Off-Balance Sheet Audits", [sys.executable, str(SCRIPTS_DIR / "build_off_balance_sheet_data.py")]),
        ("Step 6/8: Rebuilding SEC Filing Deadlines Calendar", [sys.executable, str(SCRIPTS_DIR / "anticipate_sec_filings.py")]),
        ("Step 7/8: Re-synthesizing Master Universe Catalog", [sys.executable, str(SCRIPTS_DIR / "build_universe_json.py")]),
        ("Step 8/8: Reporting Outstanding Research Authoring Queue", [sys.executable, str(SCRIPTS_DIR / "research_gaps.py"), "--summary"]),
    ]

    for title, cmd in steps:
        print(f"\n>>> {title}")
        res = subprocess.run(cmd, cwd=str(ROOT_DIR))
        if res.returncode != 0:
            print(f"Warning: Step failed with code {res.returncode}. Continuing pipeline...", file=sys.stderr)

    print("\n>>> Executing Quality Control Ground-Truth Audit...")
    qc_res = subprocess.run([sys.executable, str(SCRIPTS_DIR / "quality_control.py"), "--audit"], cwd=str(ROOT_DIR))

    print("\n================================================================================")
    print("  CADENCE 6 REBUILD COMPLETE")
    print("================================================================================")
    return qc_res.returncode


def _delegate_script(script_name, command, args, flag_map=None):
    """Forward a subcommand to a scripts/*.py CLI."""
    cmd = [sys.executable, str(SCRIPTS_DIR / script_name), command]
    flag_map = flag_map or {}
    for attr, flag in flag_map.items():
        value = getattr(args, attr, None)
        if value is None or value is False or value == []:
            continue
        if isinstance(value, bool):
            cmd.append(flag)
        elif isinstance(value, list):
            cmd.extend([flag] + list(value))
        else:
            cmd.extend([flag, str(value)])
    return subprocess.run(cmd, cwd=str(ROOT_DIR)).returncode


def execute_ledger_command(args):
    """Handler for 'ledger' subcommand — delegates to activity_ledger.py."""
    if not args.ledger_command:
        print("Usage: manage_universe.py ledger <summary|validate|render-index|list-runs|query|start-run|end-run|abort-run|log-event>")
        return 1
    flag_map = {
        "limit": "--limit",
        "run_id": "--run-id",
        "symbol": "--symbol",
        "event_type": "--event-type",
        "format": "--format",
        "cadence": "--cadence",
        "trigger": "--trigger",
        "agents": "--agents",
        "prompt": "--prompt",
        "signature": "--signature",
        "summary": "--summary",
        "deliverable": "--deliverable",
        "type": "--type",
        "agent": "--agent",
        "subject": "--subject",
        "target_path": "--target-path",
        "rationale": "--rationale",
        "change": "--change",
        "authority_tier": "--authority-tier",
        "source_locator": "--source-locator",
        "related_ids": "--related-ids",
    }
    return _delegate_script("activity_ledger.py", args.ledger_command, args, flag_map)


def execute_errata_command(args):
    """Handler for 'errata' subcommand — delegates to errata_log.py."""
    if not args.errata_command:
        print("Usage: manage_universe.py errata <summary|validate|render-index|list|query|record|update-status>")
        return 1
    flag_map = {
        "status": "--status",
        "limit": "--limit",
        "symbol": "--symbol",
        "format": "--format",
        "target_file": "--target-file",
        "field": "--field",
        "issue": "--issue",
        "correction": "--correction",
        "authority_tier": "--authority-tier",
        "source_locator": "--source-locator",
        "related_run": "--related-run",
        "erratum_id": "--erratum-id",
        "resolution_note": "--resolution-note",
    }
    return _delegate_script("errata_log.py", args.errata_command, args, flag_map)


# ==============================================================================
# CLI ARGUMENT PARSER & ENTRY POINT
# ==============================================================================

def build_cli_parser():
    parser = argparse.ArgumentParser(
        prog="manage_universe.py",
        description="Master Deterministic CLI Engine for the Public Equity Universe & System Workflows.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
EXAMPLES:
  # 1. List, Count & Filter Universe Equities
  python scripts/manage_universe.py list
  python scripts/manage_universe.py list --status BUY --min-roi 20.0
  python scripts/manage_universe.py list --sector Technology --sort-by roi --limit 15
  python scripts/manage_universe.py list --index QQQ --format symbols
  python scripts/manage_universe.py list --count-only
  python scripts/manage_universe.py list --near-52w-low 15 --format compact

  # 2. Ingest Live Market Share Prices (OHLC) & Trading Volume
  python scripts/manage_universe.py update-prices --live
  python scripts/manage_universe.py update-prices --symbols NVDA AAPL MSFT TSLA
  python scripts/manage_universe.py update-prices --verify

  # 3. Refresh SEC Filings & Non-Price Data
  python scripts/manage_universe.py refresh-sec --live
  python scripts/manage_universe.py refresh-sec --all
  python scripts/manage_universe.py refresh-sec --filings-calendar
  python scripts/manage_universe.py refresh-sec --etf-holdings

  # 4. Deterministic System Workflows
  python scripts/manage_universe.py audit
  python scripts/manage_universe.py gaps --summary
  python scripts/manage_universe.py screen --min-roi 20.0 --limit 10
  python scripts/manage_universe.py triage --summary
  python scripts/manage_universe.py pricing option --stock-price 125.0 --strike 120.0 --dte 35 --type put
  python scripts/manage_universe.py memory
  python scripts/manage_universe.py snapshot --demo
  python scripts/manage_universe.py onboard --symbol CRWD --live
  python scripts/manage_universe.py rebuild-all
"""
    )

    # Convenience top-level shortcut flags
    parser.add_argument("--count", action="store_true", help="Print the total count of equities in the master universe and exit.")
    parser.add_argument("--list", action="store_true", help="Shortcut to list all universe equities with default formatting.")
    parser.add_argument("--update-prices", action="store_true", help="Shortcut to run live market price & volume synchronization.")
    parser.add_argument("--refresh-sec", action="store_true", help="Shortcut to run live SEC EDGAR XBRL data refresh.")
    parser.add_argument("--audit", action="store_true", help="Shortcut to run deterministic quality control audit.")
    parser.add_argument("--rebuild-all", action="store_true", help="Shortcut to execute full Cadence 6 ground-truth rebuild.")

    subparsers = parser.add_subparsers(dest="subcommand", help="Available subcommands")

    # 1. 'list' subcommand
    list_parser = subparsers.add_parser("list", help="Count, search, filter, and sort public equities in the universe.")
    list_parser.add_argument("--status", type=str, help="Filter by rating/status (e.g. BUY, HOLD, SELL, AVOID). Comma-separated.")
    list_parser.add_argument("--exclude-avoid", action="store_true", help="Exclude AVOID / value trap stocks.")
    list_parser.add_argument("--sector", type=str, help="Filter by sector name (e.g. Technology, Healthcare, Industrials).")
    list_parser.add_argument("--industry", type=str, help="Filter by industry substring.")
    list_parser.add_argument("--index", type=str, choices=["QQQ", "DIA", "SP500", "SPY"], help="Filter by index constituent membership.")
    list_parser.add_argument("--symbols", nargs="+", help="Filter for specific ticker symbols.")
    list_parser.add_argument("--search", type=str, help="Search ticker, company name, sector, or industry by substring.")
    list_parser.add_argument("--min-roi", type=float, help="Minimum annualized target ROI percentage (e.g. 20.0).")
    list_parser.add_argument("--max-roi", type=float, help="Maximum annualized target ROI percentage.")
    list_parser.add_argument("--min-conviction", type=float, help="Minimum conviction score (1.0 to 10.0).")
    list_parser.add_argument("--max-conviction", type=float, help="Maximum conviction score (1.0 to 10.0).")
    list_parser.add_argument("--min-market-cap", type=float, help="Minimum market capitalization in $B.")
    list_parser.add_argument("--max-market-cap", type=float, help="Maximum market capitalization in $B.")
    list_parser.add_argument("--min-price", type=float, help="Minimum current share price.")
    list_parser.add_argument("--max-price", type=float, help="Maximum current share price.")
    list_parser.add_argument("--min-pe", type=float, help="Minimum trailing P/E ratio.")
    list_parser.add_argument("--max-pe", type=float, help="Maximum trailing P/E ratio.")
    list_parser.add_argument("--min-ps", type=float, help="Minimum Price to Sales ratio.")
    list_parser.add_argument("--max-ps", type=float, help="Maximum Price to Sales ratio.")
    list_parser.add_argument("--min-revenue", type=float, help="Minimum TTM revenue in $B.")
    list_parser.add_argument("--min-gross-margin", type=float, help="Minimum gross margin percentage.")
    list_parser.add_argument("--max-debt-equity", type=float, help="Maximum debt to equity ratio.")
    list_parser.add_argument("--near-52w-low", type=float, help="Filter to stocks within X%% of their 52-week low.")
    list_parser.add_argument("--near-52w-high", type=float, help="Filter to stocks within X%% of their 52-week high.")
    list_parser.add_argument("--sort-by", type=str, default="symbol", choices=[
        "symbol", "name", "roi", "target_roi", "price", "market_cap", "ev", "revenue",
        "pe", "ps", "gross_margin", "debt_equity", "day_change", "conviction", "sector", "status"
    ], help="Column to sort by (default: symbol).")
    list_parser.add_argument("--order", type=str, default="asc", choices=["asc", "desc"], help="Sort direction (asc or desc).")
    list_parser.add_argument("--limit", "-n", type=int, default=0, help="Maximum rows to display (0 for all).")
    list_parser.add_argument("--format", type=str, default="table", choices=["table", "compact", "json", "csv", "symbols"], help="Output display format.")
    list_parser.add_argument("--count-only", action="store_true", help="Output only the count of matching equities.")

    # 2. 'update-prices' subcommand
    price_parser = subparsers.add_parser("update-prices", help="Synchronize live share prices (OHLC), volume, and 52W ranges.")
    price_parser.add_argument("--live", action="store_true", help="Ingest live market prices from exchange feeds.")
    price_parser.add_argument("--verify", action="store_true", help="Run offline verification of cached prices without network requests.")
    price_parser.add_argument("--offline", action="store_true", help="Alias for --verify.")
    price_parser.add_argument("--symbols", nargs="+", help="Specific ticker symbols to update.")
    price_parser.add_argument("--archive", action="store_true", help="Rebuild historical 18-month price archive.")

    # 3. 'refresh-sec' subcommand
    sec_parser = subparsers.add_parser("refresh-sec", help="Refresh SEC EDGAR XBRL filings and non-price intelligence datasets.")
    sec_parser.add_argument("--live", action="store_true", help="Fetch fresh XBRL facts from SEC EDGAR API.")
    sec_parser.add_argument("--symbols", nargs="+", help="Specific ticker symbols to fetch.")
    sec_parser.add_argument("--all", action="store_true", help="Refresh all non-price datasets (SEC, ETF holdings, analysts, filings calendar, off-balance sheet).")
    sec_parser.add_argument("--filings-calendar", action="store_true", help="Rebuild statutory 10-Q/10-K filing deadline calendar.")
    sec_parser.add_argument("--etf-holdings", action="store_true", help="Refresh QQQ, DIA, and SPY constituent holdings from Form NPORT-P.")
    sec_parser.add_argument("--analysts", action="store_true", help="Refresh sell-side analyst targets & coverage registry.")
    sec_parser.add_argument("--off-balance-sheet", action="store_true", help="Compile off-balance sheet liabilities and commitments.")
    sec_parser.add_argument("--rebuild-catalog", action="store_true", help="Re-synthesize master universe catalog (http/data/universe.json).")

    # 4. 'audit' / 'qc' subcommand
    audit_parser = subparsers.add_parser("audit", help="Run deterministic quality control audit across datasets.")
    audit_parser.add_argument("--fix", action="store_true", help="Automatically fix recoverable data errors.")
    audit_parser.add_argument("--symbols", nargs="+", help="Specific ticker symbols to audit.")

    # 5. 'screen' subcommand
    screen_parser = subparsers.add_parser("screen", help="Screen market for high-conviction >= 20%% annualized ROI compounders.")
    screen_parser.add_argument("--min-roi", type=float, default=20.0, help="Minimum annualized ROI percentage (default: 20.0).")
    screen_parser.add_argument("--sector", type=str, help="Target sector filter.")
    screen_parser.add_argument("--exclude-avoid", action="store_true", default=True, help="Exclude AVOID value traps.")
    screen_parser.add_argument("--limit", type=int, default=10, help="Number of candidate records to display.")
    screen_parser.add_argument("--json", action="store_true", help="Output results as structured JSON.")
    screen_parser.add_argument("--summary", action="store_true", help="Print summary table.")

    # 6. 'triage' subcommand
    triage_parser = subparsers.add_parser("triage", help="Run Stage 1 lightweight triage on universe equities.")
    triage_parser.add_argument("--symbol", type=str, help="Single symbol to evaluate.")
    triage_parser.add_argument("--symbols", nargs="+", help="List of symbols to evaluate.")
    triage_parser.add_argument("--summary", action="store_true", help="Print triage status summary table.")
    triage_parser.add_argument("--min-gross-margin", type=float, default=15.0, help="Minimum gross margin threshold.")
    triage_parser.add_argument("--max-dilution", type=float, default=4.0, help="Maximum annual dilution threshold.")
    triage_parser.add_argument("--max-debt-equity", type=float, default=4.0, help="Maximum debt to equity threshold.")

    # 7. 'pricing' subcommand
    pricing_parser = subparsers.add_parser("pricing", help="Calculate Black-Scholes options pricing, Greeks, AROC, and limit orders.")
    pricing_parser.add_argument("pricing_args", nargs=argparse.REMAINDER, help="Arguments passed directly to calculate_pricing.py (e.g. option --stock-price 125 --strike 120 --dte 35 --type put).")

    # 8. 'onboard' subcommand
    onboard_parser = subparsers.add_parser("onboard", help="Onboard single, batch, or screened equities into universe coverage.")
    onboard_parser.add_argument("--symbol", type=str, help="Single stock symbol to onboard.")
    onboard_parser.add_argument("--symbols", nargs="+", help="Multiple stock symbols to onboard in batch.")
    onboard_parser.add_argument("--screen", action="store_true", help="Auto-screen and onboard candidates passing Stage 1 triage and 20%%+ ROI.")
    onboard_parser.add_argument("--min-roi", type=float, default=20.0, help="Minimum ROI for screened onboarding.")
    onboard_parser.add_argument("--sector", type=str, help="Sector filter for screened onboarding.")
    onboard_parser.add_argument("--limit", type=int, default=3, help="Max equities to onboard when screening.")
    onboard_parser.add_argument("--live", action="store_true", default=True, help="Use live SEC and exchange market feeds.")
    onboard_parser.add_argument("--offline", action="store_true", help="Use cached offline data without network requests.")

    # 9. 'memory' subcommand
    memory_parser = subparsers.add_parser("memory", help="Audit institutional memory, catalyst milestones, and invalidation triggers.")
    memory_parser.add_argument("--symbol", type=str, help="Specific symbol to inspect.")
    memory_parser.add_argument("--invalidations-only", action="store_true", help="Display only active invalidation triggers.")
    memory_parser.add_argument("--catalysts-only", action="store_true", help="Display upcoming catalyst milestones.")
    memory_parser.add_argument("--json", action="store_true", help="Output results in JSON format.")

    # 10. 'snapshot' subcommand
    snapshot_parser = subparsers.add_parser("snapshot", help="Parse brokerage portfolio snapshots and calculate dry powder.")
    snapshot_parser.add_argument("--demo", action="store_true", help="Parse synthetic demo brokerage snapshot.")
    snapshot_parser.add_argument("--json", action="store_true", help="Output normalized portfolio state as JSON.")
    snapshot_parser.add_argument("--file", type=str, help="Specific snapshot file path to parse.")

    # 11. 'gaps' subcommand
    gaps_parser = subparsers.add_parser(
        "gaps", help="Report which agent-authored research each universe equity is missing.")
    gaps_parser.add_argument("--symbol", nargs="+", help="Restrict to specific symbols.")
    gaps_parser.add_argument("--role", type=str, help="Restrict to one owning agent role.")
    gaps_parser.add_argument("--field", nargs="+", help="Restrict to specific research fields.")
    gaps_parser.add_argument("--thesis-only", action="store_true",
                             help="Report only the fields a thesis dossier requires.")
    gaps_parser.add_argument("--summary", action="store_true", help="One line per field.")
    gaps_parser.add_argument("--by-symbol", action="store_true", help="Group the report by equity.")
    gaps_parser.add_argument("--format", choices=["text", "json"], default="text")

    # 12. 'rebuild-all' subcommand
    subparsers.add_parser("rebuild-all", help="Execute Cadence 6 full ground-truth source regeneration across all tiers.")

    # 13. 'ledger' subcommand
    ledger_parser = subparsers.add_parser("ledger", help="Agent run log CLI (context/research/runs/).")
    ledger_sub = ledger_parser.add_subparsers(dest="ledger_command")
    ledger_sub.add_parser("summary", help="Print run log summary")
    ledger_sub.add_parser("validate", help="Validate all run files")
    ledger_sub.add_parser("render-index", help="Regenerate agent_run_index.md")
    p = ledger_sub.add_parser("list-runs", help="List recent runs")
    p.add_argument("--limit", type=int, default=None)
    p = ledger_sub.add_parser("query", help="Query events across runs")
    p.add_argument("--run-id", default=None)
    p.add_argument("--symbol", default=None)
    p.add_argument("--event-type", default=None)
    p.add_argument("--limit", type=int, default=20)
    p.add_argument("--format", choices=["text", "json"], default="text")
    p = ledger_sub.add_parser("start-run", help="Begin a generative agent session")
    p.add_argument("--cadence", required=True)
    p.add_argument("--trigger", required=True)
    p.add_argument("--agents", required=True)
    p.add_argument("--prompt", default=None)
    p.add_argument("--signature", required=True)
    p = ledger_sub.add_parser("end-run", help="Complete the active or specified run")
    p.add_argument("--run-id", default=None)
    p.add_argument("--summary", required=True)
    p.add_argument("--deliverable", action="append", default=[])
    p = ledger_sub.add_parser("abort-run", help="Abort the active or specified run")
    p.add_argument("--run-id", default=None)
    p.add_argument("--summary", required=True)
    p = ledger_sub.add_parser("log-event", help="Append an event to a run")
    p.add_argument("--run-id", default=None)
    p.add_argument("--type", required=True)
    p.add_argument("--agent", required=True)
    p.add_argument("--subject", required=True)
    p.add_argument("--symbol", default=None)
    p.add_argument("--target-path", default=None)
    p.add_argument("--rationale", default=None)
    p.add_argument("--change", default=None)
    p.add_argument("--authority-tier", default=None)
    p.add_argument("--source-locator", default=None)
    p.add_argument("--related-ids", default=None)

    # 14. 'errata' subcommand
    experiment_parser = subparsers.add_parser(
        "experiment",
        help="Experimental program CLI (freeze, score, record, reconcile, archive).")
    experiment_sub = experiment_parser.add_subparsers(dest="experiment_command")
    for name, (script_name, help_text) in sorted(EXPERIMENT_SUBCOMMANDS.items()):
        sub = experiment_sub.add_parser(name, help=help_text, add_help=False)
        sub.add_argument(
            "experiment_args", nargs=argparse.REMAINDER,
            help=f"Arguments passed through to scripts/{script_name} (use --help for its options).")

    errata_parser = subparsers.add_parser("errata", help="Errata registry CLI (context/research/errata/).")
    errata_sub = errata_parser.add_subparsers(dest="errata_command")
    errata_sub.add_parser("summary", help="Print errata summary")
    errata_sub.add_parser("validate", help="Validate all errata files")
    errata_sub.add_parser("render-index", help="Regenerate errata_index.md")
    p = errata_sub.add_parser("list", help="List errata records")
    p.add_argument("--status", default=None)
    p.add_argument("--limit", type=int, default=None)
    p = errata_sub.add_parser("query", help="Query errata records")
    p.add_argument("--symbol", default=None)
    p.add_argument("--status", default=None)
    p.add_argument("--format", choices=["text", "json"], default="text")
    p = errata_sub.add_parser("record", help="Record a new erratum")
    p.add_argument("--target-file", required=True)
    p.add_argument("--field", required=True)
    p.add_argument("--issue", required=True)
    p.add_argument("--correction", required=True)
    p.add_argument("--authority-tier", default=None)
    p.add_argument("--source-locator", default=None)
    p.add_argument("--related-run", default=None)
    p = errata_sub.add_parser("update-status", help="Update erratum status")
    p.add_argument("--erratum-id", required=True)
    p.add_argument("--status", required=True)
    p.add_argument("--resolution-note", default=None)

    return parser


def main():
    parser = build_cli_parser()

    # Track if user explicitly specified --order
    order_specified = "--order" in sys.argv

    args = parser.parse_args()
    setattr(args, "order_specified", order_specified)

    # Handle top-level shortcut flags
    if getattr(args, "count", False):
        universe = load_master_universe()
        print(f"Total equities in master universe: {len(universe)}")
        return 0

    if getattr(args, "list", False):
        return execute_list_command(args)

    if getattr(args, "update_prices", False):
        setattr(args, "live", True)
        return execute_update_prices_command(args)

    if getattr(args, "refresh_sec", False):
        setattr(args, "live", True)
        return execute_refresh_sec_command(args)

    if getattr(args, "audit", False):
        return execute_audit_command(args)

    if getattr(args, "rebuild_all", False):
        return execute_rebuild_all_command(args)

    # Dispatch based on subcommand
    if not args.subcommand:
        parser.print_help()
        return 0

    subcommand_handlers = {
        "list": execute_list_command,
        "update-prices": execute_update_prices_command,
        "refresh-sec": execute_refresh_sec_command,
        "audit": execute_audit_command,
        "screen": execute_screen_command,
        "triage": execute_triage_command,
        "pricing": execute_pricing_command,
        "onboard": execute_onboard_command,
        "memory": execute_memory_command,
        "snapshot": execute_snapshot_command,
        "gaps": execute_gaps_command,
        "rebuild-all": execute_rebuild_all_command,
        "ledger": execute_ledger_command,
        "errata": execute_errata_command,
        "experiment": execute_experiment_command,
    }

    handler = subcommand_handlers.get(args.subcommand)
    if handler:
        return handler(args)

    parser.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
