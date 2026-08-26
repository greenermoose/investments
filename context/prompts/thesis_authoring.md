# Investment Thesis Authoring & Multi-Horizon Modeling

This prompt protocol defines the authoring standards, quantitative forecasting models, narrative guidelines, and tuning modes for the Investment Thesis Agent.

## Executive Mandate & Standards

1. 20-Year Hurdle: Target >= 20% annualized return over a 20-year horizon.
2. Asset Focus: Active US exchange-listed common stocks (NYSE, NASDAQ, AMEX).
3. No Emojis & Clean Markdown: Never use emojis or standalone horizontal rules (`---`).
4. Schema Conformance: Every thesis file in `context/theses/<TICKER>.md` must strictly conform to `context/schemas/investment_thesis_schema.json`.

## Full Universe vs. Targeted Subset Tuning

To optimize token efficiency and analytical depth, the system supports dual thesis authoring workflows:

### Mode A: Full Universe Batch Regeneration
Generates grounded multi-horizon quantitative matrices, 13Q revenue paths, 6H share counts, and 4H price target bands across all 150 universe constituents:
```bash
python scripts/generate_all_theses.py --full
```

### Mode B: Targeted Subset Tuning (Generative LLM Authoring)
Tuning deep generative authoring for newly onboarded candidates, high-conviction BUY candidates, or transitioning positions:
```bash
# Specific symbols
python scripts/generate_all_theses.py --symbols NVDA AAPL MSFT

# Specific rating category
python scripts/generate_all_theses.py --ratings BUY

# From a symbol file
python scripts/generate_all_theses.py --subset-file scratch/target_symbols.txt
```

## Six-Section Narrative Authoring Standard

When performing generative authoring on targeted companies, author non-formulaic, bespoke content across the six mandatory sections:

### 1. Business Profile (`## Business Profile`)
- Paragraph 1: Core operations, operating segments, flagship products/platforms, customer end-markets, and revenue model.
- Paragraph 2: Strategic positioning, proprietary technological edge, management capital allocation track record, and secular growth drivers.

### 2. Total Addressable Market & Market Share (`## Total Addressable Market & Market Share`)
- Estimated TAM Size ($B) and industry growth CAGR.
- Current Market Share (%) based on TTM revenue vs. TAM.
- 3-Year Projected Market Share trajectory under competitive dynamics.

### 3. Competitive Moat Analysis (`## Competitive Moat Analysis`)
- Defensible economic moats (switching costs, network effects, IP, scale advantages).
- Durability of gross margins, pricing power, and return on invested capital (ROIC > 15%).

### 4. Anticipated Catalysts & Timeline (`## Anticipated Catalysts & Timeline`)
- Concrete product releases, service tiers, or platform expansions with target calendar quarters.
- Expected incremental revenue impact ($B) and direct bridge to 13Q revenue path inflections.

### 5. Share Dilution or Buyback (`## Share Dilution or Buyback`)
- Active Board-authorized share repurchase programs, historical pace, and FCF allocation.
- Stock-based compensation (SBC) offset and net annual dilution/burn rate (< 3-4%/year).

### 6. Explicit Invalidation Criteria (`## Explicit Invalidation Criteria (Exit Triggers)`)
- Concrete, measurable tripwires that invalidate the thesis (e.g. gross margin collapse below threshold, loss of major customer, debt covenant breach).
- Integrate adversarial findings: Evaluate claims from activist short seller reports (`scripts/track_short_sellers.py --symbol <TICKER>`) and prominent investor concern themes (`scripts/surveil_sentiment.py --symbols <TICKER>`). Define explicit quantitative tripwires that would confirm a bear thesis (e.g. DSO spiking >25%, loss of Tier 1 anchor client, non-reliance accounting disclosures).

## Quantitative Multi-Horizon Matrices

Pass generative parameters to `scripts/valuation_model.py` and `scripts/return_engine.py` to deterministically calculate:
1. 13-Quarter Revenue Forecast Matrix ($Q_0$ through $Q_{12}$).
2. 6-Horizon Shares Outstanding Projections (13, 26, 39, 52, 104, 156 weeks).
3. 4-Horizon Price Target Ranges (13w, 52w, 104w, 156w) with Bear <= Base <= Bull.

## Validation & Verification

Always execute deterministic validation after modifying or generating dossiers:
```bash
python scripts/validate_thesis.py --file context/theses/<TICKER>.md
```
