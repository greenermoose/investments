#!/usr/bin/env python3
"""
scripts/triage_universe.py
Deterministic Stage 1 Triage Screener for the Equity Research and Memory Agents.

Evaluates equity universe constituents against quantitative triage filters to separate
uninvestable value traps (AVOID) from high-conviction opportunities (QUALIFIED_CANDIDATE).
Maximizes token and compute ROI by freezing deep 13Q/6-horizon modeling on Avoid equities.
"""

import argparse
import json
import math
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
HTTP_DATA_DIR = ROOT_DIR / "http" / "data"
CONTEXT_DATA_DIR = ROOT_DIR / "context" / "data"
UNIVERSE_JSON_HTTP = HTTP_DATA_DIR / "universe.json"
UNIVERSE_JSON_CONTEXT = CONTEXT_DATA_DIR / "universe.json"


def load_universe():
    for p in [UNIVERSE_JSON_HTTP, UNIVERSE_JSON_CONTEXT]:
        if p.exists():
            with open(p, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
                if isinstance(data, dict) and "companies" in data:
                    return data["companies"]
    return []


def _format_roi(item):
    """Formats the modelled ROI, or reports it as unavailable."""
    roi_str = item.get("target_roi")
    if roi_str:
        return roi_str
    roi = item.get("annualized_roi_pct")
    if isinstance(roi, (int, float)):
        return f"{roi:.1f}%"
    return "n/a"


def evaluate_triage(company, min_gross_margin=15.0, max_dilution_pct=4.0, max_debt_to_equity=4.0):
    """
    Evaluates a company record against quantitative triage criteria.
    Returns: (status, reasons, de_listing_triggers)
    """
    reasons = []
    triggers = []
    symbol = company.get("symbol", "UNKNOWN")
    status = company.get("thesis_status", company.get("rating", "HOLD"))

    # Explicit Avoid Status in record
    if status == "AVOID" or company.get("triage_status") == "AVOID":
        reasons.append("EXPLICIT_AVOID_STATUS_RECORDED")
        triggers.append("Operational cash flow inflection or balance sheet recapitalization")

    # Financial and Solvency Metrics
    solvency = company.get("capital_needs_and_strategy", {})
    debt_equity = company.get("debt_to_equity")
    gross_margin = company.get("gross_margin_pct")
    fcf = company.get("free_cash_flow_usd_m")
    dilution_rate = company.get("annual_dilution_pct")
    runway_months = company.get("cash_runway_months")

    # If capital_needs_and_strategy object exists, pull nested fields
    if isinstance(solvency, dict):
        if "cash_runway_months" in solvency and runway_months is None:
            runway_months = solvency.get("cash_runway_months")
        if "going_concern" in solvency and solvency.get("going_concern") is True:
            reasons.append("GOING_CONCERN_AUDIT_WARNING")
            triggers.append("Unqualified clean audit opinion without going concern doubt")

    # Check Gross Margin
    if gross_margin is not None and gross_margin < min_gross_margin:
        reasons.append(f"SUB_PAR_GROSS_MARGIN ({gross_margin:.1f}% < {min_gross_margin:.1f}%)")
        triggers.append(f"Gross margin expansion above {min_gross_margin:.1f}%")

    # Check Dilution
    if dilution_rate is not None and dilution_rate > max_dilution_pct:
        reasons.append(f"HYPER_DILUTION_RATE ({dilution_rate:.1f}% > {max_dilution_pct:.1f}%/yr)")
        triggers.append(f"Share dilution rate capped below {max_dilution_pct:.1f}% annually")

    # Check Cash Runway
    if runway_months is not None and runway_months < 12 and (fcf is None or fcf < 0):
        reasons.append(f"CRITICAL_LIQUIDITY_RUNWAY ({runway_months} months < 12 months)")
        triggers.append("Cash runway extended beyond 24 months via self-funded FCF or equity raise")

    # Check Debt-to-Equity
    if debt_equity is not None and debt_equity > max_debt_to_equity and (fcf is None or fcf <= 0):
        reasons.append(f"EXCESSIVE_LEVERAGE (Debt/Equity {debt_equity:.1f}x > {max_debt_to_equity:.1f}x)")
        triggers.append(f"Debt-to-equity reduction below {max_debt_to_equity:.1f}x")

    # Check Target ROI Hurdle
    target_roi_str = str(company.get("target_roi", company.get("annualized_roi_pct", "0.0%")))
    roi_val = 0.0
    try:
        roi_clean = target_roi_str.replace("%", "").strip()
        roi_val = float(roi_clean)
    except (ValueError, TypeError):
        roi_val = 0.0

    if status == "AVOID" and not reasons:
        reasons.append("NEGATIVE_OR_UNFAVORABLE_RISK_REWARD")
        triggers.append("3-Year expected CAGR inflecting above 20.0% hurdle rate")

    if reasons:
        triage_status = "AVOID"
    else:
        triage_status = "QUALIFIED_CANDIDATE"

    return triage_status, reasons, triggers


def main():
    parser = argparse.ArgumentParser(description="Deterministic Stage 1 Triage Screener for Equity Universe.")
    parser.add_argument("--symbol", type=str, help="Specific ticker symbol to evaluate")
    parser.add_argument("--status", choices=["AVOID", "QUALIFIED_CANDIDATE", "ALL"], default="ALL", help="Filter output by triage status")
    parser.add_argument("--json", action="store_true", help="Output results in JSON format")
    parser.add_argument("--summary", action="store_true", help="Display aggregate token and compute ROI summary")
    parser.add_argument("--min-gross-margin", type=float, default=15.0, help="Minimum acceptable gross margin %%")
    parser.add_argument("--max-dilution", type=float, default=4.0, help="Maximum acceptable annual dilution %%")
    parser.add_argument("--max-debt-to-equity", type=float, default=4.0, help="Maximum acceptable Debt/Equity ratio")

    args = parser.parse_args()
    universe = load_universe()

    if not universe:
        print("Error: Master universe data not found.", file=sys.stderr)
        sys.exit(1)

    results = []
    avoid_count = 0
    qualified_count = 0

    for item in universe:
        sym = item.get("symbol", "").upper()
        if args.symbol and sym != args.symbol.upper():
            continue

        t_status, reasons, triggers = evaluate_triage(
            item,
            min_gross_margin=args.min_gross_margin,
            max_dilution_pct=args.max_dilution,
            max_debt_to_equity=args.max_debt_to_equity,
        )

        if t_status == "AVOID":
            avoid_count += 1
        else:
            qualified_count += 1

        if args.status != "ALL" and t_status != args.status:
            continue

        results.append({
            "symbol": sym,
            "name": item.get("name", ""),
            "sector": item.get("sector", ""),
            "triage_status": t_status,
            # A ticker awaiting authored valuation parameters carries no rating and
            # no ROI. Report the absence rather than defaulting it to HOLD at 0.0%.
            "thesis_rating": item.get("thesis_status") or item.get("rating") or "UNRATED",
            "target_roi": _format_roi(item),
            "avoid_reasons": reasons,
            "de_listing_triggers": triggers,
        })

    # Output formatting
    if args.json:
        payload = {
            "total_screened": len(results),
            "avoid_count": avoid_count,
            "qualified_count": qualified_count,
            "estimated_token_savings_pct": round((avoid_count / max(1, len(universe))) * 90.0, 1),
            "results": results,
        }
        print(json.dumps(payload, indent=2))
        return

    print("=" * 80)
    print("STAGE 1 EQUITY TRIAGE SCREENER & TOKEN OPTIMIZATION REGISTRY")
    print("=" * 80)
    print(f"Total Constituents Evaluated: {len(universe)}")
    print(f"Qualified Candidates (Stage 2 Deep Analysis): {qualified_count}")
    print(f"Avoid List (Frozen Deep Compute):             {avoid_count}")
    token_savings = round((avoid_count / max(1, len(universe))) * 90.0, 1)
    print(f"Estimated Token & Compute Savings:            ~{token_savings}%\n")

    print(f"{'SYMBOL':<8} {'TRIAGE STATUS':<22} {'RATING':<8} {'TARGET ROI':<12} {'PRIMARY TRIAGE REASON / RED FLAGS'}")
    print("-" * 80)

    for r in results[:40]:  # Display top results
        reasons_str = "; ".join(r["avoid_reasons"]) if r["avoid_reasons"] else "Meets quantitative hurdles"
        if len(reasons_str) > 40:
            reasons_str = reasons_str[:37] + "..."
        print(f"{r['symbol']:<8} {r['triage_status']:<22} {r['thesis_rating']:<8} {str(r['target_roi']):<12} {reasons_str}")

    if len(results) > 40:
        print(f"... and {len(results) - 40} more records (use --json or --symbol to inspect).")
    print("=" * 80)


if __name__ == "__main__":
    main()
