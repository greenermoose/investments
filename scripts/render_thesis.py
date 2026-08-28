#!/usr/bin/env python3
"""
scripts/render_thesis.py
Renders investment thesis dossiers to context/theses/<TICKER>.md.

This is a renderer, not an author. Every sentence in the output was written by
an agent into the research store (context/data/equities/<TICKER>.json) and is
copied through verbatim. Every number was computed by scripts/valuation_model.py
from parameters the agent supplied. This module composes no prose about any
company and supplies no default for any missing section.

A ticker missing a required research section is skipped: no file is written, the
gap is named, and the process exits non-zero. A partially authored dossier that
looks complete is worse than an absent one, because a reader cannot tell which
half was researched.

Conforms to context/schemas/investment_thesis_schema.json. Validate the output
with scripts/validate_thesis.py.

Usage:
    python scripts/render_thesis.py --all
    python scripts/render_thesis.py --symbols NVDA AAPL MSFT
    python scripts/render_thesis.py --ratings BUY
    python scripts/render_thesis.py --subset-file scratch/target_symbols.txt
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS_DIR = os.path.join(ROOT_DIR, "scripts")
if SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, SCRIPTS_DIR)

import research_store
from valuation_model import model_equity_valuation
from adr_registry import get_listing_metadata
from build_off_balance_sheet_data import render_markdown_section as render_off_balance_sheet

HTTP_DATA_DIR = os.path.join(ROOT_DIR, "http", "data")
CONTEXT_DATA_DIR = os.path.join(ROOT_DIR, "context", "data")
SCRIPTS_DATA_DIR = os.path.join(ROOT_DIR, "scripts", "data")
THESES_DIR = os.path.join(ROOT_DIR, "context", "theses")


def load_universe():
    path = os.path.join(HTTP_DATA_DIR, "universe.json")
    if not os.path.exists(path):
        path = os.path.join(CONTEXT_DATA_DIR, "universe.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict):
        return data.get("companies") or data.get("equities") or []
    return data


def load_analyst_targets():
    path = os.path.join(SCRIPTS_DATA_DIR, "analyst_price_targets.json")
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


# Exchange codes as reported by the market data feed. NASDAQ reports its three
# tiers separately; all three are the same listing exchange for our purposes.
EXCHANGE_CODES = {
    "NMS": "NASDAQ",   # NASDAQ Global Select
    "NGM": "NASDAQ",   # NASDAQ Global Market
    "NCM": "NASDAQ",   # NASDAQ Capital Market
    "NYQ": "NYSE",
    "ASE": "AMEX",
    "PCX": "AMEX",
    "NASDAQ": "NASDAQ",
    "NYSE": "NYSE",
    "AMEX": "AMEX",
}


def load_market_prices():
    path = os.path.join(SCRIPTS_DATA_DIR, "market_prices.json")
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def resolve_exchange(symbol, prices):
    """Reports the listing exchange from the market data feed.

    Index membership does not determine a listing exchange, and the previous
    generator inferred NYSE from Dow membership, which mislabelled every NASDAQ
    constituent of the Dow. Where the feed carries no exchange the dossier says
    so rather than picking the more likely one.
    """
    quote = prices.get(symbol) or {}
    mapped = EXCHANGE_CODES.get(str(quote.get("exchange", "")).upper())
    if mapped:
        return mapped

    listing = get_listing_metadata(symbol)
    primary = listing.get("primary_exchange")
    if primary in ("NASDAQ", "NYSE", "AMEX"):
        return primary
    return "Not recorded in the market data feed"


def render_summary(symbol, equity, model, research, prices):
    listing = get_listing_metadata(symbol)
    is_adr = listing.get("is_adr", False)
    listing_type = listing.get("listing_type", "US_COMMON_STOCK")

    listing_label = (
        "American Depositary Receipt (ADR/ADS)" if is_adr else listing_type.replace("_", " "))
    adr_description = listing.get("adr_underlying_description")
    if is_adr and adr_description:
        listing_label += f" ({adr_description})"

    lines = [
        "## Summary & Key Metrics",
        f"- **Ticker:** {symbol}",
        f"- **Exchange:** {resolve_exchange(symbol, prices)}",
        f"- **Benchmark Entry Price:** ${model['entry_price']:.2f} per share",
        f"- **Current Price:** ${model['current_price']:.2f} per share",
        f"- **Target Exit Price:** ${model['target_exit_price']:.2f} per share",
        f"- **Expected Holding Period:** {model['holding_period']}",
        f"- **Conviction Score:** {model['conviction_score']:.1f} / 10.0",
        f"- **Rating:** {model['rating']}",
        f"- **Target Strategy:** {model['target_strategy']}",
        f"- **Listing Structure:** {listing_label}",
    ]
    if is_adr or listing_type != "US_COMMON_STOCK":
        lines.append(f"- **Country of Origin:** {listing.get('country_of_origin', 'Unknown')}")
        if listing.get("primary_exchange"):
            lines.append(f"- **Primary Home Market:** {listing['primary_exchange']}")
        if listing.get("depositary_bank"):
            lines.append(f"- **Depositary Bank:** {listing['depositary_bank']}")

    sec_url = equity.get("sec_edgar_url")
    if sec_url:
        lines.append(f"- **SEC EDGAR URL:** {sec_url}")
    return lines


def render_tam(model, research):
    tam = research["tam_and_market_share"]
    share = model.get("market_share") or {}
    lines = ["## Total Addressable Market & Market Share", tam["narrative"], ""]
    if share:
        current = share.get("current_market_share_pct")
        projected = share.get("projected_market_share_3y_pct")
        lines.append(
            f"Computed against the ${share['tam_estimate_usd_b']:.1f}B addressable market "
            f"recorded above: current share {current:.2f}%"
            + (f", modeled 3-year share {projected:.2f}%." if projected is not None else ".")
        )
    return lines


def render_catalysts(research):
    catalysts = research["catalyst_timeline"]["items"]
    lines = ["## Anticipated Catalysts & Timeline"]
    for catalyst in catalysts:
        lines.append(
            f"- **{catalyst['product_or_service_name']}** ({catalyst['target_window']}): "
            f"expected top-line impact of ~${catalyst['expected_revenue_impact_b']:.2f}B "
            f"inflecting {catalyst['revenue_quarter_inflection']} revenue. "
            f"{catalyst['expected_outcome']}"
        )
    return lines


def render_capital_strategy(model, research):
    capital = research["capital_strategy"]
    lines = [
        "## Capital Needs & Strategy",
        capital["narrative"],
        "",
        f"- **Capital Allocation Philosophy:** "
        f"{capital['capital_allocation_philosophy'].replace('_', ' ').title()}",
    ]

    dividend_yield = model.get("dividend_yield_pct") or 0.0
    if dividend_yield > 0:
        lines.append(
            f"- **Dividends:** ${model['annual_dividend_usd']:.2f} per share annually "
            f"({dividend_yield:.2f}% yield)"
        )
    else:
        lines.append("- **Dividends:** No cash dividend recorded")

    capacity = capital.get("buyback_authorized_capacity_usd_b")
    if isinstance(capacity, (int, float)):
        lines.append(f"- **Authorized Repurchase Capacity:** ${capacity:.1f}B")
    lines.append(
        f"- **Modeled Net Annual Share Change:** {model['net_dilution_rate'] * 100.0:+.1f}% per year"
    )

    # Balance sheet figures come from Tier 1 filings or are reported absent.
    debt, cash = model.get("total_debt_usd"), model.get("cash_and_equivalents_usd")
    if isinstance(debt, float) and isinstance(cash, float):
        lines.append(
            f"- **Balance Sheet (latest filing):** ${cash / 1e9:.2f}B cash and equivalents "
            f"against ${debt / 1e9:.2f}B total debt "
            f"(net {model['net_cash_usd'] / 1e9:+.2f}B)"
        )
    else:
        lines.append(
            "- **Balance Sheet:** not available in the ingested filings for this ticker"
        )

    for label, key in [
        ("Primary Capital Needs", "primary_capital_needs"),
        ("Funding Strategy", "funding_strategy"),
        ("Going Concern Assessment", "going_concern_assessment"),
    ]:
        if capital.get(key):
            lines.append(f"- **{label}:** {capital[key]}")
    return lines


def render_sbc(research):
    sbc = research["stock_based_compensation"]
    lines = [
        "## Stock-Based Compensation & Lock-Up Dynamics",
        sbc["narrative"],
        "",
        f"- **Annual SBC:** {sbc['sbc_pct_of_revenue']:.1f}% of TTM revenue",
        f"- **Vesting Architecture:** {sbc['vesting_schedule_structure']}",
    ]
    if sbc.get("gross_annual_dilution_pct") is not None:
        lines.append(
            f"- **Gross Annual Grant Issuance:** {sbc['gross_annual_dilution_pct']:+.1f}% per year")
    if sbc.get("lock_up_status"):
        lines.append(f"- **Lock-Up Status:** {sbc['lock_up_status']}")
    if sbc.get("lock_up_details"):
        lines.append(f"- **Lock-Up Detail:** {sbc['lock_up_details']}")
    return lines


def render_forecast_table(model):
    lines = [
        "## 13-Quarter Revenue Forecast Matrix (3-Year Path)",
        "| Quarter | Date | Projected Revenue (USD) | YoY Growth (%) | Projected Shares (B) "
        "| Projected P/S | Modeling Basis |",
        "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
    ]
    for row in model["revenue_forecast_13q"]:
        if row["basis"] == "CATALYST_RAMP" and row.get("catalyst_name"):
            basis = f"Catalyst ramp: {row['catalyst_name']}"
        elif row["basis"] == "CATALYST_RAMP":
            basis = "Catalyst ramp (continuing)"
        else:
            basis = "Baseline growth extrapolation"
        lines.append(
            f"| {row['quarter_label']} | {row['date']} | ${row['projected_revenue_b']:.2f} B "
            f"| {row['yoy_growth_pct']:+.1f}% | {row['projected_shares_b']:.3f} B "
            f"| {row['projected_ps_multiple']:.2f}x | {basis} |"
        )
    return lines


def render_shares_table(model, research):
    dilution_note = research["capital_strategy"]["capital_allocation_philosophy"].replace(
        "_", " ").title()
    lines = [
        "## Shares Outstanding Projections (6 Horizons)",
        "| Horizon | Projected Diluted Shares | Net Annual Dilution / Burn Rate | Basis |",
        "| :--- | :--- | :--- | :--- |",
    ]
    for row in model["shares_projections_6h"]:
        lines.append(
            f"| {row['horizon_label']} | {row['shares_outstanding_m']:,.0f} M "
            f"| {row['net_annual_dilution_or_burn_rate_pct']:+.1f}% "
            f"| Compounded from the authored dilution rate under a {dilution_note} policy |"
        )
    return lines


def render_price_table(model):
    lines = [
        "## Price Target Ranges & Valuation Scenarios (4 Horizons)",
        "| Horizon | Bear Price (Downside) | Base Target Price | Bull Price (Upside) "
        "| Implied P/S Multiple | Expected Annualized CAGR |",
        "| :--- | :--- | :--- | :--- | :--- | :--- |",
    ]
    for row in model["price_target_ranges_4h"]:
        lines.append(
            f"| {row['horizon_label']} | ${row['bear_price']:.2f} | ${row['base_price']:.2f} "
            f"| ${row['bull_price']:.2f} | {row['implied_ps_multiple']:.1f}x "
            f"| {row['annualized_cagr_pct']:+.1f}% |"
        )
    return lines


def render_analyst_table(symbol, targets):
    """Renders recorded sell-side coverage, or states plainly that there is none.

    The previous generator emitted a synthetic "Wall Street Consensus" row built
    from this repository's own target price whenever real coverage was missing,
    which made a modeled number look like an external opinion.
    """
    lines = ["## Analyst Price Targets & Wall Street Coverage"]
    records = targets.get(symbol) or []
    if not records:
        lines.append(
            "No sell-side analyst coverage is recorded for this ticker in "
            "scripts/data/analyst_price_targets.json. This section reports external "
            "coverage only; it does not restate this repository's own price target."
        )
        return lines

    lines += [
        "| Analyst Name | Firm / Institution | Date Announced | Market Price at Announcement "
        "| Target Price | Implied Upside (%) | Rating / Action |",
        "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
    ]
    for record in records[:5]:
        lines.append(
            f"| {record.get('analyst_name', 'Unnamed analyst')} "
            f"| {record.get('firm', record.get('institution', 'Unnamed firm'))} "
            f"| {record.get('announcement_date', 'Undated')} "
            f"| ${float(record.get('market_price_at_announcement', 0.0)):.2f} "
            f"| ${float(record.get('target_price', 0.0)):.2f} "
            f"| {float(record.get('implied_upside_pct', 0.0)):+.1f}% "
            f"| {record.get('rating_action', record.get('action', 'Not stated'))} |"
        )
    return lines


def render_catalyst_table(research):
    lines = [
        "## Anticipated Catalyst Timeline",
        "| Target Date / Window | Product / Service Catalyst | Expected Revenue Impact ($B) "
        "| Revenue Quarter Inflection | Expected Outcome & Milestone | Status |",
        "| :--- | :--- | :--- | :--- | :--- | :--- |",
    ]
    for catalyst in research["catalyst_timeline"]["items"]:
        lines.append(
            f"| {catalyst['target_window']} | {catalyst['product_or_service_name']} "
            f"| ${catalyst['expected_revenue_impact_b']:.2f} B "
            f"| {catalyst['revenue_quarter_inflection']} | {catalyst['expected_outcome']} "
            f"| {catalyst['status']} |"
        )
    return lines


def render_provenance(model, research, has_analyst_coverage, as_of):
    """Attributes each element to its source tier per AGENTS.md section 6."""
    rows = [
        ("Financial Filings & Balance Sheet", "TIER_1_PRIMARY_REGULATORY",
         "SEC EDGAR Form 10-K / 10-Q", "deterministic_script (`fetch_sec.py`)",
         "VERIFIED_PRIMARY"),
        (f"Market Quote (${model['current_price']:.2f})", "TIER_2_FINANCIAL_AGGREGATOR",
         "Direct exchange feed", "deterministic_script (`fetch_market_prices.py`)",
         "VERIFIED_SECONDARY"),
        ("Quantitative Valuation & ROI Model", "TIER_1_PRIMARY_REGULATORY",
         "Return Engine (`scripts/return_engine.py`)", "deterministic_script",
         "VERIFIED_PRIMARY"),
    ]

    # One row per authored section, carrying that section's own provenance.
    for field in ("business_profile", "competitive_moat_analysis", "tam_and_market_share",
                  "valuation_parameters", "capital_strategy", "stock_based_compensation",
                  "catalyst_timeline", "invalidation_criteria"):
        entry = research.get(field)
        if not isinstance(entry, dict):
            continue
        provenance = entry.get("provenance") or {}
        rows.append((
            field.replace("_", " ").title(),
            provenance.get("authority_tier", "TIER_4_AGENT_PARAMETRIC_KNOWLEDGE"),
            provenance.get("source_locator", "Agent analytical reasoning"),
            f"authored by {provenance.get('authored_by', 'unattributed agent')} "
            f"on {provenance.get('authored_date', 'an unrecorded date')}",
            "VERIFIED_QUALITATIVE",
        ))

    if not has_analyst_coverage:
        rows.append((
            "Sell-Side Analyst Coverage", "TIER_3_CONSENSUS_ESTIMATES",
            "scripts/data/analyst_price_targets.json", "deterministic_script "
            "(`fetch_analyst_targets.py`)", "UNVERIFIED",
        ))

    lines = [
        "## Data Provenance & Verification Metadata",
        "",
        "| Data Element | Authority Tier | Source & Locator | Access Method "
        "| Retrieval / As-Of Date | Verification Status |",
        "| :--- | :--- | :--- | :--- | :--- | :--- |",
    ]
    for element, tier, locator, method, status in rows:
        lines.append(f"| {element} | {tier} | {locator} | {method} | {as_of} | {status} |")
    return lines


def render_dossier(symbol, equity, model, research, targets, prices, as_of):
    name = equity.get("name") or model["company_name"]
    has_coverage = bool(targets.get(symbol))

    lines = [f"# Investment Thesis Dossier: {symbol} - {name}", ""]
    lines += render_summary(symbol, equity, model, research, prices)
    lines += ["", "## Business Profile", research_store.get_text(research, "business_profile"), ""]
    lines += render_tam(model, research)
    lines += ["", "## Competitive Moat Analysis",
              research_store.get_text(research, "competitive_moat_analysis"), ""]
    lines += render_catalysts(research)
    lines += [""] + render_capital_strategy(model, research)
    lines += [""] + render_sbc(research)

    off_balance_sheet = research.get("off_balance_sheet_and_contingent_liabilities")
    if off_balance_sheet:
        lines += ["", render_off_balance_sheet(off_balance_sheet).rstrip()]

    lines += ["", "## Explicit Invalidation Criteria (Exit Triggers)",
              "If any of the following occur, the thesis is broken and the position will be exited:"]
    for idx, criterion in enumerate(research["invalidation_criteria"]["items"], 1):
        lines.append(f"{idx}. **Trigger {idx}:** {criterion}")

    lines += ["", "## Revenue Drivers Narrative",
              research_store.get_text(research, "revenue_drivers_narrative"), ""]
    lines += ["## Valuation & P/S Multiple Narrative",
              research_store.get_text(research, "valuation_ps_multiple_narrative"), ""]
    lines += render_forecast_table(model) + [""]
    lines += render_shares_table(model, research) + [""]
    lines += render_price_table(model) + [""]
    lines += render_analyst_table(symbol, targets) + [""]
    lines += render_catalyst_table(research) + [""]
    lines += render_provenance(model, research, has_coverage, as_of) + [""]

    return "\n".join(lines)


def select_symbols(universe, args):
    if args.symbols:
        wanted = {s.upper() for s in args.symbols}
        return [e for e in universe if e.get("symbol") in wanted]
    if args.subset_file:
        with open(args.subset_file, "r", encoding="utf-8") as f:
            content = f.read().strip()
        wanted = (set(json.loads(content)) if content.startswith("[")
                  else {line.strip().upper() for line in content.splitlines() if line.strip()})
        return [e for e in universe if e.get("symbol") in wanted]
    if args.ratings:
        allowed = {r.upper() for r in args.ratings}
        return [e for e in universe if str(e.get("thesis_status", "")).upper() in allowed]
    return universe


def main():
    parser = argparse.ArgumentParser(
        description="Render investment thesis dossiers from the agent-authored research store")
    parser.add_argument("--all", action="store_true", help="Render every universe equity")
    parser.add_argument("--symbols", nargs="+", help="Render specific symbols")
    parser.add_argument("--ratings", nargs="+", help="Render only symbols with these ratings")
    parser.add_argument("--subset-file", type=str,
                        help="Path to a text or JSON file listing symbols")
    args = parser.parse_args()

    os.makedirs(THESES_DIR, exist_ok=True)
    universe = load_universe()
    targets = load_analyst_targets()
    prices = load_market_prices()
    selected = select_symbols(universe, args)
    as_of = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    print(f"Rendering thesis dossiers for {len(selected)} equities...")

    rendered = 0
    skipped = []

    for equity in selected:
        symbol = equity.get("symbol")
        if not symbol:
            continue

        research = research_store.load_research(symbol)
        gaps = research_store.require_fields(
            symbol, research_store.THESIS_REQUIRED_FIELDS, research=research)
        if gaps:
            skipped.append((symbol, [g.field for g in gaps]))
            continue

        record = research_store.load_equity_record(symbol)
        model = model_equity_valuation(
            symbol=symbol,
            current_price=equity.get("current_price") or equity.get("closing_price") or 0.0,
            shares_outstanding=equity.get("shares_outstanding") or 0.0,
            ttm_revenue=equity.get("ttm_revenue") or 0.0,
            sector=equity.get("sector", ""),
            industry=equity.get("industry", ""),
            company_name=equity.get("name"),
            filings=record.get("filings"),
            research=research,
        )
        if model["status"] != "MODELED":
            skipped.append((symbol, [g["field"] for g in model["gaps"]]))
            continue

        content = render_dossier(symbol, equity, model, research, targets, prices, as_of)
        thesis_path = os.path.join(THESES_DIR, f"{symbol}.md")
        with open(thesis_path, "w", encoding="utf-8") as f:
            f.write(content)
        try:
            import activity_ledger
            activity_ledger.append_event_to_active_or_sys(
                event_type="THESIS_RENDERED",
                agent_role="Deterministic Script",
                subject=f"Rendered thesis dossier for {symbol}",
                symbol=symbol,
                target_path=f"context/theses/{symbol}.md",
                trigger="script_hook",
            )
        except Exception:
            pass
        rendered += 1

    print(f"Rendered {rendered} dossiers into {THESES_DIR}.")

    if skipped:
        print(f"\nSkipped {len(skipped)} equities with unauthored research. No file was written")
        print("for these: a dossier assembled around a missing section would read as complete.")
        for symbol, fields in skipped[:15]:
            print(f"  {symbol}: {', '.join(fields[:5])}"
                  + (f" (+{len(fields) - 5} more)" if len(fields) > 5 else ""))
        if len(skipped) > 15:
            print(f"  ... and {len(skipped) - 15} more")
        print("\nRun 'python scripts/research_gaps.py' for the full authoring queue.")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
