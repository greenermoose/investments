#!/usr/bin/env python3
"""
scripts/parse_snapshot.py
Deterministic Portfolio Snapshot Parser CLI for Portfolio Ingestion Agent.

Parses portfolio snapshot files (CSV or formatted text) from private/snapshots/,
extracts holdings, options, cash, and SGOV shares, isolates distinct accounts,
tags covered call eligibility (>= 100 shares), and outputs normalized portfolio state.
"""

import argparse
import csv
import json
import re
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
SNAPSHOTS_DIR = ROOT_DIR / "private" / "snapshots"


def parse_csv_snapshot(file_path):
    portfolios = {}
    current_account = "DEFAULT_ACCOUNT"

    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.reader(f)
        header = None
        for row in reader:
            if not row or not any(row):
                continue
            row_str = " ".join(row).lower()
            if "account" in row_str and len(row) == 1:
                current_account = row[0].strip()
                continue

            if any("symbol" in col.lower() or "ticker" in col.lower() for col in row):
                header = [c.strip().lower() for c in row]
                continue

            if header and len(row) >= len(header):
                row_dict = dict(zip(header, [c.strip() for c in row]))
                sym = row_dict.get("symbol", row_dict.get("ticker", "")).upper()
                if not sym:
                    continue

                if current_account not in portfolios:
                    portfolios[current_account] = {
                        "account_name": current_account,
                        "cash": 0.0,
                        "sgov_shares": 0,
                        "sgov_price": 100.50,
                        "positions": [],
                        "options": []
                    }

                qty_str = row_dict.get("quantity", row_dict.get("shares", row_dict.get("qty", "0"))).replace(",", "").replace("$", "")
                price_str = row_dict.get("price", row_dict.get("current price", row_dict.get("last", "0"))).replace(",", "").replace("$", "")
                
                try:
                    qty = float(qty_str) if "." in qty_str else int(qty_str)
                except ValueError:
                    qty = 0

                try:
                    price = float(price_str)
                except ValueError:
                    price = 0.0

                if sym in ["CASH", "USD", "CURRENCY"]:
                    portfolios[current_account]["cash"] += float(qty if price == 0 else qty * price)
                elif sym == "SGOV":
                    portfolios[current_account]["sgov_shares"] += int(qty)
                    if price > 0:
                        portfolios[current_account]["sgov_price"] = price
                elif " " in sym or len(sym) > 6 or any(kw in sym for kw in ["CALL", "PUT", "P", "C"]):
                    portfolios[current_account]["options"].append({
                        "symbol": sym,
                        "contracts": qty,
                        "mark_price": price
                    })
                else:
                    portfolios[current_account]["positions"].append({
                        "symbol": sym,
                        "shares": int(qty),
                        "mark_price": price,
                        "market_value": round(qty * price, 2),
                        "cc_eligible_blocks": int(qty // 100),
                        "cc_eligible": int(qty) >= 100
                    })

    return list(portfolios.values())


def process_portfolio_state(accounts):
    processed = []
    for acc in accounts:
        cash = acc.get("cash", 0.0)
        sgov_shares = acc.get("sgov_shares", 0)
        sgov_price = acc.get("sgov_price", 100.50)
        sgov_value = round(sgov_shares * sgov_price, 2)
        dry_powder = round(cash + sgov_value, 2)

        positions = acc.get("positions", [])
        total_equity_value = sum(p.get("market_value", 0.0) for p in positions)
        total_account_value = round(total_equity_value + dry_powder, 2)

        dry_powder_pct = round((dry_powder / total_account_value * 100.0), 1) if total_account_value > 0 else 0.0

        processed.append({
            "account_name": acc.get("account_name", "Primary Account"),
            "total_account_value": total_account_value,
            "settled_cash": cash,
            "sgov_shares": sgov_shares,
            "sgov_market_value": sgov_value,
            "total_dry_powder": dry_powder,
            "dry_powder_percentage": dry_powder_pct,
            "active_positions_count": len(positions),
            "positions": positions,
            "open_options": acc.get("options", [])
        })
    return processed


def main():
    parser = argparse.ArgumentParser(
        description="Deterministic Portfolio Snapshot Parser CLI for Portfolio Ingestion Agent"
    )
    parser.add_argument("--file", type=str, default=None, help="Path to specific snapshot CSV/text file")
    parser.add_argument("--demo", action="store_true", help="Generate sample parsed portfolio for testing")
    parser.add_argument("--json", action="store_true", help="Output raw JSON conforming to portfolio_context schema")

    args = parser.parse_args()

    if args.demo or (not args.file and not any(SNAPSHOTS_DIR.glob("*.*"))):
        sample_accounts = [{
            "account_name": "Primary Growth Account (Taxable)",
            "cash": 11500.0,
            "sgov_shares": 365,
            "sgov_price": 100.50,
            "positions": [
                {"symbol": "NVDA", "shares": 150, "mark_price": 124.50, "market_value": 18675.0, "cc_eligible_blocks": 1, "cc_eligible": True},
                {"symbol": "AMZN", "shares": 80, "mark_price": 182.20, "market_value": 14576.0, "cc_eligible_blocks": 0, "cc_eligible": False},
                {"symbol": "MSFT", "shares": 100, "mark_price": 415.00, "market_value": 41500.0, "cc_eligible_blocks": 1, "cc_eligible": True},
                {"symbol": "GOOGL", "shares": 60, "mark_price": 170.00, "market_value": 10200.0, "cc_eligible_blocks": 0, "cc_eligible": False}
            ],
            "options": [
                {"symbol": "NVDA 08/21/2026 120.00 P", "contracts": -1, "mark_price": 2.10}
            ]
        }]
        result = process_portfolio_state(sample_accounts)
    elif args.file:
        file_path = Path(args.file)
        if not file_path.exists():
            print(f"Error: Snapshot file not found at {file_path}", file=sys.stderr)
            sys.exit(1)
        raw_accounts = parse_csv_snapshot(file_path)
        result = process_portfolio_state(raw_accounts)
    else:
        snapshots = list(SNAPSHOTS_DIR.glob("*.csv")) + list(SNAPSHOTS_DIR.glob("*.txt"))
        if not snapshots:
            print("No snapshot files found in private/snapshots/. Run with --demo to see sample output.", file=sys.stderr)
            sys.exit(0)
        latest_file = sorted(snapshots, key=lambda p: p.stat().st_mtime, reverse=True)[0]
        raw_accounts = parse_csv_snapshot(latest_file)
        result = process_portfolio_state(raw_accounts)

    if args.json:
        print(json.dumps(result, indent=2))
        return

    print("=" * 80)
    print("PORTFOLIO INGESTION AGENT: NORMALIZED PORTFOLIO STATE")
    print("=" * 80)

    for acc in result:
        print(f"\nACCOUNT: {acc['account_name']}")
        print(f"Total Account Value:  ${acc['total_account_value']:,.2f}")
        print(f"Settled Cash:         ${acc['settled_cash']:,.2f}")
        print(f"SGOV (Cash Proxy):    {acc['sgov_shares']} shares (${acc['sgov_market_value']:,.2f})")
        print(f"Total Dry Powder:     ${acc['total_dry_powder']:,.2f} ({acc['dry_powder_percentage']}%)")
        print(f"Active Position Count:{acc['active_positions_count']}")
        print("\nEquity Holdings:")
        print(f"  {'SYMBOL':<8} {'SHARES':<8} {'PRICE':<10} {'VALUE':<12} {'COVERED CALL ELIGIBILITY':<24}")
        print("  " + "-" * 70)
        for p in acc["positions"]:
            cc_status = f"ELIGIBLE ({p['cc_eligible_blocks']} block)" if p["cc_eligible"] else "INELIGIBLE (<100 shares)"
            print(f"  {p['symbol']:<8} {p['shares']:<8} ${p['mark_price']:<9.2f} ${p['market_value']:<11.2f} {cc_status:<24}")

        if acc["open_options"]:
            print("\nOpen Options Contracts:")
            for opt in acc["open_options"]:
                print(f"  - {opt['symbol']} ({opt['contracts']} contracts @ ${opt['mark_price']:.2f})")
    print("\n" + "=" * 80)


if __name__ == "__main__":
    main()
