# Data Access Methodologies & Research Execution Protocols

This document details the exact protocols, tools, command-line scripts, and agent self-description procedures used to conduct research, look up new market information, and verify existing repository data.

## Research Execution Protocols

When conducting research on equities, macro variables, options pricing, or historical performance, agents and human researchers follow a three-stage execution pipeline:

```
+-------------------------------------------------------------------------+
| Stage 1: Problem Formulation & Source Tier Selection                    |
| Identify fact/claim -> Select highest available Source Tier (1 to 5)    |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| Stage 2: Deterministic Retrieval or Controlled Inference                |
| Execute Python CLI / Search Tool / Read URL / Agent Parametric Signature|
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| Stage 3: Provenance Recording & Cross-Verification                      |
| Attach DataProvenance object -> Cross-check against Tier 1 SEC EDGAR    |
+-------------------------------------------------------------------------+
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

## Methodology 2: Web Search & URL Retrieval for Real-Time Catalysts

### Purpose
Investigate breaking earnings releases, management guidance, regulatory approvals, FAA reviews, antitrust filings, or macro announcements.

### Protocol
1. **Search Formulation:** Formulate precise, non-ambiguous search queries targeting primary investor relations or regulatory domains.
2. **URL Content Extraction:** Use HTTP or browser fetching tools to read full press releases, transcripts, or official government notices.
3. **Provenance Attribution:** Record the exact URL, publication timestamp, retrieval date, and direct excerpt in the thesis update log.

## Methodology 3: AI Agent Parametric Knowledge Self-Description Protocol

### Purpose
When an AI agent provides analysis, conceptual frameworks, financial theory, or historical context directly from pre-training, Supervised Fine-Tuning (SFT), or Reinforcement Learning (RL) without invoking an external tool or third-party API.

### Policy & Self-Description Guidelines
1. **Full Transparency:** Agents are permitted to use internal parametric knowledge, provided the provenance is explicitly declared as `TIER_4_AGENT_PARAMETRIC_KNOWLEDGE`.
2. **Context-Inferred Signature:** If the agent does not have access to internal metadata revealing its exact base model version or knowledge cutoff date, it must record a runtime context signature describing its observed state:
   - **System Clock Timestamp:** Current date and time available in runtime metadata (e.g., `2026-08-16T11:15:00-04:00`).
   - **Active Role & Task Context:** The operational persona (e.g., `Valuation Specialist`, `Lead Portfolio Manager`) and task prompt supplied in the conversation.
   - **Explicit Model Identity Disclaimer:** Stating clearly that model architecture and cutoff date are inferred from runtime environment rather than internal telemetry.
3. **Verification Requirement:** Any critical numerical claims (such as specific dollar amounts for upcoming debt maturities or exact contract values) derived purely from parametric knowledge must be flagged as `UNVERIFIED` until corroborated by a Tier 1 or Tier 2 source.

### Example Parametric Provenance Block in Markdown
```markdown
### Data Provenance & Context Signature
- **Source Tier:** TIER_4_AGENT_PARAMETRIC_KNOWLEDGE
- **Source Name:** Agent Internal Pre-Training / Analytical Reasoning
- **Access Method:** agent_parametric_inference
- **Retrieval Timestamp:** 2026-08-16T11:18:00-04:00
- **Agent Role:** Fundamental Analyst & Valuation Specialist
- **Context Description:** Single-session weekly portfolio deliberation prompt; system clock date 2026-08-16; base model identity context-inferred.
- **Verification Status:** UNVERIFIED (Subject to primary SEC EDGAR cross-check)
```

## Methodology 4: Macro & Yield Curve Sourcing

### Purpose
Establish benchmark risk-free hurdle rates for option pricing and multi-stage DCF valuation models.

### Protocol
1. Reference the 3-Month US Treasury Bill rate via Federal Reserve Economic Data (FRED) or official US Treasury yield curve table.
2. Reference the SGOV 30-Day SEC yield for baseline cash proxy performance.
3. Use the latest yield figure as the `r` parameter in the Black-Scholes pricing engine (`scripts/option_pricer.py`).

## Methodology 5: Private Portfolio Snapshot Parsing

### Purpose
Ingest private brokerage holdings, cash balance, SGOV shares, and active option positions from `private/snapshots/`.

### Protocol
1. Process raw images or CSV exports strictly within the private boundary.
2. Parse exact share lots, cost basis per share, cash balances, and option contract parameters (strike, expiration, strategy).
3. Validate output against `context/schemas/portfolio_context.json`.
4. Ensure no private portfolio metrics leak into public web files or version control.
