# Rare Full Ground-Truth Regeneration & Anti-Hallucination Audit Protocol

This prompt protocol defines the comprehensive, end-to-end rebuild workflow used to regenerate the entire repository dataset directly from authoritative primary sources (Tier 1 SEC EDGAR XBRL APIs, official exchange feeds, and primary fund filings).

## Operational Context & Objective

AI models can experience hallucinations or parameter drift when relying purely on parametric weights over extended periods. In day-to-day operations, the system relies on the local structured cache ("trust but verify"). However, to ensure absolute zero hallucination risk, this comprehensive regeneration workflow can be executed on-demand to rebuild all derived datasets from original ground truth.

## Multi-Agent Execution Sequence

### Step 1: Ingest Fresh Tier 1 Primary SEC Registries

Fetch the authoritative master ticker-to-CIK directory from the SEC:

```bash
# Ingest official SEC CIK directory
python scripts/fetch_sec.py --live
```

### Step 2: Live Regulatory Ingestion Across Universe

Pull full XBRL company facts for all universe constituents directly from the SEC EDGAR API (enforcing the SEC rate limit):

```bash
# Live SEC XBRL statements fetch
python scripts/fetch_sec.py --live
```

### Step 3: Direct Exchange Price & Technical Indicators Refresh

Pull live market quotes, 52-week price ranges, and 30-day OHLCV candlesticks:

```bash
# Live exchange price and volume sync
python scripts/fetch_market_prices.py --live

# Rebuild historical daily closing price archive (18 months)
python scripts/fetch_market_prices.py --archive
```

### Step 4: Index Constituency Reconciliation (Form NPORT-P)

Verify index memberships for QQQ, DIA, and SPY from SEC Form NPORT-P filings:

```bash
python scripts/fetch_etf_holdings.py
```

### Step 5: Wall Street Coverage & Sell-Side Target Reconciliation

Re-fetch and compile analyst price target records and consensus statistics:

```bash
python scripts/fetch_analyst_targets.py --live
python scripts/reprocess_analyst_targets.py
python scripts/build_analyst_registry.py
```

### Step 6: Off-Balance Sheet Footnotes & Encumbrances Propagation

Propagate the authored pension, environmental, litigation, and purchase commitment
audits into the derived datasets, and report which tickers remain unaudited:

```bash
python scripts/build_off_balance_sheet_data.py
```

The audits themselves are authored by the Investment Thesis Agent into the research
store. This step computes the encumbrance totals and synchronizes the catalogs; it
does not construct a liability profile for an unaudited ticker.

### Step 7: Master Universe & Financial Catalogs Re-Synthesis

Deterministically aggregate TTM revenues, diluted share counts, enterprise values, and return distributions:

```bash
node scripts/build_sec_data.js
python scripts/build_universe_json.py
python scripts/anticipate_sec_filings.py
python scripts/surveil_sentiment.py --audit
python scripts/track_short_sellers.py --audit
```

Sentiment observations and short seller campaigns are agent research, not regenerable
output. A rebuild validates what has been recorded; it does not manufacture records for
tickers nobody has surveilled.

### Step 8: Multi-Horizon Valuation & Thesis Rendering

Render every dossier whose research is complete, and report the rest:

```bash
python scripts/research_gaps.py --thesis-only --summary
python scripts/render_thesis.py --all
```

`render_thesis.py` exits non-zero while any ticker is missing a required section.
That is expected during a rebuild and is not a rebuild failure: it is the standing
authoring backlog, which only an agent can clear.

### Step 9: Full Quality Control Audit Gate

Execute the comprehensive data integrity audit to assert 0 errors and 0 warnings:

```bash
python scripts/quality_control.py --audit
```

## Data Provenance & Anti-Hallucination Guarantee

- **Primary Source Hierarchy:** Tier 1 SEC EDGAR (10-K, 10-Q, 20-F, NPORT-P) and Direct Exchange Feeds.
- **Verification Guarantee:** 100% of mathematical metrics, shares, revenues, and price target bounds are computed by deterministic Python engines (`valuation_model.py`, `return_engine.py`, `quality_control.py`) rather than estimated via natural language.
