#!/usr/bin/env python3
"""Write one immutable private experimental execution log event per JSON file."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

from experiment_contract import EXPERIMENT_STATUS


EVENT_TYPES = {
    "SUBMITTED", "FILLED", "PARTIALLY_FILLED", "REJECTED", "CANCELLED",
    "UNFILLED", "ASSIGNED", "EXERCISED", "EXPIRED", "DIVIDEND", "CASH_FLOW",
}


def main():
    parser = argparse.ArgumentParser(description="Record one private experimental execution event.")
    parser.add_argument("--proposal-id", required=True)
    parser.add_argument("--account", required=True)
    parser.add_argument("--event-type", required=True, choices=sorted(EVENT_TYPES))
    parser.add_argument("--symbol", required=True)
    parser.add_argument("--security-type", required=True, choices=["EQUITY", "OPTION", "CASH"])
    parser.add_argument("--quantity", required=True, type=float)
    parser.add_argument("--price", type=float)
    parser.add_argument("--fees", required=True, type=float)
    parser.add_argument("--recorded-at", default=None)
    parser.add_argument("--option-type", choices=["PUT", "CALL"])
    parser.add_argument("--strike", type=float)
    parser.add_argument("--expiration")
    parser.add_argument("--multiplier", type=int)
    parser.add_argument("--notes")
    parser.add_argument("--output-root", type=Path)
    args = parser.parse_args()
    if args.fees < 0:
        parser.error("fees cannot be negative")
    if args.security_type == "OPTION" and not all((args.option_type, args.strike, args.expiration, args.multiplier)):
        parser.error("option events require option type, strike, expiration, and multiplier")

    recorded_at = args.recorded_at or datetime.now(timezone.utc).isoformat()
    identity = f"{args.proposal_id}|{args.account}|{recorded_at}|{args.event_type}|{args.symbol}|{args.quantity}"
    event_id = "EVT-" + hashlib.sha256(identity.encode("utf-8")).hexdigest()[:24].upper()
    payload = {
        "experiment_status": EXPERIMENT_STATUS,
        "event_id": event_id,
        "proposal_id": args.proposal_id,
        "account_name": args.account,
        "recorded_at": recorded_at,
        "event_type": args.event_type,
        "symbol": args.symbol.upper(),
        "security_type": args.security_type,
        "quantity": args.quantity,
        "price": args.price,
        "fees_usd": args.fees,
        "option_type": args.option_type,
        "strike": args.strike,
        "expiration": args.expiration,
        "multiplier": args.multiplier,
        "notes": args.notes,
    }
    root = args.output_root or Path(__file__).resolve().parents[1] / "private" / "logs" / "execution"
    root.mkdir(parents=True, exist_ok=True)
    output_path = root / f"{event_id}.json"
    encoded = json.dumps(payload, indent=2) + "\n"
    if output_path.exists() and output_path.read_text(encoding="utf-8") != encoded:
        raise RuntimeError(f"immutable event collision: {output_path}")
    output_path.write_text(encoded, encoding="utf-8")
    print(output_path)


if __name__ == "__main__":
    main()
