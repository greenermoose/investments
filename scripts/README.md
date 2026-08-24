# Deterministic CLI Scripts & Engines

This directory contains deterministic Python and Node.js command-line utilities used for data synchronization, API ingestion, mathematical modeling, and automated quality control audits.

For complete rules and decision criteria on when to use deterministic scripts versus generative AI agent reasoning, see [deterministic_vs_generative_execution.md](file:///c:/Users/fyhor/Documents/GitHub/investments/context/strategy/deterministic_vs_generative_execution.md).

## Script Catalog

- `parse_snapshot.py` (Portfolio Ingestion Agent): Parses uploaded CSV and text brokerage exports in `private/snapshots/`, isolates distinct accounts, tags covered call eligibility (>= 100 shares), and outputs normalized portfolio state.
- `screen_market.py` (Equity Research Agent): Screens US exchange-listed public equities against quantitative criteria targeting >= 20% annualized ROI with debt solvency and runway checks.
- `validate_thesis.py` (Investment Thesis Agent): Validates forward-looking 3-year quantitative forecasts, 13-quarter revenue paths, and price target bounds against `context/schemas/investment_thesis_schema.json`.
- `manage_memory.py` (Memory Agent): Audits persistent dossiers in `context/theses/*.md`, tracks catalyst deadlines, checks invalidation exit triggers, and inspects errata logs.
- `calculate_pricing.py` (Pricing Agent): Models Black-Scholes option pricing, Greeks (Delta, Theta, Gamma, Vega), Annualized Return on Collateral (AROC), net-credit rolls, and technical support/resistance limit order pricing.
- `generate_plan.py` (Lead Portfolio Manager): Generates structured plain ASCII text Weekly Trading Plans conforming to `context/schemas/trading_plan_schema.json`.
- `return_engine.py`: Computes annualized return on investment across multi-year holding horizons and scenario targets.
- `quality_control.py`: Deterministic quality control CLI tool to audit (`--audit`) and automatically fix (`--fix`) data integrity errors across symbols, company names, market prices, technical bounds, index memberships, financial math, and investment theses.
- `fetch_market_prices.py`: Extracts verified market share prices, daily trading volumes, historical OHLCV candlestick time-series, 52-week price ranges, and technical analysis indicators.
- `fetch_etf_holdings.py`: Extracts ETF constituents and portfolio weights from Tier 1 SEC EDGAR Form NPORT-P filings and fund sponsor feeds.
- `fetch_sec.py`: Fetches official 10-K, 10-Q, and 20-F XBRL data from SEC EDGAR for all equities in the universe.
- `build_sec_data.js`: Aggregates company SEC data from `http/data/` into consolidated JSON manifests (`http/sec-data.json`).
- `build_universe_json.py`: Synthesizes SEC EDGAR filings, company metadata, and fundamental valuation metrics into the master universe catalog (`http/data/universe.json`).

## Data Storage (`scripts/data/`)

Local binary databases, SQLite files, and Parquet caches populated by scripts are saved in `scripts/data/` (git-ignored):
- `scripts/data/qqq_holdings.json`: Authoritative constituent holdings and weights for Invesco QQQ Trust.
- `scripts/data/dia_holdings.json`: Authoritative constituent holdings and weights for SPDR Dow Jones Industrial Average ETF Trust.
- `scripts/data/spy_holdings.json`: Authoritative constituent holdings and weights for SPDR S&P 500 ETF Trust.
- `scripts/data/market_prices.json`: Ingested market quotes, daily volumes, technical levels, and 30-day candles.
- `scripts/data/company_meta.json`: Core qualitative company metadata, moats, and thesis parameters.
- `scripts/data/universe.db`: SQLite database caching market caps, 52-week ranges, and valuation multiples.
- `scripts/data/options_surface.parquet`: Historical volatility surfaces and options chains.

## Usage

Run scripts from the repository root:
```bash
# 1. Parse Portfolio Snapshot
python scripts/parse_snapshot.py --demo

# 2. Screen Market for >= 20% ROI Opportunities
python scripts/screen_market.py --min-roi 20.0

# 3. Model Pricing (Options & Limit Orders)
python scripts/calculate_pricing.py option --stock-price 124.50 --strike 120.00 --dte 35 --type put
python scripts/calculate_pricing.py limit --stock-price 124.50 --support 118.00 --resistance 135.00

# 4. Audit Institutional Memory & Invalidation
python scripts/manage_memory.py

# 5. Generate Plain-Text Weekly Trading Plan
python scripts/generate_plan.py

# Run Quality Control Audit
python scripts/quality_control.py --audit
```
