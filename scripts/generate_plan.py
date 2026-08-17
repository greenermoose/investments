#!/usr/bin/env python3
"""
scripts/generate_plan.py
Deterministic Trading Plan Generator CLI for Lead Portfolio Manager Agent.

Generates a structured, human-centric plain ASCII text Weekly Trading Plan
conforming to context/schemas/trading_plan_schema.json, ensuring single-session
Monday execution, multi-portfolio isolation, and zero-ambiguity order instructions.
"""

import argparse
import datetime
import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
PLANS_DIR = ROOT_DIR / "private" / "plans"


def generate_ascii_plan(date_str=None, accounts=None, orders=None, expirations=None):
    if not date_str:
        today = datetime.date.today()
        # Find next Monday if today is not Monday
        days_ahead = 0 if today.weekday() == 0 else (7 - today.weekday())
        monday = today + datetime.timedelta(days=days_ahead)
        date_str = monday.strftime("%Y-%m-%d")
        monday_full = monday.strftime("%A, %B %d, %Y").upper()
    else:
        try:
            d = datetime.datetime.strptime(date_str, "%Y-%m-%d")
            monday_full = d.strftime("%A, %B %d, %Y").upper()
        except ValueError:
            monday_full = f"MONDAY, {date_str}".upper()

    lines = []
    lines.append("=" * 80)
    lines.append(f"WEEKLY TRADING PLAN: WEEK OF {monday_full}")
    lines.append("=" * 80)
    lines.append("")
    lines.append("OBJECTIVE: Maximize probability of achieving >= 20% annualized return over 20 years.")
    lines.append("CADENCE:   Single-session \"set-and-forget\" execution (Monday 9:30 AM ET or as soon")
    lines.append("           as you can access the account). No mid-week babysitting or monitoring.")
    lines.append("           Friday option settlements occur automatically. Upload a new snapshot")
    lines.append("           next weekend to evaluate results and generate the next plan.")
    lines.append("")
    lines.append("Execute all orders for PORTFOLIO 1 first, then proceed to PORTFOLIO 2.")
    lines.append("")

    if not accounts:
        accounts = [{
            "name": "PRIMARY GROWTH ACCOUNT (TAXABLE)",
            "total_value": 121602.50,
            "cash": 11500.00,
            "sgov_shares": 365,
            "sgov_value": 36682.50,
            "dry_powder": 48182.50,
            "dry_powder_pct": 39.6,
            "position_count": 4,
            "orders": [
                {
                    "num": 1,
                    "action": "SELL TO OPEN",
                    "symbol": "NVDA 09/25/2026 $120.00 Put",
                    "contracts": 1,
                    "share_commitment": "-100 share commitment",
                    "type": "Limit",
                    "limit_price": "$3.40 (or higher)",
                    "cash_impact": "+$340.00 (gross premium credit collected immediately)",
                    "collateral": "$12,000.00 secured by cash / SGOV proxy",
                    "rationale": "High-conviction BUY candidate; 0.22 Delta, 39 DTE, 24.3% AROC; accumulates NVDA at effective $116.60 basis if assigned."
                },
                {
                    "num": 2,
                    "action": "SELL TO OPEN",
                    "symbol": "MSFT 09/25/2026 $450.00 Call",
                    "contracts": 1,
                    "share_commitment": "+100 shares covered",
                    "type": "Limit",
                    "limit_price": "$4.80 (or higher)",
                    "cash_impact": "+$480.00 (gross premium credit collected immediately)",
                    "collateral": "100 shares of MSFT common stock held in account",
                    "rationale": "Covered Call harvest against 100-share block; strike at 52-week fair value target ($450.00); harvests 1.1% 39-day yield."
                }
            ],
            "expirations": [
                {
                    "symbol": "NVDA 08/21/2026 $120.00 Put (1 contract)",
                    "status": "OTM (Current stock price: $124.50)",
                    "expectation": "Expected to expire worthless at 4:00 PM ET Friday, releasing $12,000.00 in reserved cash collateral back to dry powder. 100% of upfront premium ($210.00) retained as realized profit. Zero manual action required."
                }
            ]
        }]

    for idx, acc in enumerate(accounts, 1):
        lines.append("=" * 80)
        lines.append(f"PORTFOLIO {idx}: {acc['name']}")
        lines.append("=" * 80)
        lines.append("")
        lines.append("ACCOUNT SNAPSHOT:")
        lines.append(f"- Total Account Value: ${acc['total_value']:,.2f}")
        lines.append(f"- Settled Cash:       ${acc['cash']:,.2f}")
        lines.append(f"- SGOV (Cash Proxy):  {acc['sgov_shares']} shares (${acc['sgov_value']:,.2f})")
        lines.append(f"- Total Dry Powder:   ${acc['dry_powder']:,.2f} ({acc['dry_powder_pct']}% of account)")
        lines.append(f"- Active Holdings:    {acc['position_count']} equities (Target: ~25 or fewer)")
        lines.append("")
        lines.append("-" * 80)
        lines.append(f"STEP 1: SINGLE-SESSION ORDER ENTRY (PORTFOLIO {idx})")
        lines.append("-" * 80)
        lines.append(f"Submit the following {len(acc['orders'])} orders in one sitting at market open (or upon first login):")
        lines.append("")

        for o in acc["orders"]:
            lines.append(f"{o['num']}. {o['action']}: {o['symbol']}")
            lines.append(f"   - Contracts:   {o['contracts']} ({o['share_commitment']})")
            lines.append(f"   - Order Type:  {o['type']}")
            lines.append(f"   - Limit Price: {o['limit_price']}")
            lines.append(f"   - Cash Impact: {o['cash_impact']}")
            lines.append(f"   - Collateral:  {o['collateral']}")
            lines.append(f"   - Rationale:   {o['rationale']}")
            lines.append("")

        lines.append("-" * 80)
        lines.append(f"STEP 2: FRIDAY EXPIRATIONS & OUTCOME EXPECTATIONS (PORTFOLIO {idx})")
        lines.append("-" * 80)
        for exp in acc["expirations"]:
            lines.append(f"- {exp['symbol']}")
            lines.append(f"  Current Status: {exp['status']}")
            lines.append(f"  Outcome:        {exp['expectation']}")
            lines.append("")

    lines.append("=" * 80)
    lines.append("END OF WEEKLY TRADING PLAN")
    lines.append("=" * 80)

    return "\n".join(lines), date_str


def main():
    parser = argparse.ArgumentParser(
        description="Deterministic Trading Plan Generator CLI for Lead Portfolio Manager Agent"
    )
    parser.add_argument("--date", type=str, default=None, help="Plan date (YYYY-MM-DD)")
    parser.add_argument("--save", action="store_true", help="Save directly to private/plans/YYYY-MM-DD-plan.txt")
    parser.add_argument("--out", type=str, default=None, help="Custom output filepath")

    args = parser.parse_args()

    content, date_str = generate_ascii_plan(args.date)

    if args.save:
        PLANS_DIR.mkdir(parents=True, exist_ok=True)
        target_path = PLANS_DIR / f"{date_str}-plan.txt"
        target_path.write_text(content, encoding="utf-8")
        print(f"Weekly trading plan successfully written to {target_path}")
        return

    if args.out:
        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(content, encoding="utf-8")
        print(f"Weekly trading plan successfully written to {out_path}")
        return

    print(content)


if __name__ == "__main__":
    main()
