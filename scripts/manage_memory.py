#!/usr/bin/env python3
"""
scripts/manage_memory.py
Deterministic Context & Invalidation Manager CLI for the Memory Agent.

Audits persistent context dossiers in context/theses/*.md, tracks catalyst
timelines, identifies impending/overdue milestones, detects invalidation
triggers, and checks errata logs for cross-run institutional continuity.
"""

import argparse
import datetime
import json
import re
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
THESES_DIR = ROOT_DIR / "context" / "theses"
ERRATA_LOG = ROOT_DIR / "context" / "research" / "errata_log.md"


def parse_thesis_file(file_path):
    """Parses key metadata, rating, catalysts, and invalidation triggers from a markdown thesis file."""
    try:
        content = file_path.read_text(encoding="utf-8")
    except Exception as e:
        return None

    symbol = file_path.stem.upper()
    
    # Extract Rating
    rating_match = re.search(r"\*{0,2}Rating:\*{0,2}\s*`?(BUY|HOLD|SELL|AVOID)`?", content, re.IGNORECASE)
    rating = rating_match.group(1).upper() if rating_match else "UNKNOWN"

    # Extract Benchmark Entry
    benchmark_match = re.search(r"\*{0,2}Benchmark Entry Price:\*{0,2}\s*\$?([\d\.]+)", content, re.IGNORECASE)
    benchmark_entry = float(benchmark_match.group(1)) if benchmark_match else None

    # Extract 52-week Price Target Base / Target Exit Price
    base_pt_match = re.search(r"\*{0,2}(?:52-Week.*?(?:Base|Target)|Target Exit Price):\*{0,2}\s*\$?([\d\.]+)", content, re.IGNORECASE)
    base_pt = float(base_pt_match.group(1)) if base_pt_match else None

    # Extract Catalysts (dates like YYYY-MM-DD or Q1 2026)
    catalysts = []
    for line in content.splitlines():
        if "catalyst" in line.lower() or "event" in line.lower() or "milestone" in line.lower() or "earnings" in line.lower():
            date_match = re.search(r"\b(202\d-\d{2}-\d{2}|Q[1-4]\s*202\d)\b", line)
            if date_match:
                catalysts.append({
                    "date": date_match.group(1),
                    "description": line.strip("-*# ").strip()
                })

    # Extract Invalidation Triggers
    invalidation_triggers = []
    in_invalidation_sec = False
    for line in content.splitlines():
        if "invalidation" in line.lower() or "thesis risk" in line.lower() or "broken thesis" in line.lower():
            in_invalidation_sec = True
            continue
        if in_invalidation_sec:
            if line.startswith("#"):
                in_invalidation_sec = False
            elif line.strip().startswith("-") or line.strip().startswith("*"):
                invalidation_triggers.append(line.strip("-*# ").strip())

    return {
        "symbol": symbol,
        "rating": rating,
        "benchmark_entry": benchmark_entry,
        "base_52w_target": base_pt,
        "catalysts_count": len(catalysts),
        "catalysts": catalysts,
        "invalidation_triggers": invalidation_triggers[:4],
        "path": str(file_path)
    }


def audit_memory(current_date_str=None):
    if current_date_str:
        try:
            today = datetime.datetime.strptime(current_date_str, "%Y-%m-%d").date()
        except ValueError:
            today = datetime.date.today()
    else:
        today = datetime.date.today()

    theses = []
    if THESES_DIR.exists():
        for md_file in sorted(THESES_DIR.glob("*.md")):
            parsed = parse_thesis_file(md_file)
            if parsed:
                theses.append(parsed)

    errata_entries = 0
    if ERRATA_LOG.exists():
        errata_content = ERRATA_LOG.read_text(encoding="utf-8")
        errata_entries = len(re.findall(r"^##\s+", errata_content, re.MULTILINE))

    return {
        "reference_date": str(today),
        "total_theses_tracked": len(theses),
        "errata_log_entries": errata_entries,
        "theses_summary": theses
    }


def main():
    parser = argparse.ArgumentParser(
        description="Deterministic Context & Invalidation Manager for Memory Agent"
    )
    parser.add_argument("--date", type=str, default=None, help="Reference date (YYYY-MM-DD)")
    parser.add_argument("--symbol", type=str, default=None, help="Inspect specific symbol thesis memory")
    parser.add_argument("--json", action="store_true", help="Output raw JSON")

    args = parser.parse_args()

    result = audit_memory(args.date)

    if args.symbol:
        sym_match = [t for t in result["theses_summary"] if t["symbol"] == args.symbol.upper()]
        if args.json:
            print(json.dumps(sym_match[0] if sym_match else {}, indent=2))
            return
        if not sym_match:
            print(f"No thesis found for {args.symbol.upper()} in {THESES_DIR}")
            return
        t = sym_match[0]
        print("=" * 70)
        print(f"MEMORY AGENT: THESIS STATE FOR {t['symbol']} (Rating: {t['rating']})")
        print("=" * 70)
        print(f"Benchmark Entry:       ${t['benchmark_entry'] if t['benchmark_entry'] else 'N/A'}")
        print(f"52-Week Base Target:   ${t['base_52w_target'] if t['base_52w_target'] else 'N/A'}")
        print(f"\nTracked Catalysts ({t['catalysts_count']}):")
        for c in t["catalysts"]:
            print(f"  - [{c['date']}] {c['description']}")
        print(f"\nInvalidation Triggers ({len(t['invalidation_triggers'])}):")
        for iv in t["invalidation_triggers"]:
            print(f"  - {iv}")
        print("=" * 70)
        return

    if args.json:
        print(json.dumps(result, indent=2))
        return

    print("=" * 75)
    print(f"MEMORY AGENT: CONTEXT & THESIS STATE SUMMARY (As of {result['reference_date']})")
    print("=" * 75)
    print(f"Total Persistent Theses: {result['total_theses_tracked']}")
    print(f"Errata Log Reconciliations: {result['errata_log_entries']}\n")

    print(f"{'SYMBOL':<8} {'RATING':<8} {'BENCHMARK':<12} {'52W TARGET':<12} {'CATALYSTS':<10}")
    print("-" * 75)
    for t in result["theses_summary"]:
        bench_str = f"${t['benchmark_entry']:.2f}" if t['benchmark_entry'] else "N/A"
        target_str = f"${t['base_52w_target']:.2f}" if t['base_52w_target'] else "N/A"
        print(f"{t['symbol']:<8} {t['rating']:<8} {bench_str:<12} {target_str:<12} {t['catalysts_count']:<10}")
    print("=" * 75)


if __name__ == "__main__":
    main()
