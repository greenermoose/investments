#!/usr/bin/env python3
"""
scripts/manage_memory.py
Deterministic audit CLI for the Memory Agent role.

This script is NOT an AI agent. It reports structured state from thesis dossiers,
agent run logs (context/research/runs/), and errata records (context/research/errata/)
for the generative Memory Agent to consume before reasoning.
"""

import argparse
import datetime
import json
import re
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
THESES_DIR = ROOT_DIR / "context" / "theses"
RUNS_DIR = ROOT_DIR / "context" / "research" / "runs"
ERRATA_DIR = ROOT_DIR / "context" / "research" / "errata"
ACTIVE_RUN_PATH = RUNS_DIR / ".active_run"


def parse_thesis_file(file_path):
    """Parses key metadata, rating, catalysts, and invalidation triggers from a markdown thesis file."""
    try:
        content = file_path.read_text(encoding="utf-8")
    except Exception:
        return None

    symbol = file_path.stem.upper()

    rating_match = re.search(r"\*{0,2}Rating:\*{0,2}\s*`?(BUY|HOLD|SELL|AVOID)`?", content, re.IGNORECASE)
    rating = rating_match.group(1).upper() if rating_match else "UNKNOWN"

    benchmark_match = re.search(r"\*{0,2}Benchmark Entry Price:\*{0,2}\s*\$?([\d\.]+)", content, re.IGNORECASE)
    benchmark_entry = float(benchmark_match.group(1)) if benchmark_match else None

    base_pt_match = re.search(
        r"\*{0,2}(?:52-Week.*?(?:Base|Target)|Target Exit Price):\*{0,2}\s*\$?([\d\.]+)",
        content,
        re.IGNORECASE,
    )
    base_pt = float(base_pt_match.group(1)) if base_pt_match else None

    catalysts = []
    for line in content.splitlines():
        if "catalyst" in line.lower() or "event" in line.lower() or "milestone" in line.lower() or "earnings" in line.lower():
            date_match = re.search(r"\b(202\d-\d{2}-\d{2}|Q[1-4]\s*202\d)\b", line)
            if date_match:
                catalysts.append({
                    "date": date_match.group(1),
                    "description": line.strip("-*# ").strip(),
                })

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
        "path": str(file_path),
    }


def load_json_files(directory):
    records = []
    if not directory.exists():
        return records
    for path in sorted(directory.glob("*.json")):
        try:
            with open(path, "r", encoding="utf-8") as f:
                records.append(json.load(f))
        except (OSError, json.JSONDecodeError):
            continue
    return records


def read_active_run_id():
    if not ACTIVE_RUN_PATH.exists():
        return None
    try:
        run_id = ACTIVE_RUN_PATH.read_text(encoding="utf-8").strip()
        return run_id or None
    except OSError:
        return None


def scan_runs():
    runs = load_json_files(RUNS_DIR)
    runs.sort(key=lambda r: r.get("started_at") or "", reverse=True)
    active_run_id = read_active_run_id()
    stale_in_progress = []
    rating_changes = []
    for run in runs:
        if run.get("status") == "IN_PROGRESS" and run.get("run_id") != active_run_id:
            stale_in_progress.append(run.get("run_id"))
        for event in run.get("events") or []:
            if event.get("event_type") == "RATING_CHANGED":
                rating_changes.append({
                    "run_id": run.get("run_id"),
                    "event_id": event.get("event_id"),
                    "symbol": event.get("symbol"),
                    "recorded_at": event.get("recorded_at"),
                    "subject": event.get("subject"),
                })
    rating_changes.sort(key=lambda e: e.get("recorded_at") or "", reverse=True)
    return {
        "total_runs": len(runs),
        "active_run_id": active_run_id,
        "stale_in_progress": stale_in_progress,
        "recent_runs": [
            {
                "run_id": r.get("run_id"),
                "status": r.get("status"),
                "trigger": r.get("trigger"),
                "started_at": r.get("started_at"),
                "summary": r.get("summary"),
                "event_count": len(r.get("events") or []),
            }
            for r in runs[:10]
        ],
        "recent_rating_changes": rating_changes[:20],
    }


def scan_errata():
    errata = load_json_files(ERRATA_DIR)
    by_status = {}
    for record in errata:
        status = record.get("status", "UNKNOWN")
        by_status[status] = by_status.get(status, 0) + 1
    errata.sort(key=lambda r: r.get("recorded_at") or "", reverse=True)
    return {
        "total_errata": len(errata),
        "by_status": by_status,
        "recent_errata": [
            {
                "erratum_id": r.get("erratum_id"),
                "status": r.get("status"),
                "target_file": r.get("target_file"),
                "field": r.get("field"),
                "recorded_at": r.get("recorded_at"),
            }
            for r in errata[:10]
        ],
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

    errata_scan = scan_errata()
    runs_scan = scan_runs()

    return {
        "reference_date": str(today),
        "total_theses_tracked": len(theses),
        "errata_total": errata_scan["total_errata"],
        "errata_by_status": errata_scan["by_status"],
        "runs": runs_scan,
        "errata": errata_scan,
        "theses_summary": theses,
    }


def build_ledger_summary(result):
    return {
        "reference_date": result["reference_date"],
        "theses_tracked": result["total_theses_tracked"],
        "errata": {
            "total": result["errata_total"],
            "by_status": result["errata_by_status"],
            "recent": result["errata"]["recent_errata"],
        },
        "runs": {
            "total": result["runs"]["total_runs"],
            "active_run_id": result["runs"]["active_run_id"],
            "stale_in_progress": result["runs"]["stale_in_progress"],
            "recent": result["runs"]["recent_runs"],
            "recent_rating_changes": result["runs"]["recent_rating_changes"],
        },
    }


def main():
    parser = argparse.ArgumentParser(
        description="Deterministic audit CLI for the Memory Agent role (not an AI agent)."
    )
    parser.add_argument("--date", type=str, default=None, help="Reference date (YYYY-MM-DD)")
    parser.add_argument("--symbol", type=str, default=None, help="Inspect specific symbol thesis memory")
    parser.add_argument("--ledger", action="store_true",
                        help="Emit combined JSON summary of runs, errata, and thesis state")
    parser.add_argument("--json", action="store_true", help="Output raw JSON")

    args = parser.parse_args()

    result = audit_memory(args.date)

    if args.ledger:
        ledger = build_ledger_summary(result)
        print(json.dumps(ledger, indent=2))
        return

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
    print(f"Errata Records: {result['errata_total']}")
    if result["errata_by_status"]:
        status_parts = [f"{k}: {v}" for k, v in sorted(result["errata_by_status"].items())]
        print(f"  By status: {', '.join(status_parts)}")
    print(f"Agent Runs: {result['runs']['total_runs']}")
    if result["runs"]["active_run_id"]:
        print(f"  Active run: {result['runs']['active_run_id']}")
    if result["runs"]["stale_in_progress"]:
        print(f"  Stale IN_PROGRESS: {', '.join(result['runs']['stale_in_progress'])}")
    print()

    print(f"{'SYMBOL':<8} {'RATING':<8} {'BENCHMARK':<12} {'52W TARGET':<12} {'CATALYSTS':<10}")
    print("-" * 75)
    for t in result["theses_summary"]:
        bench_str = f"${t['benchmark_entry']:.2f}" if t["benchmark_entry"] else "N/A"
        target_str = f"${t['base_52w_target']:.2f}" if t["base_52w_target"] else "N/A"
        print(f"{t['symbol']:<8} {t['rating']:<8} {bench_str:<12} {target_str:<12} {t['catalysts_count']:<10}")
    print("=" * 75)


if __name__ == "__main__":
    main()
