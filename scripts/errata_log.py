#!/usr/bin/env python3
"""
scripts/errata_log.py
Deterministic CLI for errata records at context/research/errata/{erratum_id}.json.

This script is NOT an AI agent. Generative agent roles invoke it to record
factual corrections after verifying against Tier 1 sources.

Usage:
    python scripts/errata_log.py record --target-file ... --field ...
    python scripts/errata_log.py update-status --erratum-id ERR-2026-08-014 ...
    python scripts/errata_log.py list | query | summary | validate | render-index
    python scripts/errata_log.py migrate-from-md  (one-time migration helper)
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ERRATA_DIR = os.path.join(ROOT_DIR, "context", "research", "errata")
INDEX_PATH = os.path.join(ROOT_DIR, "context", "research", "errata_index.md")
PROTOCOL_PATH = os.path.join(ROOT_DIR, "context", "research", "errata_protocol.md")
LEGACY_MD_PATH = os.path.join(ROOT_DIR, "context", "research", "errata_log.md")
SCHEMA_VERSION = "1.0"

ERROR_CATEGORIES = {
    "HALLUCINATION", "STALE_PARAMETRIC_MEMORY", "TRANSCRIPTION_ERROR",
    "UPSTREAM_API_ANOMALY", "METHODOLOGY_CALCULATION_ERROR", "CORPORATE_RESTATEMENT",
}

STATUSES = {"OPEN", "RESOLVED", "PENDING_PRIMARY_VERIFICATION", "SUPERSEDED"}


def utc_now_iso():
    return datetime.now(timezone.utc).isoformat()


def today_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def ensure_errata_dir():
    os.makedirs(ERRATA_DIR, exist_ok=True)


def erratum_path(erratum_id):
    return os.path.join(ERRATA_DIR, f"{erratum_id}.json")


def load_erratum(erratum_id):
    path = erratum_path(erratum_id)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_erratum(record):
    ensure_errata_dir()
    path = erratum_path(record["erratum_id"])
    with open(path, "w", encoding="utf-8") as f:
        json.dump(record, f, indent=2)
        f.write("\n")
    return path


def list_erratum_ids():
    if not os.path.isdir(ERRATA_DIR):
        return []
    return sorted(
        name[:-5] for name in os.listdir(ERRATA_DIR) if name.endswith(".json")
    )


def next_erratum_id(date_str=None):
    date_str = date_str or today_str()
    pattern = re.compile(rf"^ERR-{re.escape(date_str)}-(\d{{3}})$")
    max_seq = 0
    for eid in list_erratum_ids():
        m = pattern.match(eid)
        if m:
            max_seq = max(max_seq, int(m.group(1)))
    return f"ERR-{date_str}-{max_seq + 1:03d}"


def validate_erratum(record):
    errors = []
    required = [
        "erratum_id", "schema_version", "recorded_at", "date_identified",
        "target_file", "target_field_or_claim", "erroneous_value",
        "corrected_value", "error_category", "authoritative_source_citation",
        "identifying_agent_or_human", "correction_action_taken", "status",
    ]
    for key in required:
        if key not in record or record[key] is None or record[key] == "":
            if key in ("related_run_id", "related_ids"):
                continue
            errors.append(f"missing {key}")
    if record.get("schema_version") != SCHEMA_VERSION:
        errors.append(f"schema_version must be {SCHEMA_VERSION}")
    if record.get("error_category") not in ERROR_CATEGORIES:
        errors.append(f"invalid error_category: {record.get('error_category')}")
    if record.get("status") not in STATUSES:
        errors.append(f"invalid status: {record.get('status')}")
    return errors


def load_all_errata():
    records = []
    for eid in list_erratum_ids():
        rec = load_erratum(eid)
        if rec:
            records.append(rec)
    records.sort(key=lambda r: r.get("date_identified") or "", reverse=True)
    return records


def cmd_record(args):
    ensure_errata_dir()
    erratum_id = args.erratum_id or next_erratum_id(args.date_identified)
    if load_erratum(erratum_id):
        print(f"ERROR: {erratum_id} already exists", file=sys.stderr)
        return 1
    record = {
        "erratum_id": erratum_id,
        "schema_version": SCHEMA_VERSION,
        "recorded_at": utc_now_iso(),
        "date_identified": args.date_identified or today_str(),
        "target_file": args.target_file,
        "target_field_or_claim": args.field,
        "erroneous_value": args.erroneous,
        "corrected_value": args.corrected,
        "error_category": args.category,
        "authoritative_source_citation": args.citation,
        "identifying_agent_or_human": args.identified_by or "Unspecified",
        "correction_action_taken": args.action,
        "status": args.status or "OPEN",
    }
    if args.related_run:
        record["related_run_id"] = args.related_run
    if args.related_ids:
        record["related_ids"] = [x.strip() for x in args.related_ids.split(",") if x.strip()]
    errors = validate_erratum(record)
    if errors:
        for err in errors:
            print(f"ERROR: {err}", file=sys.stderr)
        return 1
    path = save_erratum(record)
    print(f"{erratum_id} -> {path}")
    return 0


def cmd_update_status(args):
    record = load_erratum(args.erratum_id)
    if not record:
        print(f"ERROR: not found: {args.erratum_id}", file=sys.stderr)
        return 1
    record["status"] = args.status
    if args.corrected_value is not None:
        record["corrected_value"] = args.corrected_value
    if args.action is not None:
        record["correction_action_taken"] = args.action
    record["recorded_at"] = utc_now_iso()
    errors = validate_erratum(record)
    if errors:
        for err in errors:
            print(f"ERROR: {err}", file=sys.stderr)
        return 1
    save_erratum(record)
    print(f"Updated {args.erratum_id} -> {args.status}")
    return 0


def cmd_list(args):
    records = load_all_errata()
    if args.status:
        records = [r for r in records if r.get("status") == args.status]
    if args.limit:
        records = records[: args.limit]
    if args.format == "json":
        print(json.dumps(records, indent=2))
    else:
        for rec in records:
            print(
                f"{rec['erratum_id']}\t{rec.get('status')}\t{rec.get('date_identified')}\t"
                f"{rec.get('target_file')}\t{rec.get('target_field_or_claim')}"
            )
    return 0


def cmd_query(args):
    records = load_all_errata()
    matches = []
    for rec in records:
        if args.target_file and args.target_file not in rec.get("target_file", ""):
            continue
        if args.status and rec.get("status") != args.status:
            continue
        matches.append(rec)
    if args.limit:
        matches = matches[: args.limit]
    print(json.dumps(matches, indent=2) if args.format == "json" else "")
    if args.format != "json":
        for rec in matches:
            print(
                f"{rec['erratum_id']}\t{rec.get('status')}\t"
                f"{rec.get('target_field_or_claim')}"
            )
    return 0


def cmd_summary(_args):
    records = load_all_errata()
    by_status = {}
    by_category = {}
    for rec in records:
        st = rec.get("status", "UNKNOWN")
        by_status[st] = by_status.get(st, 0) + 1
        cat = rec.get("error_category", "UNKNOWN")
        by_category[cat] = by_category.get(cat, 0) + 1
    print("=" * 60)
    print("ERRATA SUMMARY")
    print("=" * 60)
    print(f"Total errata files: {len(records)}")
    print("\nBy status:")
    for k, v in sorted(by_status.items()):
        print(f"  {k}: {v}")
    print("\nBy category:")
    for k, v in sorted(by_category.items()):
        print(f"  {k}: {v}")
    return 0


def cmd_validate(_args):
    errors = []
    for eid in list_erratum_ids():
        rec = load_erratum(eid)
        if not rec:
            errors.append(f"{eid}: unreadable")
            continue
        for err in validate_erratum(rec):
            errors.append(f"{eid}: {err}")
    if errors:
        for err in errors:
            print(f"INVALID: {err}", file=sys.stderr)
        return 1
    print(f"Validated {len(list_erratum_ids())} erratum file(s).")
    return 0


def cmd_render_index(_args):
    records = load_all_errata()
    records.sort(key=lambda r: r.get("erratum_id") or "")
    lines = [
        "# Errata Index",
        "",
        "Generated index of errata records in `context/research/errata/`. "
        "Do not edit by hand; regenerate with `python scripts/errata_log.py render-index`.",
        "",
        "See [errata_protocol.md](errata_protocol.md) for the verification workflow.",
        "",
        "| Erratum ID | Date | Target File | Field / Claim | Category | Status | Identified By |",
        "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
    ]
    for rec in records:
        field = (rec.get("target_field_or_claim") or "").replace("|", "\\|")
        if len(field) > 60:
            field = field[:57] + "..."
        lines.append(
            f"| {rec['erratum_id']} | {rec.get('date_identified')} | "
            f"`{rec.get('target_file')}` | {field} | {rec.get('error_category')} | "
            f"{rec.get('status')} | {rec.get('identifying_agent_or_human')} |"
        )
    with open(INDEX_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"Wrote {INDEX_PATH}")
    return 0


def parse_legacy_table_row(line):
    if not line.startswith("| ERR-"):
        return None
    parts = [p.strip() for p in line.split("|")]
    if len(parts) < 11:
        return None
    erratum_id = parts[1]
    date_identified = parts[2]
    target_file = parts[3].strip("`")
    target_field = parts[4]
    erroneous = parts[5]
    corrected = parts[6]
    category = parts[7]
    citation = parts[8]
    status = parts[9]
    identifying = "Memory Agent"
    action = corrected if status == "RESOLVED" else corrected
    if status == "OPEN":
        action = corrected
    return {
        "erratum_id": erratum_id,
        "schema_version": SCHEMA_VERSION,
        "recorded_at": f"{date_identified}T12:00:00+00:00",
        "date_identified": date_identified,
        "target_file": target_file,
        "target_field_or_claim": target_field,
        "erroneous_value": erroneous,
        "corrected_value": corrected,
        "error_category": category,
        "authoritative_source_citation": citation,
        "identifying_agent_or_human": identifying,
        "correction_action_taken": action,
        "status": status,
    }


def cmd_migrate_from_md(_args):
    if not os.path.exists(LEGACY_MD_PATH):
        print(f"ERROR: {LEGACY_MD_PATH} not found", file=sys.stderr)
        return 1
    ensure_errata_dir()
    content = open(LEGACY_MD_PATH, "r", encoding="utf-8").read()
    lines = content.splitlines()

    protocol_end = content.find("## Errata Audit Registry")
    resolution_start = content.find("## Resolution Procedures")
    if protocol_end == -1 or resolution_start == -1:
        print("ERROR: could not parse legacy errata_log.md sections", file=sys.stderr)
        return 1
    protocol_body = content[:protocol_end].strip()
    resolution_body = content[resolution_start:].strip()

    with open(PROTOCOL_PATH, "w", encoding="utf-8") as f:
        f.write(protocol_body.replace("# Errata & Data Correction Log", "# Errata Protocol"))
        f.write("\n\n")
        f.write(resolution_body)
        f.write("\n")

    count = 0
    for line in lines:
        rec = parse_legacy_table_row(line)
        if not rec:
            continue
        if rec["erratum_id"] == "ERR-2026-08-019":
            rec["identifying_agent_or_human"] = "Investment Thesis Agent"
            rec["related_run_id"] = "RUN-2026-08-28-002"
        if rec["erratum_id"] in ("ERR-2026-08-014", "ERR-2026-08-015"):
            rec["related_run_id"] = "RUN-2026-08-28-002"
        save_erratum(rec)
        count += 1

    print(f"Migrated {count} errata to {ERRATA_DIR}")
    print(f"Wrote {PROTOCOL_PATH}")
    return 0


def main():
    parser = argparse.ArgumentParser(
        description="Deterministic CLI for errata records (context/research/errata/)."
    )
    sub = parser.add_subparsers(dest="command")

    p = sub.add_parser("record", help="Create a new erratum file")
    p.add_argument("--erratum-id", default=None)
    p.add_argument("--target-file", required=True)
    p.add_argument("--field", required=True)
    p.add_argument("--erroneous", required=True)
    p.add_argument("--corrected", required=True)
    p.add_argument("--category", required=True)
    p.add_argument("--citation", required=True)
    p.add_argument("--action", required=True)
    p.add_argument("--status", default="OPEN")
    p.add_argument("--identified-by", default=None)
    p.add_argument("--date-identified", default=None)
    p.add_argument("--related-run", default=None)
    p.add_argument("--related-ids", default=None)

    p = sub.add_parser("update-status", help="Update erratum lifecycle status")
    p.add_argument("--erratum-id", required=True)
    p.add_argument("--status", required=True)
    p.add_argument("--corrected-value", default=None)
    p.add_argument("--action", default=None)

    p = sub.add_parser("list")
    p.add_argument("--status", default=None)
    p.add_argument("--limit", type=int, default=None)
    p.add_argument("--format", choices=["text", "json"], default="text")

    p = sub.add_parser("query")
    p.add_argument("--target-file", default=None)
    p.add_argument("--status", default=None)
    p.add_argument("--limit", type=int, default=20)
    p.add_argument("--format", choices=["text", "json"], default="text")

    sub.add_parser("summary")
    sub.add_parser("validate")
    sub.add_parser("render-index")
    sub.add_parser("migrate-from-md", help="One-time migration from errata_log.md")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        return 1

    handlers = {
        "record": cmd_record,
        "update-status": cmd_update_status,
        "list": cmd_list,
        "query": cmd_query,
        "summary": cmd_summary,
        "validate": cmd_validate,
        "render-index": cmd_render_index,
        "migrate-from-md": cmd_migrate_from_md,
    }
    return handlers[args.command](args)


if __name__ == "__main__":
    sys.exit(main() or 0)
