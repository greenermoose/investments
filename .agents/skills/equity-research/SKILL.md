---
name: equity-research
description: Market-wide discovery workflows, quantitative screening rules, 20%+ annualized ROI hurdle evaluation, balance sheet solvency and runway verification, and universe onboarding for the Equity Research Agent.
---

# Equity Research Agent Skill

## Overview
This skill defines the complete operational protocol, search methodologies, quantitative screening rules, and universe onboarding workflows for the **Equity Research Agent**.

The Equity Research Agent acts as the proactive discovery engine for the investment system. Rather than being confined to a static universe, this agent searches the broader Internet and public US equity markets (NYSE, NASDAQ, AMEX) using web search, SEC EDGAR NPORT-P / Form 10-K filings, and deterministic screening tools to discover high-conviction companies that offer a high probability of generating 20% or greater annualized return on investment (ROI).

The user can invoke this workflow at any time to add single equities or any number of additional equities in batch (typically anticipated a few times per year), expanding the universe of covered public equities.

## Core Responsibilities

### 1. Market-Wide Discovery & Tool Usage
- Search across public market sources, SEC EDGAR discovery feeds, index/ETF constituent updates (via `scripts/fetch_etf_holdings.py`), and industry research to find compelling US-listed equities.
- Evaluate companies across high-growth technology, capital-light platforms, specialized industrial compounders, healthcare innovators, and consumer monopolies.
- Ensure all discovered assets are exchange-listed common stocks or liquid US-listed ADRs (strictly excluding OTC penny stocks, closed-end funds, and leveraged ETFs).

### 2. The 20%+ Annualized ROI Hurdle
- The primary evaluation standard is the probability of achieving >= 20% annualized return over a 3-year to 5-year investment horizon.
- Model estimated return power using the dual compounding equation:
  $$\text{Total 3-Year Return} = (1 + g_{\text{rev}})^3 \times \left(\frac{P/S_{\text{target}}}{P/S_{\text{current}}}\right)$$
- An equity qualifies for universe onboarding when conservative revenue growth and realistic multiple maintenance/expansion produce an annualized compounding rate >= 20.0%.

### 3. Two-Stage Triage Gating & Token ROI Optimization
- To maximize the ROI of tokens and compute time, route all candidate equities through the **Stage 1 Lightweight Triage Gate** before initiating deep research (conforming to `context/strategy/token_triage_and_avoid_pipeline.md` and `context/strategy/avoid_vs_sell_framework.md`):
  - **Deterministic Filter**: Execute `python scripts/triage_universe.py` or `python scripts/onboard_company.py` to evaluate gross margin viability (>=15%), cash runway (>=12 months or positive FCF), leverage (Debt/Equity <= 4.0x), and annual share dilution (<=4.0%/year).
  - **Red Flag Gating**: Equities exhibiting secular disruption, negative unit economics, going-concern warnings, or toxic unquantifiable liabilities are assigned to the **Avoid List** (`triage_status: "AVOID"`).
  - **Avoid List Freezing**: Equities on the Avoid List receive lightweight triage metadata and are frozen from expensive Stage 2 deep analysis until explicit de-listing triggers are met.

### 4. Solvency, Runway & Off-Balance Sheet Encumbrance Audit
- For candidate equities passing Stage 1 triage, perform a rigorous **solvency, runway, and off-balance sheet liability check**:
  - Debt-to-Equity / Net Debt to EBITDA: Confirm leverage is manageable given the stability of cash flows (typically Debt/Equity < 3.5x for capital-light models).
  - Cash Runway & Liquidity: Ensure liquid cash and short-term investments cover at least 12 to 24 months of operational cash burn for non-profitable growth firms.
  - Dilution / SBC Rate: Verify that annual share count dilution from stock-based compensation is moderate (< 3% to 5% annually) so per-share compounding is preserved.
  - Going Concern / Solvency Audit: Confirm absence of debt default covenants, distress restructuring, or going-concern disclosures in recent SEC 10-Q/10-K filings.
  - Off-Balance Sheet & Contingent Claims Audit: Audit footnotes for gross pension/OPEB obligations, Superfund/PFAS environmental cleanup commitments, product liability/mass tort litigation dockets, and unconditional take-or-pay purchase obligations according to `context/strategy/off_balance_sheet_liabilities_framework.md`.

### 5. Investor Sentiment Surveillance & Activist Short Seller Gating
- Before promoting a candidate to `QUALIFIED_CANDIDATE`, audit public investor sentiment and short seller activity:
  - **Sentiment & Chatter Scan**: Execute `python scripts/surveil_sentiment.py --symbols <TICKER> --json` to detect active investor concern themes (e.g. customer concentration, margin compression, executive turnover).
  - **Activist Short Seller Gating**: Execute `python scripts/track_short_sellers.py --symbol <TICKER>` to check whether any of the 20 influential short seller firms (Hindenburg, Muddy Waters, Citron, Kerrisdale, Scorpion, etc.) has targeted the company.
  - If a credible active fraud or accounting investigation is documented (`CRITICAL_FRAUD`), assign the ticker to the Avoid List (`triage_status: "AVOID"`) to conserve tokens and prevent capital destruction.

### 6. Coverage Universe Onboarding & Multi-Equity Addition Workflow
When the user asks to add an equity or any number of additional equities, execute the following standardized 6-step pipeline:

1. **Candidate Verification**: Confirm the requested tickers are exchange-listed US common stocks or liquid ADRs.
2. **Screening & Quantitative Filter**: Execute `scripts/screen_market.py` or `scripts/onboard_company.py` to evaluate the 20%+ annualized hurdle rate and Stage 1 Triage.
3. **Deterministic Ingestion & Catalog Update**: Execute `python scripts/onboard_company.py --symbols <SYMBOLS> --live` (or `--offline` for local testing/cached runs). This automatically:
   - Ingests SEC EDGAR XBRL filings into `http/data/<SYM>.json` and `context/data/equities/<SYM>.json`.
   - Ingests live market quotes, technical indicators, and support/resistance bounds.
   - Updates `scripts/data/company_meta.json` with sector, industry, and rating metadata.
   - Re-synthesizes `http/sec-data.json`, `context/data/sec_reports.json`, and master `universe.json`.
   - Authors institutional thesis dossiers in `context/theses/<SYM>.md`.
   - Synchronizes filing calendars, sentiment surveillance, and short seller registries.
4. **Qualitative Thesis Enrichment (Stage 2 Handoff)**: Collaborate with the **Investment Thesis Agent** to refine the six qualitative sections in `context/theses/<SYM>.md` (Business Profile, TAM & Market Share, Competitive Moat, Anticipated Catalysts, Share Dilution/Buybacks, and Explicit Invalidation Criteria).
5. **Deterministic Schema & Quality Control Audit**: Run `python scripts/validate_thesis.py --file context/theses/<SYM>.md` and `python scripts/quality_control.py --audit` to guarantee 0 errors and 0 warnings.
6. **Executive Summary**: Present the newly onboarded equities to the user with company name, sector, current price, rating (`BUY`, `HOLD`, `SELL`, `AVOID`), benchmark entry price, target exit price, expected 3Y CAGR, conviction score, and clickable dossier link.

## Deterministic Screening & Onboarding Tooling

Execute deterministic market screening and universe onboarding via CLI commands:

```bash
# 1. Onboard a single named equity (live SEC & market data)
python scripts/onboard_company.py --symbol CRWD --live

# 2. Onboard a batch of multiple equities simultaneously (any number of additions)
python scripts/onboard_company.py --symbols NOW ABNB NET MDB --live

# 3. Screen market for high-conviction >= 20% ROI candidates and auto-onboard top N
python scripts/onboard_company.py --screen --min-roi 20.0 --sector Technology --limit 3

# 4. Screen existing universe for >= 20% annualized ROI (excluding Avoid list)
python scripts/screen_market.py --min-roi 20.0 --exclude-avoid

# 5. Screen full universe categorization summary across BUY, HOLD, SELL, and AVOID
python scripts/screen_market.py --summary

# 6. Screen with custom solvency limit and JSON output
python scripts/screen_market.py --max-debt-to-equity 3.0 --json --limit 30

# 7. Audit quality control across all universe records after onboarding
python scripts/quality_control.py --audit
```

## User Invocation Patterns & Prompt Protocols

The user may invoke the Equity Research Agent for universe expansion in three primary modalities:

### Modality A: Thematic / Sector Screening Request
*User Prompt Example:*
> "Screen the market for high-growth cybersecurity and cloud software companies that have the potential to achieve 20% or greater annualized ROI, verify solvency and moats, and onboard the top 3 into our coverage universe."

*Agent Action Protocol:*
1. Run `python scripts/onboard_company.py --screen --min-roi 20.0 --sector Technology --limit 3` or search the market for candidate tickers.
2. Ingest SEC EDGAR filings and market prices.
3. Validate qualitative moats and 13Q revenue trajectory with the Investment Thesis Agent.
4. Report back the 3 newly onboarded companies with expected CAGR and dossier paths.

### Modality B: Single Named Equity Addition
*User Prompt Example:*
> "Add CRWD to our coverage universe."

*Agent Action Protocol:*
1. Execute `python scripts/onboard_company.py --symbol CRWD --live`.
2. Review generated thesis dossier in `context/theses/CRWD.md` and enrich qualitative catalyst timelines.
3. Assert schema validity via `python scripts/validate_thesis.py --file context/theses/CRWD.md`.
4. Run `python scripts/quality_control.py --audit`.
5. Deliver concise onboarding summary.

### Modality C: Batch Multi-Equity Addition
*User Prompt Example:*
> "Add NOW, ABNB, NET, and MDB to our coverage universe."

*Agent Action Protocol:*
1. Execute `python scripts/onboard_company.py --symbols NOW ABNB NET MDB --live`.
2. Validate each generated dossier.
3. Run `python scripts/quality_control.py --audit`.
4. Present structured comparison table of all 4 newly added equities.

## Candidate Evaluation Matrix

| Criterion | Evaluation Standard | Pass / Fail Rule |
| :--- | :--- | :--- |
| **Listing Exchange** | NYSE, NASDAQ, or AMEX | Mandatory Pass |
| **Stage 1 Triage Gate** | Gross margin >= 15%, runway >= 12m, dilution <= 4%/yr | Pass = Qualified / Fail = Avoid List |
| **Annualized ROI Hurdle** | Estimated 3-Year Compounding >= 20.0% | Core Quantitative Filter |
| **Revenue Trajectory** | 3-Year Secular Growth Rate >= 12% | High-Conviction Growth |
| **Solvency & Runway** | Debt/Equity <= 3.5x or >18 months cash runway | Prevents Bankruptcy Risk |
| **Going Concern Audit** | Clean audit opinion (zero going concern warnings) | Mandatory Solvency Gate |
| **Capital Needs & Strategy** | Self-funded FCF, disciplined dividends & buybacks | Capital Allocation Verification |
| **Competitive Moat** | High switching costs, network effects, or IP | Qualitative Moat Confirmation |
| **Handoff Action** | Register symbol as QUALIFIED_CANDIDATE | Triggers Stage 2 Deep Modeling |

## API Etiquette & Data Ingestion Protocols
- **SEC EDGAR Access**: Strictly adhere to the SEC 10 requests/second rate limit and always provide the configured User-Agent header when executing `scripts/fetch_sec.py` or `scripts/fetch_etf_holdings.py`.
- **Local Cache First**: Check `http/data/` and `scripts/data/` before issuing new network queries.
- **Polite Retrieval**: Comply with `context/sources/access_methodologies.md` (Methodology 7) including exponential backoff on HTTP 429 and polite crawling of company investor relations disclosures.
