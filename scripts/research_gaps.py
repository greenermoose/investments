#!/usr/bin/env python3
"""
scripts/research_gaps.py
The authoring queue: which agent-authored research each universe equity is missing.

Every deterministic script in this repository now refuses to substitute a
plausible value for a field an agent has not written. That refusal is only
useful if agents can see what is outstanding. This script is that view. It reads
the research store (context/data/equities/<TICKER>.json) and reports, per
ticker and per owning agent role, which fields are unauthored or fail their
structural contract, and what those fields block.

Exits non-zero when any gap exists, so a pipeline step or a scheduled run
surfaces the backlog rather than passing silently.

Usage:
    python scripts/research_gaps.py
    python scripts/research_gaps.py --symbol NVDA
    python scripts/research_gaps.py --role "Investment Thesis Agent"
    python scripts/research_gaps.py --field tam_and_market_share
    python scripts/research_gaps.py --format json
    python scripts/research_gaps.py --summary
"""

import argparse
import json
import os
import sys
from collections import Counter, defaultdict

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS_DIR = os.path.join(ROOT_DIR, "scripts")
if SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, SCRIPTS_DIR)

import research_store

HTTP_DATA_DIR = os.path.join(ROOT_DIR, "http", "data")
CONTEXT_DATA_DIR = os.path.join(ROOT_DIR, "context", "data")

# Every field the registry knows about is in scope for the report. The thesis
# renderer requires a subset (research_store.THESIS_REQUIRED_FIELDS); the rest
# still block something, which the "renders" column names.
ALL_FIELDS = list(research_store.FIELD_REGISTRY)


def load_universe():
    for name in (HTTP_DATA_DIR, CONTEXT_DATA_DIR):
        path = os.path.join(name, "universe.json")
        if not os.path.exists(path):
            continue
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, ValueError):
            continue
        if isinstance(data, dict):
            return data.get("companies") or data.get("equities") or []
        return data
    return []


def collect_gaps(symbols, fields):
    gaps = []
    for symbol in symbols:
        research = research_store.load_research(symbol)
        gaps.extend(research_store.require_fields(symbol, fields, research=research))
    return gaps


def print_by_role(gaps, symbols, fields, blocked_symbols):
    by_role = defaultdict(lambda: defaultdict(list))
    for gap in gaps:
        by_role[gap.owner][gap.field].append(gap.symbol)

    print("=" * 80)
    print("RESEARCH AUTHORING QUEUE")
    print("=" * 80)
    print(f"Universe: {len(symbols)} equities. Fields tracked: {len(fields)}.")
    print(f"Open gaps: {len(gaps)} across {len({g.symbol for g in gaps})} equities.")
    print(f"Fully authored and ready to render a thesis dossier: "
          f"{len(symbols) - len(blocked_symbols)}.")
    print("")

    for role in sorted(by_role):
        role_gaps = sum(len(v) for v in by_role[role].values())
        print("-" * 80)
        print(f"{role.upper()}  ({role_gaps} gaps)")
        print("-" * 80)
        for field in sorted(by_role[role], key=lambda f: -len(by_role[role][f])):
            missing = sorted(by_role[role][field])
            spec = research_store.FIELD_REGISTRY[field]
            blocks = ", ".join(spec.renders) if spec.renders else "nothing yet"
            print(f"  {field}")
            print(f"    missing on {len(missing)} of {len(symbols)} equities; blocks: {blocks}")
            preview = ", ".join(missing[:10])
            suffix = f", and {len(missing) - 10} more" if len(missing) > 10 else ""
            print(f"    {preview}{suffix}")
        print("")


def print_by_symbol(gaps, symbols):
    by_symbol = defaultdict(list)
    for gap in gaps:
        by_symbol[gap.symbol].append(gap)

    print("=" * 80)
    print("RESEARCH AUTHORING QUEUE BY EQUITY")
    print("=" * 80)
    for symbol in sorted(by_symbol):
        print(f"\n{symbol} ({len(by_symbol[symbol])} gaps)")
        for gap in by_symbol[symbol]:
            detail = "unauthored" if gap.reason == "unauthored" else gap.reason
            print(f"  - {gap.field} [{gap.owner}]: {detail}")


def print_summary(gaps, symbols, fields):
    counts = Counter(gap.field for gap in gaps)
    print(f"{'FIELD':<48} {'MISSING':>8} {'AUTHORED':>9}")
    print("-" * 68)
    for field in fields:
        missing = counts.get(field, 0)
        print(f"{field:<48} {missing:>8} {len(symbols) - missing:>9}")
    print("-" * 68)
    print(f"{'TOTAL GAPS':<48} {len(gaps):>8}")


def main():
    parser = argparse.ArgumentParser(
        description="Report which agent-authored research each universe equity is missing")
    parser.add_argument("--symbol", nargs="+", help="Restrict the report to specific symbols")
    parser.add_argument("--role", type=str, help="Restrict to one owning agent role")
    parser.add_argument("--field", nargs="+", help="Restrict to specific research fields")
    parser.add_argument("--thesis-only", action="store_true",
                        help="Report only the fields render_thesis.py requires")
    parser.add_argument("--summary", action="store_true", help="One line per field")
    parser.add_argument("--by-symbol", action="store_true", help="Group the report by equity")
    parser.add_argument("--format", choices=["text", "json"], default="text")
    args = parser.parse_args()

    universe = load_universe()
    symbols = [e["symbol"] for e in universe if e.get("symbol")]
    if not symbols:
        symbols = research_store.store_symbols()
    if args.symbol:
        wanted = {s.upper() for s in args.symbol}
        symbols = [s for s in symbols if s in wanted]

    fields = research_store.THESIS_REQUIRED_FIELDS if args.thesis_only else ALL_FIELDS
    if args.field:
        unknown = [f for f in args.field if f not in research_store.FIELD_REGISTRY]
        if unknown:
            print(f"Unknown research field(s): {', '.join(unknown)}")
            print(f"Known fields: {', '.join(ALL_FIELDS)}")
            return 2
        fields = list(args.field)

    gaps = collect_gaps(symbols, fields)
    if args.role:
        gaps = [g for g in gaps if g.owner.lower() == args.role.lower()]

    # A ticker is blocked from a thesis dossier if it is missing any required field.
    required = set(research_store.THESIS_REQUIRED_FIELDS)
    blocked_symbols = {g.symbol for g in collect_gaps(symbols, research_store.THESIS_REQUIRED_FIELDS)}

    if args.format == "json":
        print(json.dumps({
            "universe_size": len(symbols),
            "fields_tracked": fields,
            "total_gaps": len(gaps),
            "equities_with_gaps": sorted({g.symbol for g in gaps}),
            "equities_ready_for_thesis": sorted(set(symbols) - blocked_symbols),
            "gaps": [
                {
                    "symbol": g.symbol,
                    "field": g.field,
                    "reason": g.reason,
                    "owner": g.owner,
                    "blocks": g.renders,
                    "required_for_thesis": g.field in required,
                }
                for g in gaps
            ],
        }, indent=2))
        return 1 if gaps else 0

    if not gaps:
        print(f"No research gaps across {len(symbols)} equities for the tracked fields.")
        return 0

    if args.summary:
        print_summary(gaps, symbols, fields)
    elif args.by_symbol or args.symbol:
        print_by_symbol(gaps, symbols)
    else:
        print_by_role(gaps, symbols, fields, blocked_symbols)

    print("")
    print("Agents author into context/data/equities/<TICKER>.json under the 'research' key,")
    print("conforming to context/schemas/equity_research_schema.json. Write through")
    print("scripts/research_store.py write_research so the block is validated on the way in.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
