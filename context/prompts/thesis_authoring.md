# Investment Thesis Authoring & Multi-Horizon Modeling

This prompt protocol defines the authoring standards, quantitative forecasting models, narrative guidelines, and rendering workflow for the Investment Thesis Agent.

## Executive Mandate & Standards

1. 20-Year Hurdle: Target >= 20% annualized return over a 20-year horizon.
2. Asset Focus: Active US exchange-listed common stocks (NYSE, NASDAQ, AMEX).
3. No Emojis & Clean Markdown: Never use emojis or standalone horizontal rules (`---`).
4. Schema Conformance: Authored research conforms to `context/schemas/equity_research_schema.json`. The rendered dossier at `context/theses/<TICKER>.md` conforms to `context/schemas/investment_thesis_schema.json`.

## The Authoring Workflow

Thesis dossiers are not generated. They are authored into the research store and then rendered from it. Three steps, in order.

### Step 1: See what is outstanding

```bash
python scripts/research_gaps.py --thesis-only --summary
python scripts/research_gaps.py --symbol NVDA
```

The gap report lists, per ticker and per field, what is unauthored and what each missing field blocks. This is the work queue.

### Step 2: Author into the research store

Research and write the missing sections into `context/data/equities/<TICKER>.json` under the `research` key. Write through the accessor so the block is validated before it lands:

```python
import sys; sys.path.insert(0, "scripts")
import research_store as store

research = store.load_research("NVDA")
research["tam_and_market_share"] = {
    "tam_estimate_usd_b": 620.0,
    "tam_cagr_pct": 24.0,
    "narrative": "...",
    "provenance": {
        "authored_by": "Investment Thesis Agent",
        "authored_date": "2026-08-28",
        "authority_tier": "TIER_4_AGENT_PARAMETRIC_KNOWLEDGE",
        "runtime_context_signature": "System clock ...; role ...; ...",
    },
}
store.write_research("NVDA", research)
```

`write_research` raises rather than writing a malformed block, so anything on disk can be trusted by a reader.

Every field carries provenance. Content sourced from a filing or a named public document is Tier 1 or Tier 2 with a `source_locator`. Content written from model weights without external verification is `TIER_4_AGENT_PARAMETRIC_KNOWLEDGE` and must carry a `runtime_context_signature` recording the system clock, the active role, and the prompt context (`AGENTS.md` section 6).

### Step 3: Render and validate

```bash
python scripts/render_thesis.py --symbols NVDA
python scripts/validate_thesis.py --file context/theses/NVDA.md
```

The renderer copies every authored sentence through verbatim and computes every number from the authored parameters. A ticker missing any required section is skipped with its gaps named and no file written, and the command exits non-zero. There is no mode that produces a dossier for a ticker you have not researched.

Batch selection is available for tickers that are already authored:

```bash
python scripts/render_thesis.py --all
python scripts/render_thesis.py --ratings BUY
python scripts/render_thesis.py --subset-file scratch/target_symbols.txt
```

## What You Author vs. What the Model Computes

You author the judgments. `scripts/valuation_model.py` computes what follows arithmetically from them.

| You author into `research` | The model computes |
| :--- | :--- |
| `valuation_parameters.annual_revenue_growth` | 13-quarter revenue path with catalyst ramps |
| `valuation_parameters.target_ps_multiple_multiplier` | 3-year target P/S and the interpolated path |
| `valuation_parameters.annual_share_dilution_rate` | 6-horizon diluted share projections |
| `valuation_parameters.conviction_score` | The BUY / HOLD / SELL / AVOID rating, with the Return Engine |
| `tam_and_market_share.tam_estimate_usd_b` | Current and projected market share percentages |
| `catalyst_timeline.items` | Where each catalyst's revenue lands across the 13 quarters |
| `dividend_profile` | Dividend proceeds inside the Return Engine |

Without `valuation_parameters` the model returns status `UNMODELED`. The ticker carries no rating, no price target, and no ROI until you author them. That is deliberate: a rating derived from a sector average is not a rating.

## Required Narrative Sections

Author non-formulaic, company-specific content. Text that would read identically for another company in the same sector is boilerplate, not research.

### 1. Business Profile (`business_profile`)
- Paragraph 1: Core operations, operating segments, flagship products or platforms, customer end-markets, and revenue model.
- Paragraph 2: Strategic positioning, proprietary technological edge, management capital allocation track record, and secular growth drivers.

### 2. Total Addressable Market & Market Share (`tam_and_market_share`)
- The TAM estimate in billions and the market's growth rate, both yours.
- A narrative covering market size, the competitor landscape, share defense, and adjacent-segment expansion. The script computes share percentages from your TAM figure; it does not estimate the TAM.

### 3. Competitive Moat Analysis (`competitive_moat_analysis`)
- Defensible economic moats: switching costs, network effects, IP, scale advantages.
- Durability of gross margins, pricing power, and return on invested capital.

### 4. Anticipated Catalysts (`catalyst_timeline`)
- Concrete product releases, service tiers, or platform expansions with target calendar quarters.
- Expected incremental revenue in billions, which the model ramps into the 13-quarter path. A catalyst dated outside the 13-quarter window contributes no modeled revenue.

### 5. Capital Needs & Strategy (`capital_strategy`)
- Capital allocation philosophy, repurchase authorization, primary capital needs, funding strategy, going concern assessment.
- Balance sheet figures come from Tier 1 filings via `fetch_sec.py` and are not authored here. Where the filings carry no balance sheet, the dossier says so.

### 6. Stock-Based Compensation & Lock-Up Dynamics (`stock_based_compensation`)
- SBC as a share of revenue, gross grant issuance, vesting architecture, lock-up status.
- These are findings from filings and proxy statements. There is no sector default.

### 7. Off-Balance Sheet & Long-Term Obligations (`off_balance_sheet_and_contingent_liabilities`)
- Forensic audit per `context/strategy/off_balance_sheet_liabilities_framework.md`: pension and OPEB gross PBO and funded status, environmental and PFAS reserves, mass tort dockets, unconditional purchase commitments.
- An absent block means unaudited, not zero. `scripts/build_off_balance_sheet_data.py` computes the encumbrance totals from what you audited and reports which tickers are outstanding.

### 8. Explicit Invalidation Criteria (`invalidation_criteria`)
- Concrete, measurable tripwires specific to this company: a margin threshold, a named customer concentration, a covenant, a competitive milestone.
- Integrate adversarial findings from `scripts/track_short_sellers.py --symbol <TICKER>` and `scripts/surveil_sentiment.py --symbols <TICKER>`.
- Criteria that would apply verbatim to any company are boilerplate. Every universe ticker previously carried the same four; that is the failure mode to avoid.

### 9. Revenue Drivers & Valuation Narratives
- `revenue_drivers_narrative`: what actually moves the 13-quarter line. The script renders the matrix; you explain it.
- `valuation_ps_multiple_narrative`: why the multiple moves as modeled and why the resulting return justifies the rating.
