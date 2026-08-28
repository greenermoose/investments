"""
Investor Sentiment & Press Surveillance Reader

Reads, validates, and reports the sentiment surveillance dataset at
context/data/sentiment_surveillance.json against
context/schemas/investor_sentiment_schema.json.

Sentiment observation is research. Reading newswires and investor forums,
judging whether a concern is credible, and grading its severity all require an
agent with source tools. This script does not do any of that. It validates what
an agent recorded, reports coverage against the universe, and surfaces the
high-severity concerns the Equity Research and Investment Thesis Agents need.

This script previously carried a seed_sentiment_data() function that assigned
sentiment scores, discussion velocities, and named "investor concerns" to every
universe equity from its sector and triage status. Nothing it produced had been
observed anywhere. It is gone, along with the records it wrote.

Agents record observations by writing conforming records into
context/data/sentiment_surveillance.json. Validate with --audit.
"""

import argparse
from datetime import datetime, timezone
import json
import os
import sys

SENTIMENT_LABELS = {"HIGHLY_BULLISH", "BULLISH", "NEUTRAL", "BEARISH", "HIGHLY_BEARISH"}
DISCUSSION_VELOCITIES = {"VERY_HIGH", "ELEVATED", "NORMAL", "LOW", "DORMANT"}
CONCERN_SEVERITIES = {"HIGH", "MEDIUM", "LOW"}

REQUIRED_RECORD_FIELDS = [
    "symbol",
    "company_name",
    "sentiment_score",
    "sentiment_label",
    "discussion_velocity",
    "key_investor_concerns",
    "key_bullish_catalysts",
    "recent_press_headlines",
]


def get_base_dirs():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return {
        "root": root_dir,
        "sources": os.path.join(root_dir, "context", "sources"),
        "scripts_data": os.path.join(root_dir, "scripts", "data"),
        "http_data": os.path.join(root_dir, "http", "data"),
        "context_data": os.path.join(root_dir, "context", "data"),
    }


def load_universe():
    dirs = get_base_dirs()
    univ_path = os.path.join(dirs["http_data"], "universe.json")
    if not os.path.exists(univ_path):
        univ_path = os.path.join(dirs["context_data"], "universe.json")
    if not os.path.exists(univ_path):
        return []
    with open(univ_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict):
        return data.get("equities") or data.get("companies") or []
    return data if isinstance(data, list) else []


def load_surveillance():
    """Reads the recorded surveillance dataset. Absent means nothing observed."""
    dirs = get_base_dirs()
    path = os.path.join(dirs["context_data"], "sentiment_surveillance.json")
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f).get("equities_surveillance", [])
    except (OSError, ValueError):
        return []


def validate_records(records):
    """Structural validation against investor_sentiment_schema.json."""
    errors = []
    seen = set()

    for idx, record in enumerate(records):
        if not isinstance(record, dict):
            errors.append(f"record[{idx}] is not an object")
            continue

        symbol = record.get("symbol", f"<record {idx}>")
        for field in REQUIRED_RECORD_FIELDS:
            if field not in record:
                errors.append(f"[{symbol}] missing required field '{field}'")

        if symbol in seen:
            errors.append(f"[{symbol}] duplicate surveillance record")
        seen.add(symbol)

        score = record.get("sentiment_score")
        if not isinstance(score, (int, float)) or not (-100.0 <= float(score) <= 100.0):
            errors.append(f"[{symbol}] sentiment_score {score} must be a number in [-100, 100]")

        label = record.get("sentiment_label")
        if label not in SENTIMENT_LABELS:
            errors.append(f"[{symbol}] sentiment_label '{label}' is not a recognized label")

        velocity = record.get("discussion_velocity")
        if velocity not in DISCUSSION_VELOCITIES:
            errors.append(f"[{symbol}] discussion_velocity '{velocity}' is not recognized")

        for c_idx, concern in enumerate(record.get("key_investor_concerns") or []):
            if not isinstance(concern, dict):
                errors.append(f"[{symbol}] key_investor_concerns[{c_idx}] is not an object")
                continue
            for field in ("theme", "severity", "description"):
                if not concern.get(field):
                    errors.append(
                        f"[{symbol}] key_investor_concerns[{c_idx}] missing '{field}'")
            if concern.get("severity") not in CONCERN_SEVERITIES:
                errors.append(
                    f"[{symbol}] key_investor_concerns[{c_idx}].severity "
                    f"'{concern.get('severity')}' is not recognized")
            if not concern.get("chatter_source"):
                errors.append(
                    f"[{symbol}] key_investor_concerns[{c_idx}] has no chatter_source; "
                    "every recorded concern must name where it was observed")

        for h_idx, headline in enumerate(record.get("recent_press_headlines") or []):
            if not isinstance(headline, dict):
                errors.append(f"[{symbol}] recent_press_headlines[{h_idx}] is not an object")
                continue
            for field in ("headline", "date", "source_name"):
                if not headline.get(field):
                    errors.append(
                        f"[{symbol}] recent_press_headlines[{h_idx}] missing '{field}'")

    return errors


def save_surveillance_data(records):
    """Persists validated records across the three dataset locations."""
    errors = validate_records(records)
    if errors:
        raise ValueError(
            "Refusing to write invalid sentiment records:\n  " + "\n  ".join(errors))

    dirs = get_base_dirs()
    document = {
        "schema_version": "1.0",
        "description": (
            "Investor sentiment and press release surveillance across tracked public "
            "equities. Every record is an agent observation of a named source."
        ),
        "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "provenance": "TIER_4_INVESTOR_SENTIMENT",
        "equities_surveillance": records,
    }

    for out_dir in [dirs["scripts_data"], dirs["http_data"], dirs["context_data"]]:
        os.makedirs(out_dir, exist_ok=True)
        with open(os.path.join(out_dir, "sentiment_surveillance.json"), "w", encoding="utf-8") as f:
            json.dump(document, f, indent=2)


def main():
    parser = argparse.ArgumentParser(
        description="Read and validate recorded investor sentiment and press surveillance")
    parser.add_argument("--symbols", nargs="+", help="Restrict the report to specific symbols")
    parser.add_argument("--min-sentiment", type=float,
                        help="Show only equities with sentiment score >= threshold")
    parser.add_argument("--concerns-only", action="store_true",
                        help="Show only equities carrying recorded investor concerns")
    parser.add_argument("--audit", action="store_true",
                        help="Validate recorded observations against the schema")
    parser.add_argument("--coverage", action="store_true",
                        help="Report which universe equities have no recorded observation")
    parser.add_argument("--json", action="store_true", help="Output raw JSON")
    args = parser.parse_args()

    records = load_surveillance()

    if args.audit:
        errors = validate_records(records)
        print(f"Validating {len(records)} sentiment surveillance record(s)...")
        if errors:
            for err in errors:
                print(f"  FAIL: {err}")
            print(f"\n{len(errors)} validation error(s).")
            return 1
        print("All recorded sentiment observations conform to "
              "context/schemas/investor_sentiment_schema.json.")
        return 0

    if args.coverage:
        universe_symbols = {e.get("symbol") for e in load_universe() if e.get("symbol")}
        observed = {r.get("symbol") for r in records if r.get("symbol")}
        missing = sorted(universe_symbols - observed)
        print(f"Sentiment coverage: {len(observed)} observed, {len(missing)} unobserved "
              f"across {len(universe_symbols)} universe equities.")
        if missing:
            preview = ", ".join(missing[:15])
            suffix = f", and {len(missing) - 15} more" if len(missing) > 15 else ""
            print(f"Awaiting Equity Research Agent surveillance: {preview}{suffix}")
        return 0

    display = records
    if args.symbols:
        targets = {s.upper() for s in args.symbols}
        display = [r for r in display if str(r.get("symbol", "")).upper() in targets]
    if args.min_sentiment is not None:
        display = [r for r in display
                   if isinstance(r.get("sentiment_score"), (int, float))
                   and r["sentiment_score"] >= args.min_sentiment]
    if args.concerns_only:
        display = [r for r in display if r.get("key_investor_concerns")]

    if args.json:
        print(json.dumps(display, indent=2))
        return 0

    print("================================================================================")
    print(f"INVESTOR SENTIMENT & PRESS SURVEILLANCE REPORT ({len(display)} Equities)")
    print("================================================================================")

    if not display:
        print("No sentiment observations recorded for the requested equities.")
        print("Sentiment is authored by the Equity Research Agent from named sources and")
        print("written to context/data/sentiment_surveillance.json. This report does not")
        print("infer sentiment from fundamentals.")
        print("================================================================================")
        return 0

    print(f"{'SYMBOL':<7} {'SENTIMENT':<16} {'SCORE':<8} {'VELOCITY':<12} {'TOP CONCERN THEME'}")
    print("-" * 88)
    for record in display[:35]:
        concerns = record.get("key_investor_concerns") or []
        top_concern = concerns[0].get("theme", "None") if concerns else "None"
        print(
            f"{record.get('symbol', ''):<7} "
            f"{record.get('sentiment_label', ''):<16} "
            f"{record.get('sentiment_score', 0.0):+.1f}   "
            f"{record.get('discussion_velocity', ''):<12} "
            f"{top_concern[:40]}"
        )
    if len(display) > 35:
        print(f"... and {len(display) - 35} additional equities surveilled.")
    print("================================================================================")
    print("Execute 'python scripts/surveil_sentiment.py --symbols <TICKER> --json' for detail.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
