---
name: equity-research
description: Market-wide discovery workflows, quantitative screening rules, 20%+ annualized ROI hurdle evaluation, balance sheet solvency and runway verification, and universe onboarding for the Equity Research Agent.
---

# Equity Research Agent Skill

## Overview
This skill defines the complete operational protocol, search methodologies, quantitative screening rules, and universe onboarding workflows for the **Equity Research Agent**.

The Equity Research Agent acts as the proactive discovery engine for the investment system. Rather than being confined to a static universe, this agent searches the broader Internet and public US equity markets (NYSE, NASDAQ, AMEX) using web search, SEC EDGAR NPORT-P / Form 10-K filings, and deterministic screening tools to discover high-conviction companies that offer a high probability of generating 20% or greater annualized return on investment (ROI).

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
- To maximize the ROI of tokens and compute time, route all newly discovered equities through the **Stage 1 Lightweight Triage Gate** before initiating deep research (conforming to `context/strategy/token_triage_and_avoid_pipeline.md` and `context/strategy/avoid_vs_sell_framework.md`):
  - **Deterministic Filter**: Execute `python scripts/triage_universe.py` to evaluate gross margin viability (>=15%), cash runway (>=12 months or positive FCF), leverage (Debt/Equity <= 4.0x), and annual share dilution (<=4.0%/year).
  - **Red Flag Gating**: Equities exhibiting secular disruption, negative unit economics, going-concern warnings, or toxic unquantifiable liabilities are assigned to the **Avoid List** (`triage_status: "AVOID"`).
  - **Avoid List Freezing**: Equities on the Avoid List receive lightweight triage metadata and are frozen from expensive Stage 2 deep analysis until explicit de-listing triggers are met.

### 4. Solvency, Runway & Off-Balance Sheet Encumbrance Audit
- For candidate equities passing Stage 1 triage, perform a rigorous **solvency, runway, and off-balance sheet liability check**:
  - Debt-to-Equity / Net Debt to EBITDA: Confirm leverage is manageable given the stability of cash flows (typically Debt/Equity < 3.5x for capital-light models).
  - Cash Runway & Liquidity: Ensure liquid cash and short-term investments cover at least 12 to 24 months of operational cash burn for non-profitable growth firms.
  - Dilution / SBC Rate: Verify that annual share count dilution from stock-based compensation is moderate (< 3% to 5% annually) so per-share compounding is preserved.
  - Going Concern / Solvency Audit: Confirm absence of debt default covenants, distress restructuring, or going-concern disclosures in recent SEC 10-Q/10-K filings.
  - Off-Balance Sheet & Contingent Claims Audit: Audit footnotes for gross pension/OPEB obligations, Superfund/PFAS environmental cleanup commitments, product liability/mass tort litigation dockets, and unconditional take-or-pay purchase obligations according to `context/strategy/off_balance_sheet_liabilities_framework.md`.

### 5. Universe Onboarding & Stage 2 Handoff
- When a candidate passes Stage 1 triage and solvency/liability verification, tag it as `QUALIFIED_CANDIDATE` and register its core profile in `context/data/universe.json`.
- Queue the candidate for the **Investment Thesis Agent** to author a complete, multi-horizon thesis dossier in `context/theses/<TICKER>.md`.

## Deterministic Screening Tooling

Execute deterministic market screening and candidate ranking via `scripts/screen_market.py` and `scripts/triage_universe.py`:

```bash
# Execute Stage 1 Lightweight Triage across universe
python scripts/triage_universe.py

# Screen universe for equities with >= 20% estimated annualized ROI (excluding Avoid list)
python scripts/screen_market.py --min-roi 20.0 --exclude-avoid

# Screen for high-growth tech opportunities with positive FCF
python scripts/screen_market.py --min-growth 15.0 --fcf-positive --sector Technology

# Screen with custom solvency limit and JSON output
python scripts/screen_market.py --max-debt-to-equity 3.0 --json --limit 30
```

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
