# Token Parsimony, Tiered Operational Cadences & Ground-Truth Regeneration

This strategy document defines the operational cadences, token economy architecture, trust-but-verify caching protocol, and primary source anti-hallucination regeneration procedures for the Agentic Investment Advisor system.

## 1. The Token Economy & Parsimony Mandate

Artificial intelligence agents operating on large language models (LLMs) incur compute costs and latency proportional to token volume. Running unbounded whole-universe generative queries on every price change or news alert is computationally wasteful and cost-prohibitive.

To maximize analytical rigor while maintaining strict token parsimony, the system enforces a tiered division of labor between deterministic software execution (0 LLM tokens) and tiered generative agent synthesis (500 to 15,000 tokens).

### Token Consumption Architecture Matrix

| Execution Layer | Primary Tooling | LLM Token Cost | Frequency / Cadence | Core Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **Layer 0: Deterministic Math & Scraping** | `fetch_market_prices.py`, `anticipate_sec_filings.py`, `calculate_pricing.py`, `return_engine.py`, `quality_control.py` | 0 Tokens | Intraday / Daily / Continuous | High-frequency price quotes, trading volume, Black-Scholes Greeks, CAGR math, SEC statutory deadlines, and schema verification. |
| **Layer 1: Lightweight Triage & Gating** | `triage_universe.py`, `screen_market.py` | 0 to 1,000 Tokens | Weekly / Discovery | Screening candidate equities, applying gross margin and cash runway filters, routing value traps to the Avoid List. |
| **Layer 2: Event-Driven Surveillance** | `surveil_sentiment.py`, `track_short_sellers.py` | 500 to 1,500 Tokens | Event-Driven / Daily | Scanning press releases, Reddit chatter, investor concern themes, and activist short seller publications. |
| **Layer 3: Single-Session Deliberation** | `weekly_deliberation.md`, `render_plan.py` | 2,000 to 5,000 Tokens | Weekly (Weekend Session) | Parsing user snapshot, checking limit buy/sell triggers, calculating CSP/CC orders, outputting plain ASCII trading plan. |
| **Layer 4: Universe Expansion & Coverage Onboarding** | `onboard_company.py`, `screen_market.py` | ~10,000 to 15,000 Tokens per Stock | Periodic / On-Demand (Few times/yr) | Screening candidates for >= 20% ROI hurdle, ingesting SEC XBRL filings, modeling multi-horizon valuation, authoring thesis dossiers, and updating master catalogs. |
| **Layer 5: Deep Institutional Thesis Authoring** | `thesis_authoring.md`, `valuation_model.py` | 10,000 to 15,000 Tokens per Stock | Targeted / Quarterly (BUY candidates only) | 13-quarter revenue modeling, 6-horizon diluted share paths, 4-horizon price target ranges, moat analysis, and invalidation triggers. |
| **Layer 6: Full Ground-Truth Regeneration** | `rare_full_source_regeneration.md`, `fetch_sec.py --live` | On-Demand / Periodic | Rare (Quarterly or Anti-Hallucination Audit) | Full rebuild from primary regulatory filings (SEC EDGAR XBRL) and exchange feeds to eliminate hallucinations and model drift. |

## 2. The Six Operational Cadences

The system structures all operations into six disciplined cadences:

### Cadence 1: High-Frequency Daily (Market Open & Close)
- **Objective:** Track intraday and daily price movements, trading volume anomalies, moving average breaches (SMA 20, SMA 50), and 52-week support/resistance levels.
- **Token Spend:** 0 LLM Tokens (Deterministic Python).
- **Execution Script:**
  ```bash
  python scripts/fetch_market_prices.py --live
  ```
- **Operational Trigger:** Executed daily before market open (9:00 AM ET) and after market close (4:30 PM ET) to maintain current market pricing in `context/data/market_prices.json` and `http/data/market_prices.json`.

### Cadence 2: Scheduled SEC Filing Anticipation & Ingestion
- **Objective:** Anticipate and ingest newly filed 10-Q and 10-K reports as public companies reach their statutory reporting deadlines.
- **Token Spend:** 0 Tokens (Calendar generation) to ~500 Tokens (Quarterly thesis parameter update).
- **Execution Workflow:**
  ```bash
  # Check upcoming filing windows for the next 30 days
  python scripts/anticipate_sec_filings.py --upcoming-days 30

  # Ingest authoritative XBRL financial facts for imminent filers
  python scripts/fetch_sec.py --symbols NVDA CRM WDAY --live
  ```
- **Operational Trigger:** Executed weekly to project the upcoming filing calendar and ingest official financial disclosures within 24 hours of filing.

### Cadence 3: Event-Driven Sentiment, Press & Short-Seller Surveillance
- **Objective:** Monitor corporate press release distribution wires, Reddit investor chatter (r/stocks, r/wallstreetbets, r/investing, r/ValueInvesting), and publications from 20 top activist short sellers (Hindenburg, Muddy Waters, Citron, Kerrisdale, etc.).
- **Token Spend:** 500 to 1,500 Tokens per active investigation.
- **Execution Workflow:**
  ```bash
  # Check sentiment polarity and investor concern themes
  python scripts/surveil_sentiment.py --concerns-only

  # Check active short seller campaigns and adversarial search templates
  python scripts/track_short_sellers.py --symbol SMCI
  ```
- **Operational Trigger:** Executed when breaking news occurs, when a short seller issues a campaign report, or during weekly deliberation to surface emerging friction points.

### Cadence 4: Weekly Deliberation & Single-Session Plan Synthesis
- **Objective:** Ingest weekend brokerage snapshots (`private/snapshots/`), evaluate dry powder, model Black-Scholes options limit orders, and synthesize the Monday 9:30 AM ET plain-text trading plan.
- **Token Spend:** 2,000 to 5,000 Tokens per run.
- **Execution Workflow:**
  Prompt AI agent using `context/prompts/weekly_deliberation.md`.
- **Operational Trigger:** Executed once per weekend between Friday market close and Sunday night.

### Cadence 5: Periodic / On-Demand Universe Expansion & Coverage Onboarding
- **Objective:** Proactively screen US public exchanges for compelling compounders with high potential to achieve >= 20% annualized ROI, and onboard single or batch equities into the public coverage universe on demand.
- **Token Spend:** ~10,000 to 15,000 Tokens per onboarded stock (or 0 tokens for deterministic screening).
- **Execution Workflow:**
  Prompt AI agent using `context/prompts/onboard_company.md` or execute:
  ```bash
  # Onboard single equity
  python scripts/onboard_company.py --symbol CRWD --live

  # Onboard batch of multiple equities (any number of additions)
  python scripts/onboard_company.py --symbols NOW ABNB NET MDB --live

  # Screen market for >= 20% ROI candidates and auto-onboard top N
  python scripts/onboard_company.py --screen --min-roi 20.0 --sector Technology --limit 3
  ```
- **Operational Trigger:** Executed on-demand whenever the user requests coverage expansion or identifies new prospective investment themes (anticipated a few times per year).

### Cadence 6: Rare Ground-Truth Regeneration & Full Audit
- **Objective:** Complete end-to-end reconciliation and dataset regeneration from primary regulatory sources (Tier 1 SEC EDGAR, exchange feeds) to guarantee zero hallucination drift.
- **Token Spend:** Deterministic script execution + focused agent verification.
- **Execution Workflow:**
  Prompt AI agent using `context/prompts/rare_full_source_regeneration.md`.
- **Operational Trigger:** Executed semi-annually, after major market dislocations, or whenever data discrepancy is suspected.

## 3. Trust-But-Verify Caching Architecture

To operate cheaply and quickly day-to-day without repeatedly querying remote endpoints or regenerating AI narratives, the system uses a persistent, structured caching hierarchy:

```
[ Tier 1: SEC EDGAR / Direct Exchanges ]
                   |
     (Rare / Scheduled Live Ingestion)
                   v
+---------------------------------------------------------+
| Local Ground-Truth Cache (scripts/data/, http/data/)     |
| - market_prices.json          - historical_price_archive|
| - sec_reports.json            - sec_filing_calendar.json|
| - short_sellers_directory.json- sentiment_surveillance  |
+---------------------------------------------------------+
                   |
         (Fast Day-to-Day Operations: 0 Tokens)
                   v
[ Quality Control Engine: scripts/quality_control.py --audit ]
                   |
         (0 Discrepancies Verified)
                   v
[ Multi-Agent Deliberation & Actionable Trading Plans ]
```

### Verification Rules for Cached Data:
1. **Never Assume Decimal Precision from Memory:** Financial digits, share counts, and revenue numbers are never recalled from LLM weights; they are read directly from `context/data/` or `http/data/`.
2. **Deterministic Parity Assertion:** Before any trading plan is finalized, `scripts/quality_control.py --audit` executes 8 programmatic integrity checks verifying that all universe constituents have valid prices, correct CIKs, and matching math.
3. **Errata Logging:** If any cached value is found to be stale or erroneous, it is corrected immediately and logged in `context/research/errata_log.md` conforming to `context/schemas/errata_schema.json`.

## 4. Anti-Hallucination Protocol & Primary Source Regeneration

When model hallucination, parameter drift, or schema corruption is suspected, agents execute the **Ground-Truth Regeneration Protocol**:

1. **Step 1: Purge Stale Derived State**
   Re-fetch fresh master CIK directory directly from the official SEC endpoint (`https://www.sec.gov/files/company_tickers.json`).
2. **Step 2: Live XBRL Re-Ingestion**
   Re-query `https://data.sec.gov/api/xbrl/companyfacts/` for all affected tickers to rebuild balance sheets, revenues, and diluted share counts.
3. **Step 3: Direct Exchange Price Sync**
   Re-pull live closing quotes and 30-day OHLCV candles via `scripts/fetch_market_prices.py --live`.
4. **Step 4: Deterministic Return Model Execution**
   Re-compute valuation multiples and CAGR returns through `scripts/valuation_model.py` and `scripts/return_engine.py`.
5. **Step 5: Automated Quality Control Gate**
   Execute `python scripts/quality_control.py --audit` to guarantee 0 errors and 0 warnings before resuming normal trading operations.
