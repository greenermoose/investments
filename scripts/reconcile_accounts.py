#!/usr/bin/env python3
"""Write one immutable private reconciliation log event per account."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

from experiment_contract import EXPERIMENT_STATUS


def option_key(item):
    required = ("underlying", "option_type", "strike", "expiration", "side", "multiplier")
    if not item.get("contract_validated") or any(item.get(key) is None for key in required):
        return None
    return "|".join(str(item[key]) for key in required)


def main():
    parser = argparse.ArgumentParser(description="Reconcile consecutive private portfolio snapshots by account.")
    parser.add_argument("--previous", required=True, type=Path)
    parser.add_argument("--current", required=True, type=Path)
    parser.add_argument("--execution-log-root", type=Path)
    parser.add_argument("--output-root", type=Path)
    args = parser.parse_args()
    previous_accounts = {item["account_name"]: item for item in json.loads(args.previous.read_text(encoding="utf-8"))}
    current_accounts = {item["account_name"]: item for item in json.loads(args.current.read_text(encoding="utf-8"))}
    if set(previous_accounts) != set(current_accounts):
        raise ValueError("account sets differ; accounts must remain isolated and names must be stable")
    execution_root = args.execution_log_root or Path(__file__).resolve().parents[1] / "private" / "logs" / "execution"
    events = []
    if execution_root.exists():
        for path in execution_root.glob("EVT-*.json"):
            try:
                events.append(json.loads(path.read_text(encoding="utf-8")))
            except (OSError, ValueError):
                continue
    output_root = args.output_root or Path(__file__).resolve().parents[1] / "private" / "logs" / "reconciliation"
    output_root.mkdir(parents=True, exist_ok=True)

    for account_name in sorted(previous_accounts):
        previous = previous_accounts[account_name]
        current = current_accounts[account_name]
        anomalies = []
        previous_value = previous.get("total_account_value")
        current_value = current.get("total_account_value")
        flows = sum(float(item.get("amount_usd", 0)) for item in current.get("external_flows", []))
        value_change = current_value - previous_value if isinstance(current_value, (int, float)) and isinstance(previous_value, (int, float)) else None
        if value_change is None:
            anomalies.append("account value change cannot be calculated because a snapshot value is missing")

        previous_options = {option_key(item): item for item in previous.get("open_options", []) if option_key(item)}
        current_options = {option_key(item): item for item in current.get("open_options", []) if option_key(item)}
        if len(previous_options) != len(previous.get("open_options", [])) or len(current_options) != len(current.get("open_options", [])):
            anomalies.append("one or more option contracts could not be normalized")
        opened = sorted(set(current_options) - set(previous_options))
        closed = sorted(set(previous_options) - set(current_options))
        account_events = [item for item in events if item.get("account_name") == account_name]
        lifecycle_event_types = {item.get("event_type") for item in account_events}
        if opened and not lifecycle_event_types.intersection({"FILLED", "PARTIALLY_FILLED", "ASSIGNED"}):
            anomalies.append("opened option position lacks a matching execution lifecycle event")
        if closed and not lifecycle_event_types.intersection({"FILLED", "EXPIRED", "ASSIGNED", "EXERCISED"}):
            anomalies.append("closed option position lacks a matching execution lifecycle event")

        identity = f"{account_name}|{previous.get('data_snapshot_id')}|{current.get('data_snapshot_id')}"
        reconciliation_id = "RECON-" + hashlib.sha256(identity.encode("utf-8")).hexdigest()[:20].upper()
        payload = {
            "experiment_status": EXPERIMENT_STATUS,
            "reconciliation_id": reconciliation_id,
            "account_name": account_name,
            "reconciled_at": datetime.now(timezone.utc).isoformat(),
            "previous_snapshot_id": previous.get("data_snapshot_id"),
            "current_snapshot_id": current.get("data_snapshot_id"),
            "value_bridge": {
                "previous_value_usd": previous_value,
                "current_value_usd": current_value,
                "net_external_flow_usd": flows,
                "value_change_usd": value_change,
                "flow_neutral_change_usd": None if value_change is None else value_change - flows,
            },
            "option_lifecycle": {"opened": opened, "closed": closed, "execution_event_count": len(account_events)},
            "anomalies": anomalies,
        }
        output_path = output_root / f"{reconciliation_id}.json"
        encoded = json.dumps(payload, indent=2) + "\n"
        if output_path.exists() and output_path.read_text(encoding="utf-8") != encoded:
            raise RuntimeError(f"immutable reconciliation collision: {output_path}")
        output_path.write_text(encoded, encoding="utf-8")
        print(output_path)


if __name__ == "__main__":
    main()
