#!/usr/bin/env python3
"""Build an immutable prospective US listing security-master snapshot.

Inputs are previously downloaded SEC company_tickers JSON and optional Nasdaq
Trader pipe-delimited directory files. The script preserves missing fields as
null and never guesses ADR status, exchange, IPO date, or delisting date.
"""

from __future__ import annotations

import argparse
import csv
from datetime import date, datetime, timezone
import hashlib
import json
from pathlib import Path

from experiment_contract import EXPERIMENT_STATUS


def read_pipe_directory(path):
    if not path:
        return {}
    records = {}
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle, delimiter="|"):
            symbol = (row.get("Symbol") or row.get("ACT Symbol") or "").strip().upper()
            if not symbol or symbol.startswith("File Creation Time"):
                continue
            test_issue = (row.get("Test Issue") or "N").strip().upper()
            if test_issue == "Y":
                continue
            records[symbol] = row
    return records


def main():
    parser = argparse.ArgumentParser(description="Build an immutable experimental security-master snapshot.")
    parser.add_argument("--sec-tickers", required=True, type=Path)
    parser.add_argument("--nasdaq-listed", type=Path)
    parser.add_argument("--other-listed", type=Path)
    parser.add_argument("--as-of-date", required=True)
    parser.add_argument("--output-root", type=Path)
    args = parser.parse_args()
    date.fromisoformat(args.as_of_date)

    sec_raw = args.sec_tickers.read_bytes()
    sec_data = json.loads(sec_raw.decode("utf-8-sig"))
    nasdaq = read_pipe_directory(args.nasdaq_listed)
    other = read_pipe_directory(args.other_listed)
    directory = {**other, **nasdaq}
    sources = [{"locator": str(args.sec_tickers.resolve()), "sha256": hashlib.sha256(sec_raw).hexdigest()}]
    for path in (args.nasdaq_listed, args.other_listed):
        if path:
            raw = path.read_bytes()
            sources.append({"locator": str(path.resolve()), "sha256": hashlib.sha256(raw).hexdigest()})

    securities = []
    for item in sec_data.values() if isinstance(sec_data, dict) else sec_data:
        ticker = str(item.get("ticker", "")).upper()
        if not ticker:
            continue
        listing = directory.get(ticker, {})
        exchange = "NASDAQ" if ticker in nasdaq else (listing.get("Exchange") or None)
        name = item.get("title") or listing.get("Security Name") or ticker
        etf_flag = (listing.get("ETF") or "").upper()
        listing_type = "ETF" if etf_flag == "Y" else None
        securities.append({
            "ticker": ticker,
            "former_tickers": [],
            "cik": str(item.get("cik_str")).zfill(10) if item.get("cik_str") is not None else None,
            "company_name": name,
            "exchange": exchange,
            "listing_status": "ACTIVE" if listing else "UNKNOWN",
            "listing_type": listing_type,
            "is_adr": None,
            "ipo_date": None,
            "delisting_date": None,
            "adr_ratio": None,
            "source_references": [source["sha256"] for source in sources],
        })
    securities.sort(key=lambda item: item["ticker"])
    content_hash = hashlib.sha256(json.dumps(securities, sort_keys=True).encode("utf-8")).hexdigest()
    payload = {
        "experiment_status": EXPERIMENT_STATUS,
        "snapshot_id": "SECMASTER-" + content_hash[:20].upper(),
        "as_of_date": args.as_of_date,
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "sources": sources,
        "securities": securities,
        "content_hash": content_hash,
    }
    root = args.output_root or Path(__file__).resolve().parents[1] / "context" / "data" / "security_master" / "snapshots"
    root.mkdir(parents=True, exist_ok=True)
    output_path = root / f"{args.as_of_date}-{payload['snapshot_id']}.json"
    encoded = json.dumps(payload, indent=2) + "\n"
    if output_path.exists() and output_path.read_text(encoding="utf-8") != encoded:
        raise RuntimeError(f"immutable security-master collision: {output_path}")
    output_path.write_text(encoded, encoding="utf-8")
    print(output_path)


if __name__ == "__main__":
    main()
