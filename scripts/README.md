# Deterministic CLI Scripts & Engines

This directory contains deterministic Python and Node.js command-line utilities used for data synchronization, API ingestion, and quantitative modeling.

## Script Catalog

- `fetch_etf_holdings.py`: Extracts ETF constituents and portfolio weights from Tier 1 SEC EDGAR Form NPORT-P filings (e.g., Invesco QQQ Trust CIK `0001067839`) and fund sponsor feeds.
- `fetch_sec.py`: Fetches official 10-K, 10-Q, and 20-F XBRL data from SEC EDGAR for all equities in the universe.
- `build_sec_data.js`: Aggregates company SEC data from `http/data/` into consolidated JSON manifests (`http/sec-data.json`).
- `build_universe_json.py`: Synthesizes SEC EDGAR filings, company metadata, and fundamental valuation metrics into the master universe catalog (`http/data/universe.json`).
- `option_pricer.py` *(Roadmap Phase 4)*: Deterministic Black-Scholes weekend options pricer and Monday market-open limit order calculator.
- `sync_universe.py` *(Roadmap Phase 3)*: Synchronizes active NYSE, NASDAQ, and AMEX common stock directories into `scripts/data/universe.db`.

## Data Storage (`scripts/data/`)

Local binary databases, SQLite files, and Parquet caches populated by scripts are saved in `scripts/data/` (git-ignored):
- `scripts/data/qqq_holdings.json`: Authoritative constituent holdings and weights for Invesco QQQ Trust.
- `scripts/data/company_meta.json`: Core qualitative company metadata and moat profiles.
- `scripts/data/universe.db`: SQLite database caching market caps, 52-week ranges, and valuation multiples.
- `scripts/data/options_surface.parquet`: Historical volatility surfaces and options chains.

## Usage

Run scripts from the repository root:
```bash
# Extract QQQ ETF constituents
python scripts/fetch_etf_holdings.py --ticker QQQ

# Ingest SEC EDGAR XBRL filings
python scripts/fetch_sec.py

# Compute SEC TTM revenues & shares
node scripts/build_sec_data.js

# Build master universe catalog
python scripts/build_universe_json.py
```
