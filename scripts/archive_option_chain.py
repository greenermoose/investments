#!/usr/bin/env python3
"""Archive a delayed Cboe option-chain CSV as an immutable experimental snapshot.

The input is a CSV downloaded from Cboe's delayed quote table. The script never
invents a strike, expiration, quote, volatility, or Greek. Invalid rows are
rejected and a snapshot is written only when at least one valid contract remains.
"""

from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import sys

from experiment_contract import EXPERIMENT_STATUS


ALIASES = {
    "option_type": ("option_type", "type", "put_call", "put/call", "call_put"),
    "expiration": ("expiration", "expiration_date", "expiry", "exp_date"),
    "strike": ("strike", "strike_price"),
    "bid": ("bid", "bid_price"),
    "ask": ("ask", "ask_price"),
    "last": ("last", "last_price"),
    "volume": ("volume", "vol"),
    "open_interest": ("open_interest", "openinterest", "oi"),
    "implied_volatility": ("implied_volatility", "iv", "imp_volatility"),
    "market_delta": ("delta", "market_delta"),
    "gamma": ("gamma",),
}


def _normalized_header(value):
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")


def _value(row, name):
    normalized = {_normalized_header(key): value for key, value in row.items() if key is not None}
    for alias in ALIASES[name]:
        key = _normalized_header(alias)
        if key in normalized and str(normalized[key]).strip() != "":
            return str(normalized[key]).strip()
    return None


def _number(value, integer=False):
    if value in (None, "", "N/A", "--"):
        return None
    cleaned = str(value).replace("$", "").replace(",", "").replace("%", "").strip()
    number = float(cleaned)
    return int(number) if integer else number


def _date(value):
    if not value:
        raise ValueError("missing expiration")
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y"):
        try:
            return datetime.strptime(value, fmt).date().isoformat()
        except ValueError:
            pass
    raise ValueError(f"unsupported expiration date: {value}")


def normalize_contract(row):
    option_type = (_value(row, "option_type") or "").upper()
    if option_type in {"C", "CALLS"}:
        option_type = "CALL"
    if option_type in {"P", "PUTS"}:
        option_type = "PUT"
    if option_type not in {"PUT", "CALL"}:
        raise ValueError("option type must be PUT or CALL")

    strike = _number(_value(row, "strike"))
    bid = _number(_value(row, "bid"))
    ask = _number(_value(row, "ask"))
    if strike is None or strike <= 0:
        raise ValueError("strike must be positive")
    if bid is None or ask is None or bid < 0 or ask < 0:
        raise ValueError("bid and ask must be non-negative")
    if bid > ask:
        raise ValueError("crossed market: bid exceeds ask")

    iv = _number(_value(row, "implied_volatility"))
    if iv is not None and iv > 3.0:
        iv /= 100.0
    spread = ask - bid
    midpoint = (ask + bid) / 2.0
    return {
        "option_type": option_type,
        "expiration": _date(_value(row, "expiration")),
        "strike": strike,
        "bid": bid,
        "ask": ask,
        "last": _number(_value(row, "last")),
        "volume": _number(_value(row, "volume"), integer=True),
        "open_interest": _number(_value(row, "open_interest"), integer=True),
        "implied_volatility": iv,
        "market_delta": _number(_value(row, "market_delta")),
        "gamma": _number(_value(row, "gamma")),
        "spread": round(spread, 6),
        "spread_pct_of_mid": round((spread / midpoint) * 100.0, 4) if midpoint > 0 else None,
    }


def build_snapshot(csv_path, symbol, observed_at, source_locator, delay_minutes, underlying_price,
                   risk_free_rate=None, earnings_date=None, dividend_date=None):
    raw = csv_path.read_bytes()
    raw_hash = hashlib.sha256(raw).hexdigest()
    contracts = []
    rejected = []
    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        for row_number, row in enumerate(csv.DictReader(handle), start=2):
            try:
                contracts.append(normalize_contract(row))
            except (TypeError, ValueError) as exc:
                rejected.append({"row": row_number, "reason": str(exc)})
    if not contracts:
        raise ValueError("no valid option contracts were found")

    identity = f"{symbol.upper()}|{observed_at}|{raw_hash}".encode("utf-8")
    snapshot_id = "OPT-" + hashlib.sha256(identity).hexdigest()[:20].upper()
    return {
        "experiment_status": EXPERIMENT_STATUS,
        "snapshot_id": snapshot_id,
        "symbol": symbol.upper(),
        "observed_at": observed_at,
        "source_locator": source_locator,
        "source_delay_minutes": delay_minutes,
        "underlying_price": underlying_price,
        "risk_free_rate": risk_free_rate,
        "next_earnings_date": earnings_date,
        "next_dividend_date": dividend_date,
        "raw_content_hash": raw_hash,
        "contracts": contracts,
        "rejected_rows": rejected,
        "experimental_warning": (
            "Delayed Friday-close observation for experimental modeling. It is not a live quote, "
            "and modeled reservation prices and deltas may be wrong."
        ),
    }


def main():
    parser = argparse.ArgumentParser(description="Archive a delayed Cboe option chain CSV.")
    parser.add_argument("csv_path", type=Path)
    parser.add_argument("--symbol", required=True)
    parser.add_argument("--observed-at", required=True, help="ISO timestamp from the delayed quote page")
    parser.add_argument("--underlying-price", required=True, type=float)
    parser.add_argument("--source-url", required=True)
    parser.add_argument("--delay-minutes", type=int, default=15)
    parser.add_argument("--risk-free-rate", type=float)
    parser.add_argument("--earnings-date")
    parser.add_argument("--dividend-date")
    parser.add_argument("--output-root", type=Path)
    args = parser.parse_args()
    if args.underlying_price <= 0 or args.delay_minutes < 0:
        parser.error("underlying price must be positive and delay must be non-negative")

    snapshot = build_snapshot(
        args.csv_path, args.symbol, args.observed_at, args.source_url,
        args.delay_minutes, args.underlying_price, args.risk_free_rate,
        args.earnings_date, args.dividend_date,
    )
    observed_date = datetime.fromisoformat(args.observed_at.replace("Z", "+00:00")).date().isoformat()
    root = args.output_root or Path(__file__).resolve().parents[1] / "context" / "data" / "option_chains"
    output_dir = root / observed_date
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{snapshot['snapshot_id']}.json"
    encoded = json.dumps(snapshot, indent=2) + "\n"
    if output_path.exists() and output_path.read_text(encoding="utf-8") != encoded:
        raise RuntimeError(f"immutable snapshot collision: {output_path}")
    output_path.write_text(encoded, encoding="utf-8")
    print(output_path)
    if snapshot["rejected_rows"]:
        print(f"Rejected {len(snapshot['rejected_rows'])} invalid CSV rows.", file=sys.stderr)


if __name__ == "__main__":
    main()
