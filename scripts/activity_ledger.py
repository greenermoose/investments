#!/usr/bin/env python3
"""
scripts/activity_ledger.py
Deterministic CLI for agent run logs at context/research/runs/{run_id}.json.

This script is NOT an AI agent. Generative agent roles invoke it to record
session boundaries and decisions. Script auto-hooks may append events when
no agent session is active (SYS-* runs).

Usage:
    python scripts/activity_ledger.py start-run --cadence weekly ...
    python scripts/activity_ledger.py end-run --summary "..."
    python scripts/activity_ledger.py log-event --type ERRATA_LINKED ...
    python scripts/activity_ledger.py summary | query | list-runs | validate | render-index
"""

import argparse
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUNS_DIR = os.path.join(ROOT_DIR, "context", "research", "runs")
INDEX_PATH = os.path.join(ROOT_DIR, "context", "research", "agent_run_index.md")
ACTIVE_RUN_PATH = os.path.join(RUNS_DIR, ".active_run")
SCHEMA_VERSION = "1.0"

CADENCE_MAP = {
    "daily": "DAILY",
    "weekly": "WEEKLY",
    "event_driven": "EVENT_DRIVEN",
    "event-driven": "EVENT_DRIVEN",
    "scheduled": "SCHEDULED",
    "on_demand": "ON_DEMAND",
    "on-demand": "ON_DEMAND",
    "rare_audit": "RARE_AUDIT",
    "rare-audit": "RARE_AUDIT",
}

TRIGGERS = {
    "weekly_deliberation", "thesis_authoring", "research_refresh",
    "equity_onboarding", "sentiment_surveillance", "invalidation_review",
    "qc_audit", "script_hook", "manual",
}

EVENT_TYPES = {
    "RESEARCH_FIELD_AUTHORED", "RESEARCH_FIELD_UPDATED", "RATING_CHANGED",
    "CATALYST_STATUS_CHANGED", "THESIS_RENDERED", "INVALIDATION_ALERT_ISSUED",
    "ERRATA_LINKED", "SENTIMENT_OBSERVATION_RECORDED",
    "SHORT_SELLER_CAMPAIGN_RECORDED", "EQUITY_ONBOARDED", "QC_AUDIT_COMPLETED",
    "DELIBERATION_COMPLETED",
}


def utc_now_iso():
    return datetime.now(timezone.utc).isoformat()


def today_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def ensure_runs_dir():
    os.makedirs(RUNS_DIR, exist_ok=True)


def read_active_run_id():
    if not os.path.exists(ACTIVE_RUN_PATH):
        return None
    try:
        run_id = open(ACTIVE_RUN_PATH, "r", encoding="utf-8").read().strip()
        return run_id or None
    except OSError:
        return None


def write_active_run_id(run_id):
    ensure_runs_dir()
    with open(ACTIVE_RUN_PATH, "w", encoding="utf-8") as f:
        f.write(run_id)


def clear_active_run_id():
    if os.path.exists(ACTIVE_RUN_PATH):
        os.remove(ACTIVE_RUN_PATH)


def run_file_path(run_id):
    return os.path.join(RUNS_DIR, f"{run_id}.json")


def load_run(run_id):
    path = run_file_path(run_id)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_run(run):
    ensure_runs_dir()
    path = run_file_path(run["run_id"])
    with open(path, "w", encoding="utf-8") as f:
        json.dump(run, f, indent=2)
        f.write("\n")
    return path


def list_run_ids():
    if not os.path.isdir(RUNS_DIR):
        return []
    ids = []
    for name in os.listdir(RUNS_DIR):
        if name.endswith(".json"):
            ids.append(name[:-5])
    return sorted(ids)


def next_id(prefix, date_str=None):
    date_str = date_str or today_str()
    pattern = re.compile(rf"^{re.escape(prefix)}-{re.escape(date_str)}-(\d{{3}})$")
    max_seq = 0
    for run_id in list_run_ids():
        m = pattern.match(run_id)
        if m:
            max_seq = max(max_seq, int(m.group(1)))
    return f"{prefix}-{date_str}-{max_seq + 1:03d}"


def next_event_id(run):
    date_str = today_str()
    pattern = re.compile(rf"^EVT-{re.escape(date_str)}-(\d{{3}})$")
    max_seq = 0
    for event in run.get("events") or []:
        eid = event.get("event_id") or ""
        m = pattern.match(eid)
        if m:
            max_seq = max(max_seq, int(m.group(1)))
    return f"EVT-{date_str}-{max_seq + 1:03d}"


def normalize_cadence(value):
    key = (value or "").strip().lower().replace(" ", "_")
    if key in CADENCE_MAP:
        return CADENCE_MAP[key]
    upper = (value or "").strip().upper()
    if upper in CADENCE_MAP.values():
        return upper
    raise ValueError(f"Unknown cadence: {value}")


def validate_run_record(run, require_terminal=False):
    errors = []
    for key in ("run_id", "schema_version", "started_at", "status", "cadence",
                "trigger", "agent_roles", "events"):
        if key not in run:
            errors.append(f"missing required field: {key}")
    if run.get("schema_version") != SCHEMA_VERSION:
        errors.append(f"schema_version must be {SCHEMA_VERSION}")
    status = run.get("status")
    if status not in ("IN_PROGRESS", "COMPLETED", "ABORTED"):
        errors.append(f"invalid status: {status}")
    if run.get("trigger") not in TRIGGERS:
        errors.append(f"invalid trigger: {run.get('trigger')}")
    if not isinstance(run.get("agent_roles"), list) or not run["agent_roles"]:
        errors.append("agent_roles must be a non-empty array")
    if require_terminal and status == "IN_PROGRESS":
        errors.append("run is still IN_PROGRESS")
    if require_terminal and status in ("COMPLETED", "ABORTED") and not run.get("summary"):
        errors.append("summary required for COMPLETED/ABORTED runs")
    run_id = run.get("run_id") or ""
    if run_id.startswith("RUN-") and not run.get("runtime_context_signature"):
        errors.append("runtime_context_signature required for RUN-* sessions")
    for i, event in enumerate(run.get("events") or []):
        for ek in ("event_id", "recorded_at", "event_type", "agent_role", "subject"):
            if not event.get(ek):
                errors.append(f"events[{i}] missing {ek}")
        if event.get("event_type") not in EVENT_TYPES:
            errors.append(f"events[{i}] invalid event_type: {event.get('event_type')}")
    return errors


def hash_text(value):
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        payload = json.dumps(value, sort_keys=True, ensure_ascii=True)
    else:
        payload = str(value)
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    return f"sha256:{digest}"


def diff_research_field(field, before_val, after_val):
    if before_val == after_val:
        return None
    if isinstance(before_val, (int, float)) and isinstance(after_val, (int, float)):
        return {"field": field, "before": before_val, "after": after_val}
    if isinstance(before_val, dict) and isinstance(after_val, dict):
        if "text" in before_val or "text" in after_val:
            btext = before_val.get("text") if isinstance(before_val, dict) else before_val
            atext = after_val.get("text") if isinstance(after_val, dict) else after_val
            return {
                "field": field,
                "before_chars": len(str(btext or "")),
                "after_chars": len(str(atext or "")),
                "before_hash": hash_text(btext),
                "after_hash": hash_text(atext),
            }
    if isinstance(before_val, list) or isinstance(after_val, list):
        return {
            "field": field,
            "before_count": len(before_val or []),
            "after_count": len(after_val or []),
            "before_hash": hash_text(before_val),
            "after_hash": hash_text(after_val),
        }
    return {
        "field": field,
        "before_hash": hash_text(before_val),
        "after_hash": hash_text(after_val),
    }


def append_event(run_id, event_type, agent_role, subject, symbol=None,
                 target_path=None, rationale=None, change=None,
                 authority_tier=None, source_locator=None, related_ids=None):
    run = load_run(run_id)
    if run is None:
        raise ValueError(f"Run not found: {run_id}")
    event = {
        "event_id": next_event_id(run),
        "recorded_at": utc_now_iso(),
        "event_type": event_type,
        "agent_role": agent_role,
        "subject": subject,
    }
    if symbol:
        event["symbol"] = symbol.upper()
    if target_path:
        event["target_path"] = target_path
    if rationale:
        event["rationale"] = rationale
    if change is not None:
        event["change"] = change
    if authority_tier:
        event["authority_tier"] = authority_tier
    if source_locator:
        event["source_locator"] = source_locator
    if related_ids:
        event["related_ids"] = list(related_ids)
    run.setdefault("events", []).append(event)
    save_run(run)
    return event


def log_research_diff(symbol, old_research, new_research, agent_role="Deterministic Script"):
    symbol = symbol.upper()
    fields = set()
    if old_research:
        fields.update(old_research.keys())
    if new_research:
        fields.update(new_research.keys())
    skip = {"symbol", "schema_version"}
    events = []
    for field in sorted(fields - skip):
        before_val = (old_research or {}).get(field)
        after_val = (new_research or {}).get(field)
        if before_val == after_val:
            continue
        if before_val is None:
            event_type = "RESEARCH_FIELD_AUTHORED"
            subject = f"Authored research.{field} for {symbol}"
        else:
            event_type = "RESEARCH_FIELD_UPDATED"
            subject = f"Updated research.{field} for {symbol}"
        change = diff_research_field(field, before_val, after_val)
        evt = append_event_to_active_or_sys(
            event_type=event_type,
            agent_role=agent_role,
            subject=subject,
            symbol=symbol,
            target_path=f"context/data/equities/{symbol}.json#research.{field}",
            change=change,
            trigger="script_hook",
        )
        events.append(evt)
    return events


def get_or_create_sys_run(trigger="script_hook"):
    active = read_active_run_id()
    if active:
        run = load_run(active)
        if run and run.get("status") == "IN_PROGRESS":
            return active
    run_id = next_id("SYS")
    run = {
        "run_id": run_id,
        "schema_version": SCHEMA_VERSION,
        "started_at": utc_now_iso(),
        "completed_at": utc_now_iso(),
        "status": "COMPLETED",
        "cadence": "ON_DEMAND",
        "trigger": trigger,
        "agent_roles": ["Deterministic Script"],
        "prompt_ref": None,
        "runtime_context_signature": None,
        "summary": "Script auto-hook session",
        "deliverables": [],
        "events": [],
    }
    save_run(run)
    return run_id


def append_event_to_active_or_sys(event_type, agent_role, subject, **kwargs):
    active = read_active_run_id()
    if active:
        run = load_run(active)
        if run and run.get("status") == "IN_PROGRESS":
            return append_event(active, event_type, agent_role, subject, **kwargs)
    run_id = get_or_create_sys_run(kwargs.pop("trigger", "script_hook"))
    run = load_run(run_id)
    if run.get("status") == "COMPLETED" and not run.get("events"):
        run["status"] = "IN_PROGRESS"
        run["completed_at"] = None
        save_run(run)
    return append_event(run_id, event_type, agent_role, subject, **kwargs)


def cmd_start_run(args):
    if read_active_run_id():
        print("ERROR: An active run already exists. End or abort it first.", file=sys.stderr)
        return 1
    ensure_runs_dir()
    run_id = next_id("RUN")
    agents = [a.strip() for a in args.agents.split(",") if a.strip()]
    if not agents:
        print("ERROR: --agents required", file=sys.stderr)
        return 1
    cadence = normalize_cadence(args.cadence)
    if args.trigger not in TRIGGERS:
        print(f"ERROR: invalid trigger: {args.trigger}", file=sys.stderr)
        return 1
    if not args.signature:
        print("ERROR: --signature required for RUN-* sessions", file=sys.stderr)
        return 1
    run = {
        "run_id": run_id,
        "schema_version": SCHEMA_VERSION,
        "started_at": utc_now_iso(),
        "completed_at": None,
        "status": "IN_PROGRESS",
        "cadence": cadence,
        "trigger": args.trigger,
        "agent_roles": agents,
        "prompt_ref": args.prompt,
        "runtime_context_signature": args.signature,
        "summary": None,
        "deliverables": [],
        "events": [],
    }
    errors = validate_run_record(run)
    if errors:
        for err in errors:
            print(f"ERROR: {err}", file=sys.stderr)
        return 1
    save_run(run)
    write_active_run_id(run_id)
    print(run_id)
    return 0


def cmd_end_run(args):
    run_id = args.run_id or read_active_run_id()
    if not run_id:
        print("ERROR: no active run", file=sys.stderr)
        return 1
    run = load_run(run_id)
    if not run:
        print(f"ERROR: run not found: {run_id}", file=sys.stderr)
        return 1
    if not args.summary:
        print("ERROR: --summary required", file=sys.stderr)
        return 1
    run["status"] = "COMPLETED"
    run["completed_at"] = utc_now_iso()
    run["summary"] = args.summary
    if args.deliverable:
        run.setdefault("deliverables", [])
        for path in args.deliverable:
            if path not in run["deliverables"]:
                run["deliverables"].append(path)
    errors = validate_run_record(run, require_terminal=True)
    if errors:
        for err in errors:
            print(f"ERROR: {err}", file=sys.stderr)
        return 1
    save_run(run)
    if read_active_run_id() == run_id:
        clear_active_run_id()
    print(f"Completed {run_id}")
    return 0


def cmd_abort_run(args):
    run_id = args.run_id or read_active_run_id()
    if not run_id:
        print("ERROR: no active run", file=sys.stderr)
        return 1
    run = load_run(run_id)
    if not run:
        print(f"ERROR: run not found: {run_id}", file=sys.stderr)
        return 1
    if not args.summary:
        print("ERROR: --summary required", file=sys.stderr)
        return 1
    run["status"] = "ABORTED"
    run["completed_at"] = utc_now_iso()
    run["summary"] = args.summary
    save_run(run)
    if read_active_run_id() == run_id:
        clear_active_run_id()
    print(f"Aborted {run_id}")
    return 0


def cmd_log_event(args):
    run_id = args.run_id or read_active_run_id()
    if not run_id:
        print("ERROR: no active run; pass --run-id", file=sys.stderr)
        return 1
    if args.type not in EVENT_TYPES:
        print(f"ERROR: invalid event type: {args.type}", file=sys.stderr)
        return 1
    if not args.agent:
        print("ERROR: --agent required", file=sys.stderr)
        return 1
    if not args.subject:
        print("ERROR: --subject required", file=sys.stderr)
        return 1
    related = args.related_ids.split(",") if args.related_ids else None
    event = append_event(
        run_id,
        args.type,
        args.agent,
        args.subject,
        symbol=args.symbol,
        target_path=args.target_path,
        rationale=args.rationale,
        change=json.loads(args.change) if args.change else None,
        authority_tier=args.authority_tier,
        source_locator=args.source_locator,
        related_ids=related,
    )
    print(event["event_id"])
    return 0


def load_all_runs():
    runs = []
    for run_id in list_run_ids():
        run = load_run(run_id)
        if run:
            runs.append(run)
    runs.sort(key=lambda r: r.get("started_at") or "", reverse=True)
    return runs


def cmd_summary(_args):
    runs = load_all_runs()
    by_status = {}
    by_trigger = {}
    by_type = {}
    for run in runs:
        by_status[run.get("status", "UNKNOWN")] = by_status.get(run.get("status", "UNKNOWN"), 0) + 1
        by_trigger[run.get("trigger", "unknown")] = by_trigger.get(run.get("trigger", "unknown"), 0) + 1
        for event in run.get("events") or []:
            et = event.get("event_type", "UNKNOWN")
            by_type[et] = by_type.get(et, 0) + 1
    active = read_active_run_id()
    print("=" * 60)
    print("AGENT RUN LOG SUMMARY")
    print("=" * 60)
    print(f"Total runs: {len(runs)}")
    print(f"Active run: {active or 'none'}")
    print("\nBy status:")
    for k, v in sorted(by_status.items()):
        print(f"  {k}: {v}")
    print("\nBy trigger:")
    for k, v in sorted(by_trigger.items()):
        print(f"  {k}: {v}")
    if by_type:
        print("\nEvent types:")
        for k, v in sorted(by_type.items()):
            print(f"  {k}: {v}")
    return 0


def cmd_list_runs(args):
    runs = load_all_runs()
    if args.limit:
        runs = runs[: args.limit]
    for run in runs:
        print(
            f"{run['run_id']}\t{run.get('status')}\t{run.get('trigger')}\t"
            f"{len(run.get('events') or [])} events\t{run.get('summary') or ''}"
        )
    return 0


def cmd_query(args):
    runs = load_all_runs()
    matches = []
    for run in runs:
        if args.run_id and run.get("run_id") != args.run_id:
            continue
        for event in run.get("events") or []:
            if args.symbol and (event.get("symbol") or "").upper() != args.symbol.upper():
                continue
            if args.event_type and event.get("event_type") != args.event_type:
                continue
            matches.append({"run_id": run["run_id"], **event})
    if args.limit:
        matches = matches[: args.limit]
    if args.format == "json":
        print(json.dumps(matches, indent=2))
    else:
        for m in matches:
            print(
                f"{m.get('run_id')}\t{m.get('event_id')}\t{m.get('event_type')}\t"
                f"{m.get('symbol') or '-'}\t{m.get('subject')}"
            )
    return 0


def cmd_validate(_args):
    errors = []
    active = read_active_run_id()
    for run_id in list_run_ids():
        run = load_run(run_id)
        if not run:
            errors.append(f"{run_id}: unreadable")
            continue
        run_errors = validate_run_record(
            run, require_terminal=run.get("status") in ("COMPLETED", "ABORTED")
        )
        for err in run_errors:
            errors.append(f"{run_id}: {err}")
    if active:
        if not load_run(active):
            errors.append(f".active_run points to missing file: {active}")
    if errors:
        for err in errors:
            print(f"INVALID: {err}", file=sys.stderr)
        return 1
    print(f"Validated {len(list_run_ids())} run file(s).")
    return 0


def cmd_render_index(_args):
    runs = load_all_runs()
    lines = [
        "# Agent Run Index",
        "",
        "Generated index of agent run logs in `context/research/runs/`. "
        "Do not edit by hand; regenerate with `python scripts/activity_ledger.py render-index`.",
        "",
        "| Run ID | Started | Status | Trigger | Agents | Events | Summary |",
        "| :--- | :--- | :--- | :--- | :--- | ---: | :--- |",
    ]
    for run in runs:
        agents = ", ".join(run.get("agent_roles") or [])
        summary = (run.get("summary") or "").replace("|", "\\|")
        if len(summary) > 80:
            summary = summary[:77] + "..."
        started = (run.get("started_at") or "")[:10]
        lines.append(
            f"| {run['run_id']} | {started} | {run.get('status')} | "
            f"{run.get('trigger')} | {agents} | {len(run.get('events') or [])} | {summary} |"
        )
    with open(INDEX_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"Wrote {INDEX_PATH}")
    return 0


def main():
    parser = argparse.ArgumentParser(
        description="Deterministic CLI for agent run logs (context/research/runs/)."
    )
    sub = parser.add_subparsers(dest="command")

    p = sub.add_parser("start-run", help="Begin a generative agent session")
    p.add_argument("--cadence", required=True)
    p.add_argument("--trigger", required=True)
    p.add_argument("--agents", required=True, help="Comma-separated agent role names")
    p.add_argument("--prompt", default=None)
    p.add_argument("--signature", required=True)

    p = sub.add_parser("end-run", help="Complete the active or specified run")
    p.add_argument("--run-id", default=None)
    p.add_argument("--summary", required=True)
    p.add_argument("--deliverable", action="append", default=[])

    p = sub.add_parser("abort-run", help="Abort the active or specified run")
    p.add_argument("--run-id", default=None)
    p.add_argument("--summary", required=True)

    p = sub.add_parser("log-event", help="Append an event to a run")
    p.add_argument("--run-id", default=None)
    p.add_argument("--type", required=True)
    p.add_argument("--agent", required=True)
    p.add_argument("--subject", required=True)
    p.add_argument("--symbol", default=None)
    p.add_argument("--target-path", default=None)
    p.add_argument("--rationale", default=None)
    p.add_argument("--change", default=None, help="JSON object")
    p.add_argument("--authority-tier", default=None)
    p.add_argument("--source-locator", default=None)
    p.add_argument("--related-ids", default=None, help="Comma-separated IDs")

    sub.add_parser("summary")
    p = sub.add_parser("list-runs")
    p.add_argument("--limit", type=int, default=None)
    p = sub.add_parser("query")
    p.add_argument("--run-id", default=None)
    p.add_argument("--symbol", default=None)
    p.add_argument("--event-type", default=None)
    p.add_argument("--limit", type=int, default=20)
    p.add_argument("--format", choices=["text", "json"], default="text")
    sub.add_parser("validate")
    sub.add_parser("render-index")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        return 1

    handlers = {
        "start-run": cmd_start_run,
        "end-run": cmd_end_run,
        "abort-run": cmd_abort_run,
        "log-event": cmd_log_event,
        "summary": cmd_summary,
        "list-runs": cmd_list_runs,
        "query": cmd_query,
        "validate": cmd_validate,
        "render-index": cmd_render_index,
    }
    return handlers[args.command](args)


if __name__ == "__main__":
    sys.exit(main() or 0)
