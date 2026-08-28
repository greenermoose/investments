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
import datetime
import json
import re
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
SNAPSHOTS_DIR = ROOT_DIR / "private" / "snapshots"

# Canonical column resolution. Brokerage exports label the same logical field
# differently (Schwab emits "Qty (Quantity)", others emit "Quantity" or
# "Shares"), so header cells are matched on their base label and their
# parenthetical expansion rather than by substring, which would collide:
# "Price Chng % (Price Change %)" must not resolve to the price column.
COLUMN_ALIASES = {
    "symbol": ["symbol", "ticker"],
    "description": ["description", "name", "security"],
    "quantity": ["qty", "quantity", "shares"],
    "price": ["price", "last", "last price", "current price", "mark"],
    "market_value": ["mkt val", "market value", "value"],
    "cost_per_share": ["cost/share", "cost per share", "cost basis per share", "avg cost"],
    "asset_type": ["asset type", "security type", "type"],
}

# Cells carrying no information. These resolve to None, never to 0.0: an unknown
# cost basis and a zero cost basis are not the same claim, and conflating them
# would imply a 100% gain on every position lacking a recorded basis.
UNKNOWN_TOKENS = {"", "-", "--", "n/a", "na", "none", "unknown", "null"}

# OCC-style contract descriptor, e.g. "NVDA 09/18/2026 115.00 P".
OPTION_SYMBOL_RE = re.compile(r"^[A-Z.]{1,6}\s+\d{2}/\d{2}/\d{4}\s+[\d.]+\s+[CP]$")

# Trailing aggregate rows, which are summaries rather than holdings.
TOTALS_ROW_RE = re.compile(r"^(positions?|account|grand)\s+total", re.IGNORECASE)

ACCOUNT_NAME_RE = re.compile(
    r"positions\s+for\s+account\s+(.+?)\s+as\s+of\s+(\d{4}[/-]\d{2}[/-]\d{2})",
    re.IGNORECASE,
)

BALANCE_METRIC_FIELDS = {
    "cash balance": "cash",
    "long stock value": "long_stock_value",
    "long option value": "long_option_value",
    "short option value": "short_option_value",
    "total account value": "total_account_value",
}


def _split_header_cell(cell):
    """Return (base_label, parenthetical_label) for a header cell, both lowered."""
    text = cell.strip().lower()
    match = re.match(r"^(.*?)\s*\((.*)\)\s*$", text)
    if match:
        return match.group(1).strip(), match.group(2).strip()
    return text, None


def resolve_columns(header_row):
    """Map canonical field names to column indices. Returns {} if not a header row."""
    columns = {}
    for index, cell in enumerate(header_row):
        base, paren = _split_header_cell(cell)
        for canonical, aliases in COLUMN_ALIASES.items():
            if canonical in columns:
                continue
            if base in aliases or (paren is not None and paren in aliases):
                columns[canonical] = index
                break
    return columns if "symbol" in columns else {}


def cell_value(row, columns, field):
    """Raw string for a canonical field, or empty string when the column is absent."""
    index = columns.get(field)
    if index is None or index >= len(row):
        return ""
    return row[index].strip()


def parse_number(raw):
    """Parse a brokerage numeric cell. Returns None for unknown or blank sentinels."""
    if raw is None:
        return None
    text = str(raw).strip()
    if text.lower() in UNKNOWN_TOKENS:
        return None
    negative = text.startswith("(") and text.endswith(")")
    text = text.strip("()").replace("$", "").replace(",", "").replace("%", "").strip()
    if text.lower() in UNKNOWN_TOKENS:
        return None
    try:
        value = float(text)
    except ValueError:
        return None
    return -value if negative else value


def new_account_record(name):
    return {
        "account_name": name,
        "as_of_date": None,
        "cash": None,
        "cash_from_balance_summary": False,
        "long_stock_value": None,
        "long_option_value": None,
        "short_option_value": None,
        "total_account_value": None,
        "authoritative_total_source": None,
        "balance_changes": {},
        "sgov_shares": 0.0,
        "sgov_price": None,
        "sgov_market_value": None,
        "sgov_seen": False,
        "positions": [],
        "options": [],
    }


def parse_csv_snapshot(file_path):
    portfolios = {}
    current_account = "DEFAULT_ACCOUNT"
    columns = {}
    balance_columns = {}

    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        for row in csv.reader(f):
            if not row or not any(c.strip() for c in row):
                continue

            # Account title line, e.g. "Positions for account Individual Brokerage as of ...".
            account_match = None
            for cell in row:
                account_match = ACCOUNT_NAME_RE.search(cell)
                if account_match:
                    break
            if account_match:
                current_account = account_match.group(1).strip()
                account = portfolios.setdefault(current_account, new_account_record(current_account))
                raw_date = account_match.group(2).replace("/", "-")
                try:
                    account["as_of_date"] = datetime.date.fromisoformat(raw_date).isoformat()
                except ValueError:
                    account["as_of_date"] = None
                columns = {}
                balance_columns = {}
                continue

            account = portfolios.setdefault(current_account, new_account_record(current_account))

            # Account-level balance section. The broker's displayed totals are
            # authoritative even when position details are incomplete or stale.
            lowered = [cell.strip().lower() for cell in row]
            if lowered and lowered[0] == "metric" and "current" in lowered:
                balance_columns = {
                    "current": lowered.index("current"),
                    "change": lowered.index("change") if "change" in lowered else None,
                }
                columns = {}
                continue

            metric_name = row[0].strip().lower() if row else ""
            if balance_columns and metric_name in BALANCE_METRIC_FIELDS:
                current_index = balance_columns["current"]
                current_value = parse_number(row[current_index] if current_index < len(row) else "")
                field = BALANCE_METRIC_FIELDS[metric_name]
                account[field] = current_value
                if field == "cash":
                    account["cash_from_balance_summary"] = True
                if field == "total_account_value":
                    account["authoritative_total_source"] = "brokerage_balance"
                change_index = balance_columns.get("change")
                if change_index is not None and change_index < len(row):
                    account["balance_changes"][field] = parse_number(row[change_index])
                continue

            # Header line.
            resolved = resolve_columns(row)
            if resolved:
                columns = resolved
                balance_columns = {}
                continue

            if not columns:
                continue

            symbol = cell_value(row, columns, "symbol")
            if not symbol:
                continue

            if TOTALS_ROW_RE.match(symbol):
                total_value = parse_number(cell_value(row, columns, "market_value"))
                if account.get("total_account_value") is None and total_value is not None:
                    account["total_account_value"] = total_value
                    account["authoritative_total_source"] = "positions_total"
                continue

            asset_type = cell_value(row, columns, "asset_type").lower()
            quantity = parse_number(cell_value(row, columns, "quantity"))
            price = parse_number(cell_value(row, columns, "price"))
            market_value = parse_number(cell_value(row, columns, "market_value"))
            cost_per_share = parse_number(cell_value(row, columns, "cost_per_share"))
            symbol_upper = symbol.upper()

            # Cash and money market sweep balances.
            is_cash_row = (
                symbol_upper != "SGOV"
                and (
                    "cash" in asset_type
                    or "money market" in asset_type
                    or symbol_upper in ("CASH", "USD", "CURRENCY")
                    or symbol_upper.startswith("CASH &")
                )
            )
            if is_cash_row:
                cash_value = None
                if market_value is not None:
                    cash_value = market_value
                elif quantity is not None and price is not None:
                    cash_value = quantity * price
                elif quantity is not None:
                    cash_value = quantity
                if cash_value is not None and not account.get("cash_from_balance_summary"):
                    account["cash"] = round((account.get("cash") or 0.0) + cash_value, 2)
                continue

            # Option contracts, identified by asset type first and by OCC contract
            # descriptor second. Never by scanning the ticker for "P" or "C", which
            # misclassifies AAPL, AMD, CRM and roughly a third of the universe.
            if "option" in asset_type or OPTION_SYMBOL_RE.match(symbol_upper):
                account["options"].append({
                    "symbol": symbol_upper,
                    "contracts": int(quantity) if quantity is not None else 0,
                    "mark_price": price,
                    "market_value": market_value,
                    "cost_per_contract": cost_per_share,
                })
                continue

            # SGOV cash proxy.
            if symbol_upper == "SGOV":
                account["sgov_seen"] = True
                if quantity is not None:
                    account["sgov_shares"] += quantity
                if price is not None and price > 0:
                    account["sgov_price"] = price
                if market_value is not None:
                    account["sgov_market_value"] = round(
                        (account.get("sgov_market_value") or 0.0) + market_value, 2
                    )
                continue

            # Common stock and ETF positions. Fractional share counts are preserved;
            # truncating them misstates DRIP-funded and fractional-purchase lots.
            shares = quantity if quantity is not None else 0.0
            if market_value is None and price is not None and quantity is not None:
                market_value = round(shares * price, 2)
            blocks = int(shares // 100)
            account["positions"].append({
                "symbol": symbol_upper,
                "shares": shares,
                "mark_price": price,
                "market_value": round(market_value, 2) if market_value is not None else None,
                "cost_basis_per_share": cost_per_share,
                "cc_eligible_blocks": blocks,
                "cc_eligible": blocks >= 1,
            })

    return list(portfolios.values())


def format_shares(shares):
    """Render share counts without inventing or destroying fractional precision."""
    if shares == int(shares):
        return str(int(shares))
    return f"{shares:.5f}".rstrip("0").rstrip(".")


def process_portfolio_state(accounts):
    processed = []
    for acc in accounts:
        cash = acc.get("cash")
        sgov_shares = acc.get("sgov_shares", 0.0)
        sgov_price = acc.get("sgov_price")
        sgov_value = acc.get("sgov_market_value")
        if not acc.get("sgov_seen"):
            sgov_value = 0.0
        elif sgov_value is None and sgov_price is not None:
            sgov_value = round(sgov_shares * sgov_price, 2)
        dry_powder = round(cash + sgov_value, 2) if cash is not None and sgov_value is not None else None

        positions = acc.get("positions", [])
        options = acc.get("options", [])
        position_values = [p.get("market_value") for p in positions]
        option_values = [o.get("market_value") for o in options]
        total_equity_value = (
            round(sum(position_values), 2)
            if all(value is not None for value in position_values)
            else None
        )
        total_option_value = (
            round(sum(option_values), 2)
            if all(value is not None for value in option_values)
            else None
        )

        computed_total = None
        if total_equity_value is not None and total_option_value is not None and dry_powder is not None:
            computed_total = round(total_equity_value + total_option_value + dry_powder, 2)

        authoritative_total = acc.get("total_account_value")
        total_account_value = authoritative_total if authoritative_total is not None else computed_total
        difference = (
            round(authoritative_total - computed_total, 2)
            if authoritative_total is not None and computed_total is not None
            else None
        )
        if authoritative_total is not None and computed_total is None:
            reconciliation_status = "AUTHORITATIVE_TOTAL_WITH_UNRESOLVED_COMPONENTS"
        elif authoritative_total is not None and abs(difference or 0.0) <= 0.01:
            reconciliation_status = "RECONCILED"
        elif authoritative_total is not None:
            reconciliation_status = "AUTHORITATIVE_TOTAL_MISMATCH"
        elif computed_total is not None:
            reconciliation_status = "COMPUTED_FROM_COMPLETE_COMPONENTS"
        else:
            reconciliation_status = "INCOMPLETE"

        dry_powder_pct = (
            round((dry_powder / total_account_value * 100.0), 1)
            if dry_powder is not None and total_account_value is not None and total_account_value > 0
            else None
        )

        processed.append({
            "account_name": acc.get("account_name", "Primary Account"),
            "as_of_date": acc.get("as_of_date"),
            "total_account_value": total_account_value,
            "settled_cash": cash,
            "long_stock_value": acc.get("long_stock_value"),
            "long_option_value": acc.get("long_option_value"),
            "short_option_value": acc.get("short_option_value"),
            "sgov_shares": sgov_shares,
            "sgov_market_value": sgov_value,
            "total_dry_powder": dry_powder,
            "dry_powder_percentage": dry_powder_pct,
            "active_positions_count": len(positions),
            "total_securities_count": len(positions) + (1 if acc.get("sgov_seen") else 0),
            "total_option_market_value": total_option_value,
            "positions": positions,
            "open_options": options,
            "reconciliation": {
                "status": reconciliation_status,
                "authoritative_source": acc.get("authoritative_total_source"),
                "authoritative_total_account_value": authoritative_total,
                "computed_total_account_value": computed_total,
                "difference_usd": difference,
                "balance_changes": acc.get("balance_changes", {}),
            },
        })
    return processed


def write_json_output(result, output_path):
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(
        description="Deterministic Portfolio Snapshot Parser CLI for Portfolio Ingestion Agent"
    )
    parser.add_argument("--file", type=str, default=None, help="Path to specific snapshot CSV/text file")
    parser.add_argument("--demo", action="store_true", help="Generate sample parsed portfolio for testing")
    parser.add_argument("--json", action="store_true", help="Output raw JSON conforming to portfolio_context schema")
    parser.add_argument("--output", type=str, default=None, help="Optional path to save normalized JSON")

    args = parser.parse_args()

    if args.demo or (not args.file and not any(SNAPSHOTS_DIR.glob("*.*"))):
        sample_accounts = [{
            "account_name": "Primary Growth Account (Taxable)",
            "cash": 11500.0,
            "sgov_shares": 365,
            "sgov_price": 100.50,
            "sgov_seen": True,
            "positions": [
                {"symbol": "NVDA", "shares": 150, "mark_price": 124.50, "market_value": 18675.0, "cc_eligible_blocks": 1, "cc_eligible": True},
                {"symbol": "AMZN", "shares": 80, "mark_price": 182.20, "market_value": 14576.0, "cc_eligible_blocks": 0, "cc_eligible": False},
                {"symbol": "MSFT", "shares": 100, "mark_price": 415.00, "market_value": 41500.0, "cc_eligible_blocks": 1, "cc_eligible": True},
                {"symbol": "GOOGL", "shares": 60, "mark_price": 170.00, "market_value": 10200.0, "cc_eligible_blocks": 0, "cc_eligible": False}
            ],
            "options": [
                {"symbol": "NVDA 08/21/2026 120.00 P", "contracts": -1, "mark_price": 2.10, "market_value": -210.0}
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

    if args.output:
        write_json_output(result, args.output)

    if args.json:
        print(json.dumps(result, indent=2))
        return

    print("=" * 80)
    print("PORTFOLIO INGESTION AGENT: NORMALIZED PORTFOLIO STATE")
    print("=" * 80)

    for acc in result:
        print(f"\nACCOUNT: {acc['account_name']}")
        total_text = f"${acc['total_account_value']:,.2f}" if acc["total_account_value"] is not None else "UNKNOWN"
        cash_text = f"${acc['settled_cash']:,.2f}" if acc["settled_cash"] is not None else "UNKNOWN"
        sgov_text = f"${acc['sgov_market_value']:,.2f}" if acc["sgov_market_value"] is not None else "UNKNOWN"
        dry_text = f"${acc['total_dry_powder']:,.2f}" if acc["total_dry_powder"] is not None else "UNKNOWN"
        dry_pct_text = f"{acc['dry_powder_percentage']:.1f}%" if acc["dry_powder_percentage"] is not None else "UNKNOWN"
        print(f"Total Account Value:  {total_text}")
        print(f"Settled Cash:         {cash_text}")
        print(f"SGOV (Cash Proxy):    {format_shares(acc['sgov_shares'])} shares ({sgov_text})")
        print(f"Total Dry Powder:     {dry_text} ({dry_pct_text})")
        print(f"Active Position Count:{acc['active_positions_count']}")
        print("\nEquity Holdings:")
        print(f"  {'SYMBOL':<8} {'SHARES':<10} {'PRICE':<10} {'VALUE':<12} {'COST/SHARE':<12} {'COVERED CALL ELIGIBILITY':<24}")
        print("  " + "-" * 84)
        for p in acc["positions"]:
            cc_status = f"ELIGIBLE ({p['cc_eligible_blocks']} block)" if p["cc_eligible"] else "INELIGIBLE (<100 shares)"
            basis = p.get("cost_basis_per_share")
            basis_str = f"${basis:,.2f}" if basis is not None else "UNKNOWN"
            mark_str = f"${p['mark_price']:,.2f}" if p.get("mark_price") is not None else "UNKNOWN"
            value_str = f"${p['market_value']:,.2f}" if p.get("market_value") is not None else "UNKNOWN"
            print(f"  {p['symbol']:<8} {format_shares(p['shares']):<10} {mark_str:<10} {value_str:<12} {basis_str:<12} {cc_status:<24}")

        if acc["open_options"]:
            print("\nOpen Options Contracts:")
            for opt in acc["open_options"]:
                mark_text = f"${opt['mark_price']:.2f}" if opt.get("mark_price") is not None else "UNKNOWN"
                print(f"  - {opt['symbol']} ({opt['contracts']} contracts @ {mark_text})")
        else:
            print("\nOpen Options Contracts: NONE")
    print("\n" + "=" * 80)


if __name__ == "__main__":
    main()
