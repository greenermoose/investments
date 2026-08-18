# Data Access Methodologies & Research Execution Protocols

This document details the exact protocols, tools, command-line scripts, search engines, and agent self-description procedures used to conduct research, look up market information, track sell-side analyst revisions, and verify repository data.

## Research Execution Protocols

When conducting research on equities, macro variables, options pricing, or historical performance, agents and human researchers follow a three-stage execution pipeline:

```
+-----------------------------------------------------------------------------------------+
| Stage 1: Problem Formulation & Source Tier Selection                                    |
| Identify fact/claim -> Select highest available Source Tier (1 to 5)                    |
+-----------------------------------------------------------------------------------------+
                                             |
                                             v
+-----------------------------------------------------------------------------------------+
| Stage 2: Deterministic Retrieval, Search Ingestion or Controlled Neural Inference       |
| Execute Python CLI / Search Tool / Read URL / Ingest Targets / Parametric Context Sign. |
+-----------------------------------------------------------------------------------------+
                                             |
                                             v
+-----------------------------------------------------------------------------------------+
| Stage 3: Provenance Recording & Ground-Truth Cross-Verification                         |
| Attach DataProvenance object -> Cross-check against Tier 1 SEC EDGAR XBRL Data          |
+-----------------------------------------------------------------------------------------+
```

## Methodology 1: Primary SEC EDGAR Financial Data Retrieval

### Purpose
Retrieve audited annual (10-K) and quarterly (10-Q) statements, balance sheet health, free cash flow figures, and shares outstanding.

### Execution via Deterministic Script
Agents and operators execute the Python utility:
```bash
python scripts/fetch_sec.py --ticker <TICKER>
```

### Script Mechanics
1. Resolves ticker to SEC Central Index Key (CIK) via official SEC mapping.
2. Queries the SEC XBRL Company Facts endpoint:
   `https://data.sec.gov/api/xbrl/companyfacts/CIK{cik.zfill(10)}.json`
3. Parses standardized US-GAAP taxonomies:
   - Revenues (`us-gaap/Revenues`, `us-gaap/SalesRevenueNet`)
   - Net Income (`us-gaap/NetIncomeLoss`)
   - Operating Cash Flow (`us-gaap/NetCashProvidedByUsedInOperatingActivities`)
   - Capital Expenditures (`us-gaap/PaymentsToAcquirePropertyPlantAndEquipment`)
   - Long-Term Debt (`us-gaap/LongTermDebtNoncurrent`)
   - Common Shares Outstanding (`us-gaap/CommonStockSharesOutstanding`)
4. Caches structured JSON in `http/data/<ticker>_sec.json` and updates `http/sec-data.json` via `node scripts/build_sec_data.js`.

### SEC Compliance Requirements
- Must maintain user-agent header conforming to SEC standards.
- Enforce strict 10 requests-per-second rate limit.

## Methodology 2: Wall Street Analyst Coverage & Price Target Ingestion

### Purpose
Track individual sell-side equity research price targets, recommendation revisions (Buy/Hold/Sell), announcement dates, and consensus distributions across the active equity universe.

### Institutional Ecosystem & Discovery Flow
1. **Sell-Side Research Distribution:** Major investment banks (Goldman Sachs, Morgan Stanley, JPMorgan, Bernstein, Wedbush, Bank of America, UBS, Barclays, Citigroup, Jefferies, Evercore ISI, Baird) publish proprietary equity research notes behind client paywalls (Bloomberg Terminal, FactSet, Refinitiv, client portals).
2. **Pre-Market Newswire Dispatches (6:00 AM - 9:00 AM ET):** Lead analyst actions are broadcast across financial newswires (Bloomberg News, Dow Jones, Reuters, The Fly on the Wall, StreetInsider, Benzinga, Seeking Alpha).
3. **Structured Aggregator Normalization:** Dedicated aggregators (MarketBeat, TipRanks, Financial Modeling Prep API) parse and structure these dispatches into real-time feeds.
4. **Agent Ingestion Protocol:**
   - Programmatic extraction via Financial Modeling Prep API (`GET /v4/price-target?symbol={TICKER}`).
   - Direct web audit via MarketBeat forecast tables (`https://www.marketbeat.com/stocks/{EXCHANGE}/{TICKER}/price-target/`).
   - Analyst credibility calibration via TipRanks historical accuracy ratings (`https://www.tipranks.com/stocks/{TICKER}/forecast`).
5. **Ground-Truth Linking:** Every recorded target must be saved to `scripts/data/analyst_price_targets.json` conforming to `context/schemas/analyst_price_target_schema.json` with an audited `source_url` link.

## Methodology 3: Web Search & URL Retrieval for Real-Time Catalysts

### Purpose
Investigate breaking earnings releases, management guidance, regulatory approvals, FAA reviews, antitrust filings, or macro announcements.

### Tools & Protocol
1. **`search_web` Engine:** Formulate precise, non-ambiguous search queries targeting primary investor relations or regulatory domains (e.g. `"NVIDIA" "10-Q" "data center revenue" 2026`).
2. **`read_url_content` & Browser Subagents:** Use HTTP and headless browser tools to extract full press releases, transcripts, or official government notices.
3. **SEC EDGAR Full-Text Search (EFTS):** Query `https://efts.sec.gov/LATEST/search-index` to search specific footnote disclosures across millions of filings.
4. **Provenance Attribution:** Record the exact URL, publication timestamp, retrieval date, and direct excerpt in the thesis update log.

## Methodology 4: AI Agent Parametric Knowledge & Internal Weight Token Generation

### Purpose
When an AI agent synthesizes qualitative moat analyses, Porter's Five Forces dynamics, corporate competitive strategies, or financial theories directly from internal neural network weights without executing external tool calls.

### Technical Mechanics of Parametric Generation
1. **Pre-Training Compression:** Foundation transformer models pre-train on trillions of tokens (including decades of SEC 10-K/10-Q filings, financial newswires, earnings transcripts, and academic finance literature), encoding structural relationships into billions of neural weight parameters.
2. **Self-Attention & Latent Knowledge Activation:** Ingested prompt tokens activate multi-head self-attention mechanisms, routing queries through feed-forward layers that capture statistical regularities of corporate operations and financial economics.
3. **Next-Token Logit Computation:** The output projection layer computes logits across the token vocabulary, and softmax turns them into sampling probabilities, generating institutional-grade text token by token.
4. **Post-Training Alignment:** Supervised Fine-Tuning (SFT) and Reinforcement Learning (RLHF/DPO) steer token probabilities toward rigorous analytical structure, quantitative discipline, and schema adherence.

### Governance Rules for Parametric Knowledge
1. **Explicit Provenance:** Tag internal knowledge as `TIER_4_AGENT_PARAMETRIC_KNOWLEDGE`.
2. **Runtime Context Signature:** If model identity/cutoff is not programmatically exposed, record system clock timestamp, active role persona, and prompt context.
3. **Mandatory SEC Cross-Check:** Any numerical claims (e.g. historical revenue or share counts) derived from parametric memory must be marked as `UNVERIFIED` until confirmed via Tier 1 SEC EDGAR XBRL filings.

### Example Parametric Provenance Block in Markdown
```markdown
### Data Provenance & Context Signature
- **Source Tier:** TIER_4_AGENT_PARAMETRIC_KNOWLEDGE
- **Source Name:** Agent Internal Pre-Training / Analytical Reasoning
- **Access Method:** agent_parametric_inference
- **Retrieval Timestamp:** 2026-08-18T09:40:00-04:00
- **Agent Role:** Fundamental Analyst & Valuation Specialist
- **Context Description:** Public universe thesis deliberation; system clock date 2026-08-18; base model identity context-inferred.
- **Verification Status:** UNVERIFIED (Subject to primary SEC EDGAR cross-check)
```

## Methodology 5: Macro & Yield Curve Sourcing

### Purpose
Establish benchmark risk-free hurdle rates for option pricing and multi-stage DCF valuation models.

### Protocol
1. Reference the 3-Month US Treasury Bill rate via Federal Reserve Economic Data (FRED) or official US Treasury yield curve table.
2. Reference the SGOV 30-Day SEC yield for baseline cash proxy performance.
3. Use the latest yield figure as the `r` parameter in the Black-Scholes pricing engine (`scripts/option_pricer.py`).

## Methodology 6: Private Portfolio Snapshot Parsing

### Purpose
Ingest private brokerage holdings, cash balance, SGOV shares, and active option positions from `private/snapshots/`.

### Protocol
1. Process raw images or CSV exports strictly within the private boundary.
2. Parse exact share lots, cost basis per share, cash balances, and option contract parameters (strike, expiration, strategy).
3. Validate output against `context/schemas/portfolio_context.json`.
4. Ensure no private portfolio metrics leak into public web files or version control.

## Methodology 7: Free API Etiquette, Rate Limits & Anti-Abuse Standards

### Purpose
Ensure all deterministic scripts and AI agent tool calls operate reliably, respect open source and government API terms of service, and eliminate the risk of IP throttling, rate-limit bans, or API key revocation.

### Universal Etiquette & Rate Limit Rules

| Data Provider | Endpoint / Service | Hard Rate Limit | Enforced Throttle in Repo | Required Headers & Authentication | Caching Policy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC EDGAR** | Company Facts, Submissions, NPORT-P | 10 requests / second | Max 5-8 requests / second (`time.sleep(0.15)`) | `User-Agent: SampleApp AdminContact@domain.com` (Mandatory) | Local JSON in `http/data/` and `scripts/data/` (Permanent until new filing) |
| **FRED (St. Louis Fed)** | Macro Economic Series REST API | 120 requests / minute | 1 request per benchmark run | Free Developer API Key (`api_key=...`) | Cached in `scripts/data/macro_rates.json` (24-hour TTL) |
| **US Treasury** | Daily Par Yield Curve Feeds | Unspecified (Fair Use) | 1 batch pull per execution | Standard HTTP `User-Agent` | Cached with macro series (24-hour TTL) |
| **Yahoo Finance** | `/v8/finance/chart/{symbol}` | Unofficial / Variable | 0.2s pause between symbols | Standard Browser `User-Agent` | Cached in `http/data/market_prices.json` (End-of-day / Single-session) |
| **NASDAQ Trader FTP** | `ftp.nasdaqtrader.com` | Unspecified (Fair Use) | 1 session download per day | Anonymous FTP login | Cached in `scripts/data/` (Daily refresh) |
| **MarketBeat / IR Portals** | Analyst Coverage & IR Transcripts | Polite Web Crawling | 0.5s pause between pages | Standard HTTP `User-Agent` | Cached in `scripts/data/analyst_price_targets.json` |

### Error Recovery & Exponential Backoff Protocol

When scripts or agents encounter HTTP response codes from external endpoints, they must adhere to the following deterministic error protocol:
1. **HTTP 429 (Too Many Requests / Rate Limited):**
   - Check response for `Retry-After` header. If present, pause for the indicated number of seconds.
   - If absent, initiate exponential backoff: retry after 2s, 4s, 8s, up to 3 retries max before aborting and falling back to cached disk data.
2. **HTTP 403 (Forbidden / Bad User-Agent):**
   - Immediately verify that the `User-Agent` conforms to the provider's specification (e.g. SEC format `AdminContact@domain.com`).
   - Never hammer a 403 response in a loop.
3. **HTTP 500 / 503 (Server Error / Temporary Outage):**
   - Log the temporary outage to system stdout and fall back gracefully to previous cached values in `http/data/` or `context/data/`.
4. **Local Disk Cache Primacy:**
   - AI agents must always check if fresh data exists in `http/data/`, `context/data/`, or `scripts/data/` before initiating remote network calls.

