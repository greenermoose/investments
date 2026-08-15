# Deterministic CLI Scripts & Engines

This directory contains deterministic Python and Node.js command-line utilities used for data synchronization, API ingestion, and quantitative modeling.

## Script Catalog

- `fetch_sec.py`: Fetches official 10-K and 10-Q XBRL data from SEC EDGAR for US tickers.
- `build_sec_data.js`: Aggregates company SEC data from `http/data/` into consolidated JSON manifests (`http/sec-data.json`).
- `option_pricer.py` *(Roadmap Phase 4)*: Deterministic Black-Scholes weekend options pricer and Monday market-open limit order calculator.
- `sync_universe.py` *(Roadmap Phase 3)*: Synchronizes active NYSE, NASDAQ, and AMEX common stock directories into `scripts/data/universe.db`.

## Data Storage (`scripts/data/`)

Local binary databases, SQLite files, and Parquet caches populated by scripts are saved in `scripts/data/` (git-ignored):
- `scripts/data/universe.db`: SQLite database caching market caps, 52-week ranges, and valuation multiples.
- `scripts/data/options_surface.parquet`: Historical volatility surfaces and options chains.

## Usage

Run all scripts from the repository root:
```bash
python scripts/fetch_sec.py --ticker AAPL
node scripts/build_sec_data.js
```
