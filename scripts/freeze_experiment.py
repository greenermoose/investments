#!/usr/bin/env python3
"""Freeze an immutable private weekly experimental input and proposal snapshot."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

from experiment_contract import EXPERIMENT_STATUS, EXPERIMENTAL_WARNING


def file_observation(path):
    raw = path.read_bytes()
    return {
        "path": str(path.resolve()),
        "sha256": hashlib.sha256(raw).hexdigest(),
        "size_bytes": len(raw),
    }


def main():
    parser = argparse.ArgumentParser(description="Freeze a private immutable experimental weekly snapshot.")
    parser.add_argument("--as-of", required=True, help="ISO as-of timestamp")
    parser.add_argument("--model-version", required=True)
    parser.add_argument("--prompt-version", required=True)
    parser.add_argument("--input", action="append", type=Path, required=True, help="Input file; repeat as needed")
    parser.add_argument("--proposal", action="append", type=Path, default=[], help="Experimental order proposal file")
    parser.add_argument("--missing", action="append", default=[])
    parser.add_argument("--stale", action="append", default=[])
    parser.add_argument("--anomaly", action="append", default=[])
    parser.add_argument("--output-root", type=Path)
    args = parser.parse_args()

    observations = [file_observation(path) for path in args.input]
    proposals = [file_observation(path) for path in args.proposal]
    identity_payload = {
        "as_of": args.as_of,
        "model_version": args.model_version,
        "prompt_version": args.prompt_version,
        "inputs": observations,
        "proposals": proposals,
    }
    identity = hashlib.sha256(json.dumps(identity_payload, sort_keys=True).encode("utf-8")).hexdigest()
    snapshot_id = "EXP-" + identity[:24].upper()
    payload = {
        "experiment_status": EXPERIMENT_STATUS,
        "experimental_warning": EXPERIMENTAL_WARNING,
        "snapshot_id": snapshot_id,
        "as_of": args.as_of,
        "frozen_at": datetime.now(timezone.utc).isoformat(),
        "model_version": args.model_version,
        "prompt_version": args.prompt_version,
        "missing_inputs": args.missing,
        "stale_inputs": args.stale,
        "anomalous_inputs": args.anomaly,
        "inputs": observations,
        "experimental_order_proposals": proposals,
        "content_hash": identity,
    }

    root = args.output_root or Path(__file__).resolve().parents[1] / "private" / "experiments"
    root.mkdir(parents=True, exist_ok=True)
    output_path = root / f"{snapshot_id}.json"
    encoded = json.dumps(payload, indent=2) + "\n"
    if output_path.exists() and output_path.read_text(encoding="utf-8") != encoded:
        raise RuntimeError(f"immutable snapshot collision: {output_path}")
    output_path.write_text(encoded, encoding="utf-8")
    print(output_path)


if __name__ == "__main__":
    main()
