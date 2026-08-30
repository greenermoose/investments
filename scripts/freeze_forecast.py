#!/usr/bin/env python3
"""Freeze an agent-authored experimental forecast as an immutable public file."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

from experiment_contract import EXPERIMENT_STATUS, EXPERIMENTAL_WARNING


def main():
    parser = argparse.ArgumentParser(description="Freeze an immutable prospective forecast snapshot.")
    parser.add_argument("forecast_json", type=Path, help="Agent-authored forecast body")
    parser.add_argument("--data-snapshot-id", required=True)
    parser.add_argument("--model-version", required=True)
    parser.add_argument("--prompt-version", required=True)
    parser.add_argument("--output-root", type=Path)
    args = parser.parse_args()

    authored = json.loads(args.forecast_json.read_text(encoding="utf-8"))
    symbol = str(authored.get("symbol", "")).upper()
    scenarios = authored.get("scenarios") or {}
    if not symbol or set(scenarios) != {"bear", "base", "bull"}:
        raise ValueError("forecast must contain symbol and exactly bear/base/bull scenarios")
    probabilities = [scenarios[name].get("probability") for name in ("bear", "base", "bull")]
    if not all(isinstance(value, (int, float)) for value in probabilities) or abs(sum(probabilities) - 1.0) > 1e-9:
        raise ValueError("scenario probabilities must be numeric and sum to 1.0")
    evidence_refs = authored.get("evidence_refs") or []
    limitations = authored.get("known_limitations") or []
    if not evidence_refs or not limitations:
        raise ValueError("evidence_refs and known_limitations are required")

    created_at = datetime.now(timezone.utc).isoformat()
    body = {
        "experiment_status": EXPERIMENT_STATUS,
        "experimental_warning": EXPERIMENTAL_WARNING,
        "created_at": created_at,
        "data_snapshot_id": args.data_snapshot_id,
        "model_version": args.model_version,
        "prompt_version": args.prompt_version,
        "symbol": symbol,
        "horizon": authored.get("horizon", "3Y"),
        "scenarios": scenarios,
        "evidence_refs": evidence_refs,
        "known_limitations": limitations,
    }
    content_hash = hashlib.sha256(json.dumps(body, sort_keys=True).encode("utf-8")).hexdigest()
    body["snapshot_id"] = "FCST-" + content_hash[:20].upper()
    body["content_hash"] = content_hash
    root = args.output_root or Path(__file__).resolve().parents[1] / "context" / "research" / "forecasts"
    root.mkdir(parents=True, exist_ok=True)
    output_path = root / f"{body['snapshot_id']}.json"
    encoded = json.dumps(body, indent=2) + "\n"
    if output_path.exists() and output_path.read_text(encoding="utf-8") != encoded:
        raise RuntimeError(f"immutable forecast collision: {output_path}")
    output_path.write_text(encoded, encoding="utf-8")
    print(output_path)


if __name__ == "__main__":
    main()
