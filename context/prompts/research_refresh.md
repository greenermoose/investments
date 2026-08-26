# Full-Universe Research & Fact-Checking Refresh

This prompt protocol defines the multi-agent coordination workflow and tool sequence for conducting a comprehensive factual audit, SEC regulatory refresh, and errata verification across all constituents in the tracked investment universe.

## Executive Mandate & Standards

1. Source Authority Hierarchy:
   - Tier 1: SEC EDGAR 10-K, 10-Q, 20-F, and Form NPORT-P filings (supersedes all secondary aggregators).
   - Tier 2: Direct exchange data feeds, Yahoo Finance OHLCV candlestick time-series, and Wall Street coverage.
   - Tier 4: Agent Parametric Knowledge (with explicit runtime context signature).
2. Ground-Truth Verification: Every financial claim, revenue figure, and share count must match Tier 1 SEC EDGAR sources.
3. Dual-Mode Execution:
   - Offline Mode (`--offline`): Reprocesses and validates existing local data structures without external network queries.
   - Live Mode (`--live`): Queries SEC EDGAR (10 req/sec rate limit), exchange price feeds, and analyst releases.
4. Errata Tracking: Any erroneous, stale, or hallucinated claims discovered must be corrected in place and logged to `context/research/errata_log.md` conforming to `context/schemas/errata_schema.json`.

## Multi-Agent Execution Sequence

### Step 1: Regulatory Ingestion & Pricing Synchronization

1. Execute SEC Data Ingestion:
   ```bash
   # Offline cache verification
   python scripts/fetch_sec.py --offline

   # Live SEC EDGAR refresh (compliant with SEC rate limits)
   python scripts/fetch_sec.py --live
   ```

2. Execute Market Price & Technical Indicator Synchronization:
   ```bash
   # Offline verification
   python scripts/fetch_market_prices.py --offline

   # Live price and 52-week range update
   python scripts/fetch_market_prices.py --live
   ```

3. Execute Wall Street Analyst Coverage Refresh:
   ```bash
   # Offline verification
   python scripts/fetch_analyst_targets.py --offline

   # Live coverage refresh
   python scripts/fetch_analyst_targets.py --live
   ```

4. Refresh Index Memberships (QQQ, SPY, DIA):
   ```bash
   python scripts/fetch_etf_holdings.py
   ```

### Step 2: Footnote & Off-Balance Sheet Encumbrance Audit

1. Audit company footnotes for pension/OPEB gross PBO, environmental/PFAS reserves, and take-or-pay purchase commitments:
   ```bash
   python scripts/build_off_balance_sheet_data.py
   ```

2. Re-synthesize master catalogs:
   ```bash
   node scripts/build_sec_data.js
   python scripts/build_universe_json.py
   ```

### Step 3: Memory Agent Audit & Catalyst Tracking

1. Audit persistent dossiers in `context/theses/*.md` against catalyst deadlines:
   ```bash
   python scripts/manage_memory.py
   ```
2. Verify if any catalyst target date has passed:
   - If the company exceeded milestone expectations, confirm whether revenue growth or multiple warrants an upward revision.
   - If the company failed milestone execution or breached invalidation criteria, initiate thesis revision or liquidation alerts.
3. Record any errata identified during the audit in `context/research/errata_log.md`.

### Step 4: Quality Control Verification

Execute full deterministic quality control to assert zero schema, data type, or mathematical integrity violations:
```bash
python scripts/quality_control.py --audit
```
