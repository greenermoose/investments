# Deterministic CLI Scripts & Engines

This directory contains deterministic Python and Node.js command-line utilities used for data synchronization, API ingestion, mathematical modeling, coverage onboarding, rendering, and automated quality control audits.

Every script here is deterministic. None of them authors research. For the complete rules and decision criteria, see [deterministic_vs_generative_execution.md](file:///c:/Users/Fred/github/investments/context/strategy/deterministic_vs_generative_execution.md).

## The Research Store

Qualitative judgments and forward-looking parameters live in `context/data/equities/<TICKER>.json` under the `research` key, conforming to `context/schemas/equity_research_schema.json`. Agents author into it; scripts read from it.

A script that needs an unauthored field skips the record, names the gap, and exits non-zero. No script substitutes a sector average, peer median, or template sentence for research nobody wrote.

```bash
# What is outstanding, per field and per owning agent role
python scripts/research_gaps.py --summary
python scripts/research_gaps.py --symbol NVDA
python scripts/research_gaps.py --role "Investment Thesis Agent"
python scripts/research_gaps.py --format json
```

## Unified Master CLI Engine (`manage_universe.py`)

The primary entry point for human traders and autonomous AI agents:

```bash
# Display comprehensive help and all workflow options
python scripts/manage_universe.py --help

# 1. Count, Search, Filter & Sort Equities
python scripts/manage_universe.py list --status BUY --min-roi 20.0
python scripts/manage_universe.py list --sector Technology --sort-by roi --limit 10
python scripts/manage_universe.py list --index QQQ --format symbols
python scripts/manage_universe.py list --near-52w-low 15 --format compact

# 2. Update Live Market Share Prices (OHLC) & Trading Volume
python scripts/manage_universe.py update-prices --live
python scripts/manage_universe.py update-prices --symbols NVDA AAPL MSFT
python scripts/manage_universe.py update-prices --verify

# 3. Refresh SEC EDGAR Filings & Non-Price Datasets
python scripts/manage_universe.py refresh-sec --live
python scripts/manage_universe.py refresh-sec --all
python scripts/manage_universe.py refresh-sec --filings-calendar
python scripts/manage_universe.py refresh-sec --etf-holdings

# 4. Deterministic System Workflows
python scripts/manage_universe.py audit
python scripts/manage_universe.py gaps --summary
python scripts/manage_universe.py screen --min-roi 20.0 --limit 10
python scripts/manage_universe.py triage --summary
python scripts/manage_universe.py pricing option --stock-price 125.0 --strike 120.0 --dte 35 --type put
python scripts/manage_universe.py memory
python scripts/manage_universe.py snapshot --demo
python scripts/manage_universe.py onboard --symbol CRWD --live
python scripts/manage_universe.py rebuild-all
```

## Script Catalog

### Research store and gap reporting
- `research_store.py`: Read/write accessor and structural validator for the agent-authored research store. Every other script reads authored content through this module.
- `research_gaps.py`: The authoring queue. Reports which agent-authored fields each universe equity is missing, grouped by owning agent role, with what each gap blocks. Exits non-zero when gaps exist.

### Renderers
- `render_thesis.py` (Investment Thesis Agent): Renders `context/theses/<TICKER>.md` from the research store and the valuation model. Copies authored prose verbatim; composes none. Skips any ticker missing a required section rather than filling it in.
- `render_plan.py` (Lead Portfolio Manager): Validates an agent-authored order set conforming to `context/schemas/trading_plan_orders_schema.json` against the strategy mandate, recomputes the collateral and cash arithmetic, and renders the plain-ASCII Weekly Trading Plan. Selects no trades and writes no rationale.

### Modeling engines
- `valuation_model.py`: Compounds agent-supplied parameters into the 13-quarter revenue path, 6-horizon share projections, 4-horizon price target bands, and the rating. Returns status `UNMODELED` when parameters are unauthored.
- `return_engine.py`: Computes annualized return on investment across multi-year holding horizons and scenario targets.
- `calculate_pricing.py` (Pricing Agent): Black-Scholes option pricing, Greeks (Delta, Theta, Gamma, Vega), Annualized Return on Collateral (AROC), net-credit rolls, Buy-to-Close pricing, and technical support/resistance limit order pricing.
- `adr_registry.py`: Normalizes Foreign Private Issuers and dual-class shares to US ADR-equivalent share counts and USD financials.

### Ingestion
- `fetch_sec.py`: Fetches official 10-K, 10-Q, and 20-F XBRL data from SEC EDGAR for all universe equities.
- `fetch_market_prices.py`: Verified market prices, daily volumes, historical OHLCV, 52-week ranges, and technical indicators.
- `fetch_etf_holdings.py`: ETF constituents and weights from Tier 1 SEC EDGAR Form NPORT-P filings and fund sponsor feeds.
- `fetch_analyst_targets.py`, `reprocess_analyst_targets.py`, `build_analyst_registry.py`: Sell-side analyst price targets and the per-company coverage registry.
- `anticipate_sec_filings.py`: Anticipated 10-Q, 10-K, and 20-F filing windows from fiscal calendars and statutory deadlines.
- `populate_ir_urls.py`: Investor relations URL resolution.

### Screening and portfolio
- `screen_market.py` (Equity Research Agent): Screens US exchange-listed equities against quantitative criteria targeting >= 20% annualized ROI with debt solvency and runway checks.
- `triage_universe.py`: Stage 1 quantitative triage separating uninvestable value traps (`AVOID`) from `QUALIFIED_CANDIDATE` equities.
- `parse_snapshot.py` (Portfolio Ingestion Agent): Parses brokerage exports in `private/snapshots/`, isolates accounts, tags covered call eligibility, and computes dry powder.
- `onboard_company.py`: Brings a ticker into coverage with SEC XBRL ingestion and market pricing. Onboarding does not research: a newly onboarded ticker is marked `AWAITING_RESEARCH` and carries no rating until an agent authors its parameters.

### Catalog builders and validators
- `build_universe_json.py`: Synthesizes filings, metadata, authored research, and valuation output into `http/data/universe.json` and `context/data/universe.json`.
- `build_sec_data.js`: Aggregates company SEC data from `http/data/` into `http/sec-data.json`.
- `build_off_balance_sheet_data.py`: Propagates authored off-balance-sheet audits into the derived datasets, computes encumbrance totals, and reports unaudited tickers. Renders the thesis section consumed by `render_thesis.py`.
- `quality_control.py`: Audits (`--audit`) and repairs (`--fix`) data integrity across symbols, names, prices, technical bounds, index memberships, financial math, and thesis schema. Reports unauthored fields as tracked gaps rather than back-filling them.
- `validate_thesis.py` (Investment Thesis Agent): Validates rendered dossiers against `context/schemas/investment_thesis_schema.json`.
- `compare_roi_distribution.py`: Compares the modeled ROI distribution against empirical benchmarks (CRSP, J.P. Morgan Asset Management, S&P Dow Jones).
- `manage_memory.py` (Memory Agent): Audits dossiers in `context/theses/*.md`, tracks catalyst deadlines, checks invalidation triggers, and inspects errata logs.

### Surveillance readers
- `surveil_sentiment.py`: Reads, validates (`--audit`), and reports recorded investor sentiment and press observations. Sentiment is observed and recorded by agents from named sources; this script infers none from fundamentals, and an empty result means nothing was observed.
- `track_short_sellers.py`: Reads, validates (`--audit`), and reports activist short seller campaigns recorded in `context/data/short_seller_campaigns.json`.

## Data Storage (`scripts/data/`)

Caches and derived datasets populated by scripts. Binary caches (`*.db`, `*.parquet`) are git-ignored.
- `qqq_holdings.json`, `dia_holdings.json`, `spy_holdings.json`: Authoritative index constituents and weights.
- `market_prices.json`: Ingested quotes, volumes, technical levels, exchange codes, and 30-day candles.
- `company_meta.json`: Derived cache of company metadata and modeled valuation output. Not a system of record.
- `analyst_price_targets.json`, `analyst_coverage_registry.json`: Sell-side coverage.
- `universe.db`, `options_surface.parquet`: Local binary caches.

## Usage

Run scripts from the repository root:
```bash
# 1. Unified Master CLI (Recommended)
python scripts/manage_universe.py --help

# 2. See the outstanding research authoring queue
python scripts/research_gaps.py --summary

# 3. Onboard equities into coverage (does not research them)
python scripts/onboard_company.py --symbol CRWD --live
python scripts/onboard_company.py --symbols NOW ABNB NET MDB --live

# 4. Screen Market for Opportunities (Analysis Only)
python scripts/screen_market.py --min-roi 20.0 --limit 10

# 5. Render thesis dossiers from authored research
python scripts/render_thesis.py --symbols NVDA
python scripts/validate_thesis.py --all

# 6. Parse Portfolio Snapshot
python scripts/parse_snapshot.py --demo

# 7. Model Pricing (Options, Rolls, BTC & Limit Orders)
python scripts/calculate_pricing.py option --stock-price 124.50 --strike 120.00 --dte 35 --type put
python scripts/calculate_pricing.py roll --close-cost 3.50 --open-credit 4.80 --contracts 1
python scripts/calculate_pricing.py btc --symbol INTC --type put --strike 30.00 --current-mark 4.20 --contracts 1
python scripts/calculate_pricing.py limit --stock-price 124.50 --support 118.00 --resistance 135.00

# 8. Validate and render an agent-authored weekly order set
python scripts/render_plan.py --orders examples/sample_orders.json --snapshot examples/sample_portfolio.csv
python scripts/render_plan.py --orders private/plans/2026-08-31-orders.json --save

# 9. Audit Institutional Memory & Invalidation
python scripts/manage_memory.py

# 10. Run Deterministic Quality Control Audit
python scripts/quality_control.py --audit
```
