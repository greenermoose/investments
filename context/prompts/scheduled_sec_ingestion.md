# Scheduled SEC Filing Anticipation & Ingestion Protocol

This prompt protocol defines the scheduled workflow for projecting upcoming 10-Q and 10-K regulatory filing dates, monitoring statutory filing deadlines, and ingesting official XBRL financial statements into the universe knowledge store.

## Operational Context & Objective

SEC filings occur on a predictable quarterly and annual schedule governed by SEC statutory deadlines (Form 10-Q within 40-45 days of quarter-end; Form 10-K within 60-75-90 days of fiscal year-end). By anticipating when filings will be submitted, the agent team can ingest newly published financial facts immediately without wasting compute polling inactive companies.

## Execution Sequence

### Step 1: Generate & Audit Anticipated SEC Filing Calendar

Run the filing anticipation engine to identify companies with filings due in the next 14 to 30 days:

```bash
# Audit filings due in the next 30 days
python scripts/anticipate_sec_filings.py --upcoming-days 30

# Inspect imminent filings due in the next 14 days
python scripts/anticipate_sec_filings.py --status IMMINENT_NEXT_14_DAYS
```

### Step 2: Ingest Authoritative SEC EDGAR XBRL Data

For companies that have recently filed their 10-Q or 10-K, execute targeted live XBRL ingestion compliant with the SEC 10 requests/second rate limit:

```bash
# Ingest specific imminent filers
python scripts/fetch_sec.py --symbols NVDA CRM WDAY --live

# Re-aggregate TTM revenue and shares outstanding
node scripts/build_sec_data.js
python scripts/build_universe_json.py
```

### Step 3: Footnote & Off-Balance Sheet Encumbrance Update

If a newly filed Form 10-K contains updated footnote disclosures (e.g. revised operating lease schedules, pension gross PBO, or purchase commitments), update the off-balance sheet dataset:

```bash
python scripts/build_off_balance_sheet_data.py
```

### Step 4: Memory Agent Quarterly Milestone Audit

Check whether the new quarterly filing met or missed the thesis catalyst expectations:

```bash
python scripts/manage_memory.py
```

- If quarterly revenue exceeded expectations: evaluate whether forward 13Q trajectory warrants upward revision.
- If invalidation triggers were breached (e.g. gross margin contraction > 400 bps): initiate thesis downgrade or liquidation alert.

### Step 5: Quality Control Gate

Assert zero data discrepancies across all datasets:

```bash
python scripts/quality_control.py --audit
```

## Data Provenance & Output Stores

- **Primary Source:** SEC EDGAR Form 10-K, 10-Q, 20-F XBRL Company Facts (Tier 1 Primary Regulatory).
- **Synchronized Files:**
  - `context/data/sec_filing_calendar.json`
  - `context/data/equities/<TICKER>.json`
  - `http/data/<TICKER>.json`
  - `http/sec-data.json`
  - `context/data/sec_reports.json`
