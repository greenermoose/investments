#!/usr/bin/env python3
"""Write one immutable private forecast/outcome scoring event per file."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

from experiment_contract import EXPERIMENT_STATUS


def weighted(scenarios, field):
    values = []
    for name in ("bear", "base", "bull"):
        scenario = scenarios.get(name, {})
        value = scenario.get(field)
        probability = scenario.get("probability")
        if not isinstance(value, (int, float)) or not isinstance(probability, (int, float)):
            return None
        values.append(float(value) * float(probability))
    return sum(values)


def main():
    parser = argparse.ArgumentParser(description="Score one frozen experimental forecast against observed outcomes.")
    parser.add_argument("--forecast", required=True, type=Path)
    parser.add_argument("--actual", required=True, type=Path)
    parser.add_argument("--output-root", type=Path)
    args = parser.parse_args()
    forecast = json.loads(args.forecast.read_text(encoding="utf-8"))
    actual = json.loads(args.actual.read_text(encoding="utf-8"))
    if forecast.get("experiment_status") != EXPERIMENT_STATUS:
        raise ValueError("forecast is not an EXPERIMENTAL frozen snapshot")
    if forecast.get("symbol") != str(actual.get("symbol", "")).upper():
        raise ValueError("forecast and actual symbol do not match")
    refs = actual.get("source_refs") or []
    if not refs:
        raise ValueError("actual outcome requires at least one source reference")

    scenarios = forecast.get("scenarios") or {}
    metrics = {}
    mapping = {
        "annual_revenue_growth": "actual_annual_revenue_growth",
        "annual_share_dilution_rate": "actual_annual_share_dilution_rate",
        "price_target": "actual_price",
    }
    for forecast_field, actual_field in mapping.items():
        expected = weighted(scenarios, forecast_field)
        observed = actual.get(actual_field)
        if expected is not None and isinstance(observed, (int, float)):
            metrics[forecast_field] = {
                "expected": expected,
                "observed": observed,
                "error": observed - expected,
                "absolute_error": abs(observed - expected),
            }

    catalyst_scores = []
    for event in actual.get("catalyst_outcomes", []):
        probability = event.get("forecast_probability")
        occurred = event.get("occurred")
        if isinstance(probability, (int, float)) and isinstance(occurred, bool):
            outcome = 1.0 if occurred else 0.0
            catalyst_scores.append((float(probability) - outcome) ** 2)
    metrics["catalyst_brier_score"] = sum(catalyst_scores) / len(catalyst_scores) if catalyst_scores else None

    option_errors = []
    slippage = []
    fills = actual.get("option_outcomes", [])
    for item in fills:
        modeled = item.get("modeled_reservation_value")
        observed = item.get("observed_mid")
        fill = item.get("fill_price")
        proposal = item.get("proposal_limit")
        if isinstance(modeled, (int, float)) and isinstance(observed, (int, float)):
            option_errors.append(float(observed) - float(modeled))
        if isinstance(fill, (int, float)) and isinstance(proposal, (int, float)):
            slippage.append(float(fill) - float(proposal))
    metrics["option_premium_mean_error"] = sum(option_errors) / len(option_errors) if option_errors else None
    metrics["option_fill_rate"] = sum(1 for item in fills if item.get("filled")) / len(fills) if fills else None
    metrics["mean_fill_slippage"] = sum(slippage) / len(slippage) if slippage else None

    scored_at = datetime.now(timezone.utc).isoformat()
    identity = hashlib.sha256(
        (forecast["snapshot_id"] + "|" + hashlib.sha256(args.actual.read_bytes()).hexdigest()).encode("utf-8")
    ).hexdigest()
    payload = {
        "experiment_status": EXPERIMENT_STATUS,
        "score_event_id": "SCORE-" + identity[:20].upper(),
        "forecast_snapshot_id": forecast["snapshot_id"],
        "symbol": forecast["symbol"],
        "scored_at": scored_at,
        "metrics": metrics,
        "actual_source_refs": refs,
    }
    root = args.output_root or Path(__file__).resolve().parents[1] / "private" / "logs" / "scoring"
    root.mkdir(parents=True, exist_ok=True)
    output_path = root / f"{payload['score_event_id']}.json"
    encoded = json.dumps(payload, indent=2) + "\n"
    if output_path.exists() and output_path.read_text(encoding="utf-8") != encoded:
        raise RuntimeError(f"immutable score event collision: {output_path}")
    output_path.write_text(encoded, encoding="utf-8")
    print(output_path)


if __name__ == "__main__":
    main()
