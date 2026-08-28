"""
Off-Balance Sheet & Long-Term Obligations Compiler

Propagates the agent-authored off-balance-sheet audit from the research store
into the derived datasets, computes the encumbrance totals, and reports which
tickers have not been audited yet.

The forensic findings themselves - gross PBO and funded status, environmental
and PFAS reserves, mass tort dockets, unconditional purchase commitments - are
research. They are read from context/data/equities/<TICKER>.json under
research.off_balance_sheet_and_contingent_liabilities, authored per
context/strategy/off_balance_sheet_liabilities_framework.md.

This script previously carried a generate_sector_default_profile() that
invented pension balances and Superfund site counts from the sector field. That
is gone. A ticker with no authored audit is reported as a gap: an absent audit
means unaudited, not zero.

Outputs:
- context/data/universe.json, http/data/universe.json
- scripts/data/company_meta.json (derived cache)

The markdown section for context/theses/<TICKER>.md is rendered by
scripts/render_thesis.py, which imports render_markdown_section from here.
"""

import argparse
import json
import os
import sys

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
scripts_dir = os.path.join(root_dir, "scripts")
if scripts_dir not in sys.path:
    sys.path.insert(0, scripts_dir)

import research_store

context_data_dir = os.path.join(root_dir, "context", "data")
http_data_dir = os.path.join(root_dir, "http", "data")
scripts_data_dir = os.path.join(root_dir, "scripts", "data")

FIELD = "off_balance_sheet_and_contingent_liabilities"


def compute_encumbrance_total(profile):
    """Sums the audited gross exposures into a single encumbrance figure.

    Arithmetic over authored findings. Categories the agent did not audit
    contribute zero to the sum, which is why the per-category detail is kept
    alongside the total rather than replaced by it.
    """
    pension = profile.get("pension_and_opeb") or {}
    environmental = profile.get("environmental_and_remediation") or {}
    litigation = profile.get("litigation_and_toxic_torts") or {}
    purchase = profile.get("purchase_commitments_and_guarantees") or {}

    components = [
        pension.get("pbo_gross_usd_b"),
        pension.get("opeb_unfunded_usd_b"),
        environmental.get("accrued_environmental_reserve_usd_b"),
        environmental.get("estimated_unreserved_exposure_usd_b"),
        litigation.get("recent_settlements_scheduled_usd_b"),
        purchase.get("unconditional_purchase_obligations_usd_b"),
        purchase.get("jv_and_vie_debt_guarantees_usd_b"),
    ]
    return round(sum(float(c) for c in components if isinstance(c, (int, float))), 2)


def annual_cash_drain(profile):
    """Sums the recurring annual cash outflows senior to equity distributions."""
    pension = profile.get("pension_and_opeb") or {}
    environmental = profile.get("environmental_and_remediation") or {}
    litigation = profile.get("litigation_and_toxic_torts") or {}

    components = [
        pension.get("annual_cash_contribution_usd_b"),
        environmental.get("annual_remediation_cash_drain_usd_b"),
        litigation.get("annual_legal_settlement_cash_drain_usd_b"),
    ]
    return round(sum(float(c) for c in components if isinstance(c, (int, float))), 2)


def _usd_b(value, zero_label="$0.00 B"):
    if not isinstance(value, (int, float)) or value <= 0:
        return zero_label
    return f"${float(value):.2f} B"


def _cell(text, limit=90):
    """Truncates an authored narrative for a table cell without altering it."""
    if not text:
        return "Not audited"
    text = str(text).replace("\n", " ").strip()
    return text if len(text) <= limit else text[:limit].rstrip() + "..."


def render_markdown_section(profile):
    """Renders the thesis dossier section from an authored audit.

    Formatting only. Every value and every sentence here was written by an
    agent into the research store.
    """
    pension = profile.get("pension_and_opeb") or {}
    environmental = profile.get("environmental_and_remediation") or {}
    litigation = profile.get("litigation_and_toxic_torts") or {}
    purchase = profile.get("purchase_commitments_and_guarantees") or {}

    pbo = pension.get("pbo_gross_usd_b")
    pbo_str = _usd_b(pbo, "None (defined contribution only)")
    gap_str = _usd_b(pension.get("funded_status_usd_b"), "$0.00 B")

    lines = [
        "## Off-Balance Sheet & Long-Term Obligations",
        profile.get("narrative", ""),
        "",
        "| Liability Category | Exposure / Status | Estimated Gross Value ($B) | Annual Cash Drain ($B/yr) | Risk & Priority Assessment |",
        "| :--- | :--- | :--- | :--- | :--- |",
        f"| Defined Benefit Pension & OPEB | {pension.get('underfunding_risk_level', 'Not audited')} "
        f"| PBO: {pbo_str} (Gap: {gap_str}) "
        f"| {_usd_b(pension.get('annual_cash_contribution_usd_b'))} / yr "
        f"| {_cell(pension.get('narrative'))} |",
        f"| Environmental Remediation & PFAS | Risk: {environmental.get('risk_level', 'Not audited')} "
        f"| Accrued: {_usd_b(environmental.get('accrued_environmental_reserve_usd_b'))} "
        f"({environmental.get('superfund_and_pfas_sites_count', 0)} Sites) "
        f"| {_usd_b(environmental.get('annual_remediation_cash_drain_usd_b'))} / yr "
        f"| {_cell(environmental.get('narrative'))} |",
        f"| Product Liability & Mass Torts | Risk: {litigation.get('catastrophic_loss_risk_level', 'Not audited')} "
        f"| Scheduled: {_usd_b(litigation.get('recent_settlements_scheduled_usd_b'))} "
        f"| {_usd_b(litigation.get('annual_legal_settlement_cash_drain_usd_b'))} / yr "
        f"| {_cell(litigation.get('active_mass_torts_or_mdl'))} |",
        f"| Purchase Commitments & Guarantees | {purchase.get('status', 'Active Contracts')} "
        f"| Total: {_usd_b(purchase.get('unconditional_purchase_obligations_usd_b'))} "
        f"| Take-or-Pay: {_usd_b(purchase.get('take_or_pay_commitments_usd_b'))} "
        f"| {_cell(purchase.get('narrative'))} |",
        "",
        f"**Total Audited Encumbrance:** ${compute_encumbrance_total(profile):.2f} B gross, "
        f"${annual_cash_drain(profile):.2f} B per year in recurring cash outflows.",
        "",
        f"**Equity Cash Flow Seniority Impact:** "
        f"{profile.get('equity_cash_flow_diversion_risk', 'Not assessed.')}",
    ]
    return "\n".join(lines) + "\n"


def _load_json(path, default):
    if not os.path.exists(path):
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def main():
    parser = argparse.ArgumentParser(
        description="Propagate authored off-balance-sheet audits and report unaudited tickers")
    parser.add_argument("--report-only", action="store_true",
                        help="Report coverage without writing derived datasets")
    args = parser.parse_args()

    universe_path = os.path.join(context_data_dir, "universe.json")
    if not os.path.exists(universe_path):
        universe_path = os.path.join(http_data_dir, "universe.json")
    universe = _load_json(universe_path, [])

    meta_path = os.path.join(scripts_data_dir, "company_meta.json")
    company_meta = _load_json(meta_path, {})

    audited = []
    unaudited = []

    for equity in universe:
        symbol = equity.get("symbol")
        if not symbol:
            continue

        research = research_store.load_research(symbol)
        profile = research.get(FIELD)

        if not profile:
            unaudited.append(symbol)
            # Clear any stale fabricated block left by the previous engine.
            equity.pop(FIELD, None)
            if symbol in company_meta:
                company_meta[symbol].pop(FIELD, None)
            continue

        errors = research_store.require_fields(symbol, [FIELD], research=research)
        if errors:
            unaudited.append(symbol)
            print(f"  {symbol}: authored audit failed validation - {errors[0].reason}")
            continue

        enriched = dict(profile)
        enriched["total_estimated_off_balance_sheet_encumbrance_usd_b"] = (
            compute_encumbrance_total(profile))
        enriched["total_annual_cash_drain_usd_b"] = annual_cash_drain(profile)

        equity[FIELD] = enriched
        company_meta.setdefault(symbol, {})[FIELD] = enriched
        audited.append(symbol)

    print(f"Off-balance-sheet coverage: {len(audited)} audited, {len(unaudited)} awaiting audit "
          f"across {len(universe)} universe equities.")
    if unaudited:
        preview = ", ".join(unaudited[:12])
        suffix = f", and {len(unaudited) - 12} more" if len(unaudited) > 12 else ""
        print(f"Awaiting an Investment Thesis Agent audit: {preview}{suffix}")
        print("Run 'python scripts/research_gaps.py --field "
              "off_balance_sheet_and_contingent_liabilities' for the full queue.")

    if args.report_only:
        return 0 if not unaudited else 1

    with open(os.path.join(context_data_dir, "universe.json"), "w", encoding="utf-8") as f:
        json.dump(universe, f, indent=2)
    with open(os.path.join(http_data_dir, "universe.json"), "w", encoding="utf-8") as f:
        json.dump(universe, f, indent=2)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(company_meta, f, indent=2)

    print("Synchronized context/data/universe.json, http/data/universe.json, "
          "and scripts/data/company_meta.json.")
    return 0 if not unaudited else 1


if __name__ == "__main__":
    sys.exit(main())
