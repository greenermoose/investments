#!/usr/bin/env python3
"""
scripts/render_plan.py
Validates and renders the weekly trading plan.

The Lead Portfolio Manager Agent decides the trades and writes the rationale for
each one into an orders file conforming to
context/schemas/trading_plan_orders_schema.json. This script does three things
with that file, none of which involve choosing a trade:

  1. Validates every order against the strategy mandate in AGENTS.md section 5:
     100 percent collateralization on every short option, no naked selling, no
     speculative long option purchases, limit orders only, portfolio isolation,
     and symbols that exist in the tracked universe.
  2. Recomputes the collateral, cash impact, and annualized return on collateral
     using scripts/calculate_pricing.py, and fails when the agent's asserted
     figures disagree with the arithmetic.
  3. Renders the plain-ASCII plan conforming to
     context/schemas/trading_plan_schema.json.

The predecessor of this script, generate_plan.py, chose which puts to sell, set
strikes at a fixed percentage of the mark, estimated option premiums without
consulting a pricing model, and wrote the rationale for every order. Those are
portfolio management decisions. They belong to the agent, and the checks above
are what a script can contribute that an agent cannot do reliably.

Usage:
    python scripts/render_plan.py --orders private/plans/2026-08-31-orders.json --save
    python scripts/render_plan.py --orders examples/sample_orders.json \\
        --snapshot examples/sample_portfolio.csv
"""

import argparse
import datetime
import json
import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = ROOT_DIR / "scripts"
PLANS_DIR = ROOT_DIR / "private" / "plans"
SNAPSHOTS_DIR = ROOT_DIR / "private" / "snapshots"
HTTP_DATA_DIR = ROOT_DIR / "http" / "data"
CONTEXT_DATA_DIR = ROOT_DIR / "context" / "data"

if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from parse_snapshot import parse_csv_snapshot, process_portfolio_state
from calculate_pricing import calculate_aroc

CONTRACT_MULTIPLIER = 100
POSITION_COUNT_SOFT_TARGET = 25
# Tolerance for cross-checking the agent's asserted figures against the
# recomputed ones. Wide enough for rounding, tight enough to catch a slip.
ARITHMETIC_TOLERANCE_USD = 1.00
AROC_TOLERANCE_PCT = 0.5

OPENING_ACTIONS = {"BUY", "BUY TO OPEN", "SELL TO OPEN"}


def round_to_tick(price):
    """Rounds to a submittable price increment. Sub-$1.00 names quote in sub-penny ticks."""
    if price < 1.00:
        return max(round(price, 4), 0.0001)
    return max(round(price, 2), 0.01)


def format_share_count(shares):
    """Renders a share count without inventing or destroying fractional precision."""
    if shares == int(shares):
        return str(int(shares))
    return f"{shares:.5f}".rstrip("0").rstrip(".")


def format_price(price):
    return f"${price:,.4f}" if price < 1.0 else f"${price:,.2f}"


def load_universe_symbols():
    for path in (HTTP_DATA_DIR / "universe.json", CONTEXT_DATA_DIR / "universe.json"):
        if not path.exists():
            continue
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, ValueError):
            continue
        companies = data if isinstance(data, list) else data.get("companies", [])
        return {str(c.get("symbol", "")).upper() for c in companies if c.get("symbol")}
    return set()


def load_orders(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _order_label(portfolio_name, index, order):
    return f"{portfolio_name} order {index} ({order.get('action', '?')} {order.get('symbol', '?')})"


def compute_collateral(order):
    """Collateral this order encumbers, in dollars.

    A short put reserves strike times 100 per contract in settled cash. A short
    call reserves 100 shares of the underlying per contract. Anything else
    encumbers nothing beyond its own cash cost.
    """
    if order.get("security_type") != "OPTION":
        return 0.0
    if order.get("action") != "SELL TO OPEN":
        return 0.0
    if order.get("option_type") == "PUT":
        return round(float(order["strike"]) * CONTRACT_MULTIPLIER * float(order["quantity"]), 2)
    return 0.0


def compute_cash_impact(order):
    """Cash impact in dollars, negative for a debit.

    Option premiums quote per share, so a contract's cash value is the premium
    times the 100-share multiplier.
    """
    quantity = float(order["quantity"])
    price = float(order["limit_price"])
    multiplier = CONTRACT_MULTIPLIER if order.get("security_type") == "OPTION" else 1
    gross = round(price * multiplier * quantity, 2)

    if order["action"] in ("SELL TO OPEN", "SELL TO CLOSE"):
        return gross
    return -gross


def parse_open_option(option):
    """Extracts (underlying, PUT/CALL, strike) from a brokerage option label.

    Brokerage exports render options as "NVDA 09/18/2026 115.00 P". Returns None
    for a label this parser cannot read, so the caller can flag it rather than
    silently treating an encumbered position as free collateral.
    """
    label = str(option.get("symbol", "")).strip()
    parts = label.split()
    if len(parts) < 4:
        return None
    underlying = parts[0].upper()
    suffix = parts[-1].upper()
    option_type = "PUT" if suffix.startswith("P") else ("CALL" if suffix.startswith("C") else None)
    if option_type is None:
        return None
    try:
        strike = float(parts[-2])
    except ValueError:
        return None
    return underlying, option_type, strike


def existing_encumbrances(account):
    """Collateral the account's already-open short options tie up.

    Dry powder as reported by the snapshot does not net out the cash securing an
    open short put, and shares covering an open short call are not free to cover
    a second one. Both are subtracted before this plan's orders are checked.
    """
    reserved_cash = 0.0
    committed_shares = {}
    unparsed = []

    for option in account.get("open_options", []):
        contracts = float(option.get("contracts", 0) or 0)
        if contracts >= 0:
            continue  # long position: encumbers nothing
        parsed = parse_open_option(option)
        if parsed is None:
            unparsed.append(option.get("symbol", "<unlabelled option>"))
            continue
        underlying, option_type, strike = parsed
        if option_type == "PUT":
            reserved_cash += strike * CONTRACT_MULTIPLIER * abs(contracts)
        else:
            committed_shares[underlying] = (
                committed_shares.get(underlying, 0.0)
                + CONTRACT_MULTIPLIER * abs(contracts)
            )

    return round(reserved_cash, 2), committed_shares, unparsed


def validate_orders(document, accounts, universe_symbols):
    """Checks every order against the strategy mandate. Returns a list of errors.

    Collateral is tracked per portfolio and drawn down in order, so a plan that
    sells four puts against dry powder that only covers three is caught on the
    fourth rather than passing on the total.
    """
    errors = []
    accounts_by_name = {a.get("account_name", ""): a for a in accounts}

    plan_date = None
    if not document.get("plan_date"):
        errors.append("orders file is missing plan_date")
    else:
        try:
            plan_date = datetime.datetime.strptime(document["plan_date"], "%Y-%m-%d").date()
        except ValueError:
            errors.append(
                f"plan_date '{document['plan_date']}' is not a YYYY-MM-DD date")
    if not document.get("authored_by"):
        errors.append(
            "orders file is missing authored_by; the plan must record which agent decided it")

    for portfolio in document.get("portfolios", []):
        name = portfolio.get("account_name", "<unnamed portfolio>")
        account = accounts_by_name.get(name)
        if account is None:
            errors.append(
                f"[{name}] no account with this name was parsed from the snapshot; "
                f"available accounts: {sorted(accounts_by_name) or 'none'}"
            )
            continue

        # Portfolio isolation: each account's collateral is tracked on its own.
        reserved_cash, shares_committed, unparsed = existing_encumbrances(account)
        available_cash = float(account.get("total_dry_powder", 0.0)) - reserved_cash
        shares_held = {
            str(p.get("symbol", "")).upper(): float(p.get("shares", 0) or 0)
            for p in account.get("positions", [])
        }

        for unreadable in unparsed:
            errors.append(
                f"[{name}] could not read the open option '{unreadable}'. Its collateral cannot be "
                "netted out, so this plan cannot be checked for 100 percent collateralization."
            )
        if available_cash < 0:
            errors.append(
                f"[{name}] open short puts reserve ${reserved_cash:,.2f} against "
                f"${account.get('total_dry_powder', 0.0):,.2f} of dry powder, leaving the account "
                "under-collateralized before this plan's orders are considered."
            )

        for index, order in enumerate(portfolio.get("orders", []), 1):
            label = _order_label(name, index, order)
            symbol = str(order.get("symbol", "")).upper()
            action = order.get("action")
            security_type = order.get("security_type")

            for field in ("action", "symbol", "security_type", "quantity",
                          "order_type", "limit_price", "rationale"):
                if order.get(field) in (None, ""):
                    errors.append(f"{label}: missing required field '{field}'")

            if order.get("order_type") != "Limit":
                errors.append(
                    f"{label}: order_type is '{order.get('order_type')}'. Only limit orders can "
                    "be priced ahead of a single-session Monday entry."
                )

            if len(str(order.get("rationale", ""))) < 40:
                errors.append(
                    f"{label}: rationale is too short. Every order carries the agent's own "
                    "reason for it; the renderer does not supply one."
                )

            if universe_symbols and symbol not in universe_symbols:
                errors.append(
                    f"{label}: '{symbol}' is not in the tracked universe. Onboard it with "
                    "scripts/onboard_company.py before trading it."
                )

            if security_type == "OPTION":
                for field in ("option_type", "strike", "expiration"):
                    if not order.get(field):
                        errors.append(f"{label}: OPTION order is missing '{field}'")

                # Prohibition: no speculative long option purchases.
                if action == "BUY TO OPEN":
                    errors.append(
                        f"{label}: BUY TO OPEN on an option is prohibited. The mandate allows "
                        "buying to close an existing short position, never opening a long one."
                    )

                if action == "SELL TO OPEN":
                    quantity = float(order.get("quantity") or 0)
                    if order.get("option_type") == "PUT":
                        required = compute_collateral(order)
                        if required > available_cash + 0.005:
                            errors.append(
                                f"{label}: short put requires ${required:,.2f} of cash collateral "
                                f"but only ${available_cash:,.2f} of dry powder remains in this "
                                "portfolio. Every put sold must be 100 percent cash-secured."
                            )
                        available_cash -= required
                    elif order.get("option_type") == "CALL":
                        needed_shares = quantity * CONTRACT_MULTIPLIER
                        already = shares_committed.get(symbol, 0.0)
                        held = shares_held.get(symbol, 0.0)
                        if held - already < needed_shares:
                            errors.append(
                                f"{label}: short call needs {needed_shares:,.0f} shares of "
                                f"{symbol} as cover but the account holds "
                                f"{held:,.0f}, of which {already:,.0f} already back an open or "
                                "earlier-listed short call. "
                                "Every call sold must be 100 percent share-backed."
                            )
                        shares_committed[symbol] = already + needed_shares

                if action == "BUY TO CLOSE":
                    # Closing a short put pays the debit and releases the strike
                    # collateral it was tying up, which is the point of the order.
                    available_cash += compute_cash_impact(order)
                    if order.get("option_type") == "PUT" and order.get("strike"):
                        available_cash += (
                            float(order["strike"]) * CONTRACT_MULTIPLIER
                            * float(order.get("quantity") or 0)
                        )
                    elif order.get("option_type") == "CALL":
                        released = float(order.get("quantity") or 0) * CONTRACT_MULTIPLIER
                        shares_committed[symbol] = max(
                            shares_committed.get(symbol, 0.0) - released, 0.0)

            elif security_type == "EQUITY":
                if action in ("SELL TO OPEN", "BUY TO OPEN"):
                    errors.append(
                        f"{label}: '{action}' is an option action; use BUY or SELL TO CLOSE "
                        "for common stock."
                    )
                if action == "BUY":
                    cost = -compute_cash_impact(order)
                    if cost > available_cash + 0.005:
                        errors.append(
                            f"{label}: purchase costs ${cost:,.2f} but only "
                            f"${available_cash:,.2f} of dry powder remains in this portfolio."
                        )
                    available_cash -= cost
                if action == "SELL TO CLOSE":
                    held = shares_held.get(symbol, 0.0)
                    quantity = float(order.get("quantity") or 0)
                    if quantity > held + 1e-9:
                        errors.append(
                            f"{label}: sells {format_share_count(quantity)} shares of {symbol} "
                            f"but the account holds only {format_share_count(held)}. "
                            "Short selling common stock is outside the mandate."
                        )
                    # Equity proceeds settle T+1 and are not same-session collateral,
                    # so they are deliberately not added to available_cash here.

            errors.extend(cross_check_arithmetic(label, order, plan_date))

        errors.extend(check_position_count(name, account, portfolio))

    return errors


def cross_check_arithmetic(label, order, plan_date=None):
    """Recomputes what the agent asserted and reports any disagreement."""
    errors = []
    if not order.get("limit_price") or not order.get("quantity"):
        return errors

    asserted_collateral = order.get("asserted_collateral_usd")
    if asserted_collateral is not None:
        computed = compute_collateral(order)
        if abs(float(asserted_collateral) - computed) > ARITHMETIC_TOLERANCE_USD:
            errors.append(
                f"{label}: asserted collateral ${float(asserted_collateral):,.2f} does not match "
                f"the computed ${computed:,.2f}."
            )

    asserted_cash = order.get("asserted_cash_impact_usd")
    if asserted_cash is not None:
        computed = compute_cash_impact(order)
        if abs(float(asserted_cash) - computed) > ARITHMETIC_TOLERANCE_USD:
            errors.append(
                f"{label}: asserted cash impact ${float(asserted_cash):,.2f} does not match "
                f"the computed ${computed:,.2f}."
            )

    asserted_aroc = order.get("asserted_aroc_pct")
    if asserted_aroc is not None:
        computed = recompute_aroc(order, plan_date)
        if computed is None:
            errors.append(
                f"{label}: asserted an AROC but the order is not a short option with a "
                "strike and expiration to compute one from."
            )
        elif abs(float(asserted_aroc) - computed) > AROC_TOLERANCE_PCT:
            errors.append(
                f"{label}: asserted AROC {float(asserted_aroc):.2f}% does not match the "
                f"computed {computed:.2f}%."
            )
    return errors


def recompute_aroc(order, plan_date=None):
    """Annualized return on collateral via calculate_pricing, or None if N/A."""
    if order.get("security_type") != "OPTION" or order.get("action") != "SELL TO OPEN":
        return None
    if not order.get("strike") or not order.get("expiration"):
        return None
    try:
        expiry = datetime.datetime.strptime(order["expiration"], "%Y-%m-%d").date()
    except ValueError:
        return None
    start = plan_date or datetime.date.today()
    dte = (expiry - start).days
    if dte <= 0:
        return None
    return calculate_aroc(float(order["limit_price"]), float(order["strike"]), dte)


def check_position_count(name, account, portfolio):
    """Reports the resulting holding count against the soft concentration target."""
    held = {str(p.get("symbol", "")).upper() for p in account.get("positions", [])}
    for order in portfolio.get("orders", []):
        symbol = str(order.get("symbol", "")).upper()
        if order.get("action") in OPENING_ACTIONS:
            held.add(symbol)
        elif order.get("action") == "SELL TO CLOSE" and order.get("security_type") == "EQUITY":
            held.discard(symbol)
    if len(held) > POSITION_COUNT_SOFT_TARGET + 10:
        return [
            f"[{name}] this plan leaves {len(held)} holdings against a soft target of "
            f"~{POSITION_COUNT_SOFT_TARGET}. Concentration is conviction-driven, but a count "
            "this far above the guideline needs the agent's explicit reasoning."
        ]
    return []


def describe_instrument(order):
    """Names the instrument for the plan text. Descriptive only, not a judgment."""
    symbol = order["symbol"]
    if order.get("security_type") != "OPTION":
        return f"{symbol} Common Stock"
    option_word = "Put" if order.get("option_type") == "PUT" else "Call"
    return f"{symbol} {order['expiration']} ${float(order['strike']):.2f} {option_word}"


def render_order(order, number, plan_date):
    lines = [f"{number}. {order['action']}: {describe_instrument(order)}"]

    quantity = float(order["quantity"])
    if order.get("security_type") == "OPTION":
        contracts = int(quantity)
        commitment = f"{contracts * CONTRACT_MULTIPLIER} share commitment"
        lines.append(f"   - Contracts:   {contracts} ({commitment})")
    else:
        lines.append(f"   - Shares:      {format_share_count(quantity)}")

    tif = order.get("time_in_force", "DAY")
    lines.append(f"   - Order Type:  Limit ({tif})")
    lines.append(f"   - Limit Price: {format_price(round_to_tick(float(order['limit_price'])))}")

    cash_impact = compute_cash_impact(order)
    sign = "+" if cash_impact >= 0 else "-"
    kind = "credit" if cash_impact >= 0 else "debit"
    lines.append(f"   - Cash Impact: {sign}${abs(cash_impact):,.2f} ({kind})")

    collateral = compute_collateral(order)
    if collateral > 0:
        lines.append(f"   - Collateral:  ${collateral:,.2f} secured by settled cash / SGOV proxy")
    elif order.get("security_type") == "OPTION" and order.get("option_type") == "CALL" \
            and order["action"] == "SELL TO OPEN":
        shares = int(quantity) * CONTRACT_MULTIPLIER
        lines.append(f"   - Collateral:  {shares} shares of {order['symbol']} held in account")

    aroc = recompute_aroc(order, plan_date)
    if aroc is not None:
        lines.append(f"   - AROC:        {aroc:.2f}% annualized return on collateral")

    contingency = order.get("contingency")
    if contingency:
        lines.append(f"   - Contingency: {contingency['condition']}")
        lines.append(f"     * BRANCH A:  {contingency['branch_a']}")
        lines.append(f"     * BRANCH B:  {contingency['branch_b']}")

    lines.append(f"   - Rationale:   {order['rationale']}")
    lines.append("")
    return lines


def render_plan(document, accounts):
    plan_date_str = document["plan_date"]
    plan_date = datetime.datetime.strptime(plan_date_str, "%Y-%m-%d").date()
    monday_full = plan_date.strftime("%A, %B %d, %Y").upper()
    accounts_by_name = {a.get("account_name", ""): a for a in accounts}
    portfolios = document.get("portfolios", [])

    lines = [
        "=" * 80,
        f"WEEKLY TRADING PLAN: WEEK OF {monday_full}",
        "=" * 80,
        "",
        "OBJECTIVE: Maximize probability of achieving >= 20% annualized return over 20 years.",
        'CADENCE:   Single-session "set-and-forget" execution (Monday 9:30 AM ET or as soon',
        "           as you can access the account). No mid-week babysitting or monitoring.",
        "           Friday option settlements occur automatically. Upload a new snapshot",
        "           next weekend to evaluate results and generate the next plan.",
        "",
    ]

    if len(portfolios) > 1:
        lines.append("Execute all orders for PORTFOLIO 1 first, then proceed to PORTFOLIO 2.")
        lines.append("")

    for idx, portfolio in enumerate(portfolios, 1):
        name = portfolio.get("account_name", f"PORTFOLIO {idx}")
        account = accounts_by_name.get(name, {})
        orders = portfolio.get("orders", [])
        expirations = portfolio.get("expirations", [])

        lines += [
            "=" * 80,
            f"PORTFOLIO {idx}: {name.upper()}",
            "=" * 80,
            "",
            "ACCOUNT SNAPSHOT:",
            f"- Total Account Value: ${account.get('total_account_value', 0.0):,.2f}",
            f"- Settled Cash:       ${account.get('settled_cash', 0.0):,.2f}",
            f"- SGOV (Cash Proxy):  {account.get('sgov_shares', 0)} shares "
            f"(${account.get('sgov_market_value', 0.0):,.2f})",
            f"- Total Dry Powder:   ${account.get('total_dry_powder', 0.0):,.2f} "
            f"({account.get('dry_powder_percentage', 0.0)}% of account)",
            f"- Active Holdings:    {account.get('active_positions_count', 0)} equities "
            f"(Target: ~{POSITION_COUNT_SOFT_TARGET} or fewer)",
            "",
            "-" * 80,
            f"STEP 1: SINGLE-SESSION ORDER ENTRY (PORTFOLIO {idx})",
            "-" * 80,
        ]

        if orders:
            lines.append(
                f"Submit the following {len(orders)} orders in one sitting at market open "
                "(or upon first login):")
            lines.append("")
            for number, order in enumerate(orders, 1):
                lines += render_order(order, number, plan_date)
        else:
            lines.append("No orders for this portfolio this week. Hold all positions as they are.")
            lines.append("")

        lines += [
            "-" * 80,
            f"STEP 2: FRIDAY EXPIRATIONS & OUTCOME EXPECTATIONS (PORTFOLIO {idx})",
            "-" * 80,
        ]
        if expirations:
            for expiration in expirations:
                contracts = expiration.get("contracts")
                suffix = ""
                if contracts:
                    count = abs(int(contracts))
                    suffix = f" ({count} contract{'s' if count > 1 else ''})"
                lines.append(f"- {expiration['symbol']}{suffix}")
                if expiration.get("status"):
                    lines.append(f"  Current Status: {expiration['status']}")
                lines.append(f"  Outcome:        {expiration['expectation']}")
                lines.append("")
        else:
            lines.append("- No open options expiring this week.")
            lines.append("  Outcome:        No Friday expiration actions required.")
            lines.append("")

    lines += ["=" * 80, "END OF WEEKLY TRADING PLAN", "=" * 80]
    return "\n".join(lines)


def assert_plain_ascii(content):
    """The plan is read in a terminal and executed by hand. ASCII only."""
    errors = []
    try:
        content.encode("ascii")
    except UnicodeEncodeError as exc:
        errors.append(
            f"plan contains a non-ASCII character at position {exc.start}: "
            f"{content[exc.start:exc.end]!r}"
        )
    for number, line in enumerate(content.split("\n"), 1):
        stripped = line.strip()
        if stripped.startswith("|") and stripped.endswith("|"):
            errors.append(
                f"plan line {number} is a markdown pipe table, which the plan format prohibits")
    return errors


def resolve_accounts(args):
    """Parses the brokerage snapshot the orders were authored against."""
    if args.snapshot:
        return process_portfolio_state(parse_csv_snapshot(Path(args.snapshot)))

    SNAPSHOTS_DIR.mkdir(parents=True, exist_ok=True)
    snapshots = list(SNAPSHOTS_DIR.glob("*.csv")) + list(SNAPSHOTS_DIR.glob("*.txt"))
    if not snapshots:
        return []
    latest = sorted(snapshots, key=lambda p: p.stat().st_mtime, reverse=True)[0]
    print(f"Ingesting latest snapshot file: {latest.name}")
    return process_portfolio_state(parse_csv_snapshot(latest))


def main():
    parser = argparse.ArgumentParser(
        description="Validate an agent-authored order set and render the weekly trading plan")
    parser.add_argument("--orders", type=str, required=True,
                        help="Path to the orders file conforming to trading_plan_orders_schema.json")
    parser.add_argument("--snapshot", type=str, default=None,
                        help="Brokerage export to validate against (default: newest in private/snapshots/)")
    parser.add_argument("--save", action="store_true",
                        help="Write to private/plans/YYYY-MM-DD-plan.txt")
    parser.add_argument("--out", type=str, default=None, help="Custom output filepath")
    parser.add_argument("--check-only", action="store_true",
                        help="Validate the order set without rendering")
    args = parser.parse_args()

    document = load_orders(args.orders)
    accounts = resolve_accounts(args)

    if not accounts:
        print("No brokerage snapshot found. Orders cannot be validated for collateral or share")
        print("cover without the account state they were authored against. Place an export in")
        print("private/snapshots/ or pass --snapshot.")
        return 1

    errors = validate_orders(document, accounts, load_universe_symbols())
    if errors:
        print(f"Order set failed validation with {len(errors)} error(s):")
        for error in errors:
            print(f"  FAIL: {error}")
        print("\nNo plan was rendered. Correct the order set and re-run.")
        return 1

    order_count = sum(len(p.get("orders", [])) for p in document.get("portfolios", []))
    print(f"Validated {order_count} order(s) across {len(document.get('portfolios', []))} "
          "portfolio(s) against the strategy mandate.")

    if args.check_only:
        return 0

    content = render_plan(document, accounts)

    format_errors = assert_plain_ascii(content)
    if format_errors:
        print("Rendered plan failed the plain-text format check:")
        for error in format_errors:
            print(f"  FAIL: {error}")
        return 1

    if args.save:
        PLANS_DIR.mkdir(parents=True, exist_ok=True)
        target = PLANS_DIR / f"{document['plan_date']}-plan.txt"
        target.write_text(content, encoding="utf-8")
        print(f"Weekly trading plan written to {target}")
        return 0

    if args.out:
        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(content, encoding="utf-8")
        print(f"Weekly trading plan written to {out_path}")
        return 0

    print(content)
    return 0


if __name__ == "__main__":
    sys.exit(main())
