# Deterministic CLI Scripts & Engines

This directory contains deterministic Python and Node.js command-line utilities used for data synchronization, API ingestion, mathematical modeling, coverage onboarding, and automated quality control audits.

For complete rules and decision criteria on when to use deterministic scripts versus generative AI agent reasoning, see [deterministic_vs_generative_execution.md](file:///c:/Users/Fred/github/investments/context/strategy/deterministic_vs_generative_execution.md).

## Script Catalog

- `onboard_company.py` (Equity Research & Investment Thesis Agents): Deterministic company onboarding engine supporting single, batch, or screened additions to the coverage universe with SEC EDGAR XBRL ingestion, market pricing, valuation modeling, thesis authoring, and quality control auditing.
- `screen_market.py` (Equity Research Agent): Screens US exchange-listed public equities against quantitative criteria targeting >= 20% annualized ROI with debt solvency and runway checks.
- `parse_snapshot.py` (Portfolio Ingestion Agent): Parses uploaded CSV and text brokerage exports in `private/snapshots/`, isolates distinct accounts, tags covered call eligibility (>= 100 shares), and outputs normalized portfolio state.
- `validate_thesis.py` (Investment Thesis Agent): Validates forward-looking 3-year quantitative forecasts, 13-quarter revenue paths, and price target bounds against `context/schemas/investment_thesis_schema.json`.
- `manage_memory.py` (Memory Agent): Audits persistent dossiers in `context/theses/*.md`, tracks catalyst deadlines, checks invalidation exit triggers, and inspects errata logs.
- `calculate_pricing.py` (Pricing Agent): Models Black-Scholes option pricing, Greeks (Delta, Theta, Gamma, Vega), Annualized Return on Collateral (AROC), net-credit rolls, Buy-to-Close (BTC) order pricing on losing propositions, and technical support/resistance limit order pricing.
- `generate_plan.py` (Lead Portfolio Manager): Generates structured plain ASCII text Weekly Trading Plans conforming to `context/schemas/trading_plan_schema.json`, including automated BUY TO CLOSE order formulation for downgraded positions.
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
# 1. Onboard a Single Equity (Live SEC & Market Feeds or Offline)
python scripts/onboard_company.py --symbol CRWD --live
python scripts/onboard_company.py --symbol CRWD --offline

# 2. Onboard Multiple Equities in Batch
python scripts/onboard_company.py --symbols NOW ABNB NET MDB --live
python scripts/onboard_company.py --symbols MSFT AAPL NVDA --offline

# 3. Screen Market for >= 20% ROI Candidates & Auto-Onboard
python scripts/onboard_company.py --screen --min-roi 20.0 --sector Technology --limit 3

# 4. Screen Market for Opportunities (Analysis Only)
python scripts/screen_market.py --min-roi 20.0 --limit 10
python scripts/screen_market.py --summary

# 5. Parse Portfolio Snapshot
python scripts/parse_snapshot.py --demo

# 6. Model Pricing (Options, Rolls, BTC & Limit Orders)
python scripts/calculate_pricing.py option --stock-price 124.50 --strike 120.00 --dte 35 --type put
python scripts/calculate_pricing.py roll --close-cost 3.50 --open-credit 4.80 --contracts 1
python scripts/calculate_pricing.py btc --symbol INTC --type put --strike 30.00 --current-mark 4.20 --contracts 1
python scripts/calculate_pricing.py limit --stock-price 124.50 --support 118.00 --resistance 135.00

# 7. Audit Institutional Memory & Invalidation
python scripts/manage_memory.py

# 8. Generate Plain-Text Weekly Trading Plan
python scripts/generate_plan.py

# 9. Run Deterministic Quality Control Audit
python scripts/quality_control.py --audit
```
