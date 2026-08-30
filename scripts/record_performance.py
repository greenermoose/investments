#!/usr/bin/env python3
"""Record a private prospective experimental performance snapshot."""

from __future__ import annotations

import argparse
from datetime import date
import hashlib
import json
import math
from pathlib import Path

from experiment_contract import EXPERIMENT_STATUS, EXPERIMENTAL_WARNING


def main():
    parser = argparse.ArgumentParser(description="Record net-of-fees, pre-tax experimental performance.")
    parser.add_argument("--account", required=True)
    parser.add_argument("--as-of-date", required=True)
    parser.add_argument("--account-value", required=True, type=float)
    parser.add_argument("--net-external-flow", required=True, type=float)
    parser.add_argument("--fees", required=True, type=float)
    parser.add_argument("--previous-value", required=True, type=float)
    parser.add_argument("--previous-twr", type=float, default=0.0)
    parser.add_argument("--spy", required=True, type=float)
    parser.add_argument("--qqq", required=True, type=float)
    parser.add_argument("--sgov", required=True, type=float)
    parser.add_argument("--cboe-put", type=float)
    parser.add_argument("--cboe-bxm", type=float)
    parser.add_argument("--data-snapshot-id")
    parser.add_argument("--source-ref", action="append", required=True)
    parser.add_argument("--attribution-json", type=Path)
    parser.add_argument("--output-root", type=Path)
    args = parser.parse_args()
    date.fromisoformat(args.as_of_date)
    if args.account_value < 0 or args.previous_value <= 0 or args.fees < 0:
        parser.error("values must be non-negative and previous value must be positive")

    period_return = ((args.account_value - args.net_external_flow) / args.previous_value) - 1.0
    prior_growth = 1.0 + args.previous_twr / 100.0
    twr = (prior_growth * (1.0 + period_return) - 1.0) * 100.0
    identity = f"{args.account}|{args.as_of_date}|{args.account_value}|{args.net_external_flow}"
    snapshot_id = "PERF-" + hashlib.sha256(identity.encode("utf-8")).hexdigest()[:20].upper()
    root = args.output_root or Path(__file__).resolve().parents[1] / "private" / "performance"
    historical = []
    if root.exists():
        for path in root.glob("PERF-*.json"):
            try:
                prior = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                continue
            if prior.get("account_name") == args.account:
                historical.append(prior)
    returns = [float(item["period_return_pct"]) / 100.0 for item in historical] + [period_return]
    mean_return = sum(returns) / len(returns)
    volatility = None
    downside_deviation = None
    if len(returns) >= 2:
        variance = sum((value - mean_return) ** 2 for value in returns) / (len(returns) - 1)
        volatility = math.sqrt(variance) * math.sqrt(52.0) * 100.0
        downside = [min(value, 0.0) for value in returns]
        downside_deviation = math.sqrt(sum(value * value for value in downside) / len(downside)) * math.sqrt(52.0) * 100.0
    growth = 1.0
    peak = 1.0
    maximum_drawdown = 0.0
    for value in returns:
        growth *= 1.0 + value
        peak = max(peak, growth)
        maximum_drawdown = min(maximum_drawdown, (growth / peak) - 1.0)
    attribution = {}
    if args.attribution_json:
        attribution = json.loads(args.attribution_json.read_text(encoding="utf-8"))

    payload = {
        "experiment_status": EXPERIMENT_STATUS,
        "experimental_warning": EXPERIMENTAL_WARNING,
        "source_refs": args.source_ref,
        "missing_inputs": [] if args.attribution_json else ["stock/timing/options/dividend/cash attribution not supplied"],
        "stale_inputs": [],
        "anomalous_inputs": [],
        "evidence_percentages": {"USER_BROKER_RECONCILIATION": 100.0},
        "snapshot_id": snapshot_id,
        "account_name": args.account,
        "as_of_date": args.as_of_date,
        "account_value_usd": args.account_value,
        "net_external_flow_usd": args.net_external_flow,
        "fees_usd": args.fees,
        "period_return_pct": round(period_return * 100.0, 8),
        "twr_since_inception_pct": round(twr, 8),
        "benchmark_returns_pct": {
            "SPY": args.spy, "QQQ": args.qqq, "SGOV": args.sgov,
            "CBOE_PUT": args.cboe_put, "CBOE_BXM": args.cboe_bxm,
        },
        "maximum_drawdown_pct": round(maximum_drawdown * 100.0, 8),
        "volatility_pct": None if volatility is None else round(volatility, 8),
        "downside_deviation_pct": None if downside_deviation is None else round(downside_deviation, 8),
        "attribution": attribution,
        "data_snapshot_id": args.data_snapshot_id,
    }
    root.mkdir(parents=True, exist_ok=True)
    output_path = root / f"{snapshot_id}.json"
    encoded = json.dumps(payload, indent=2) + "\n"
    if output_path.exists() and output_path.read_text(encoding="utf-8") != encoded:
        raise RuntimeError(f"immutable snapshot collision: {output_path}")
    output_path.write_text(encoded, encoding="utf-8")
    print(output_path)


if __name__ == "__main__":
    main()
