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

### 3. Solvency & Runway Sanity Check (vs. Rigid Balance Sheet Dogma)
- Do not dogmatically eliminate companies simply because they have debt or are reinvesting cash into growth.
- Instead, perform a rigorous **solvency and runway check**:
  - Debt-to-Equity / Net Debt to EBITDA: Confirm leverage is manageable given the stability of cash flows (typically Debt/Equity < 3.5x for capital-light models).
  - Cash Runway & Liquidity: Ensure liquid cash and short-term investments cover at least 12 to 24 months of operational cash burn for non-profitable growth firms.
  - Dilution / SBC Rate: Verify that annual share count dilution from stock-based compensation is moderate (< 3% to 5% annually) so per-share compounding is preserved.
  - Going Concern / Solvency Audit: Confirm absence of debt default covenants, distress restructuring, or going-concern disclosures in recent SEC 10-Q/10-K filings.

### 4. Universe Onboarding & Handoff
- When a candidate passes quantitative screening and solvency checks, add its symbol and core profile to the master tracking universe in `http/data/universe.json`.
- Queue the candidate for the **Investment Thesis Agent** to author a complete, multi-horizon thesis dossier in `context/theses/<TICKER>.md`.

## Deterministic Screening Tooling

Execute deterministic market screening and candidate ranking via `scripts/screen_market.py`:

```bash
# Screen universe for equities with >= 20% estimated annualized ROI
python scripts/screen_market.py --min-roi 20.0

# Screen for high-growth tech opportunities with positive FCF
python scripts/screen_market.py --min-growth 15.0 --fcf-positive --sector Technology

# Screen with custom solvency limit and JSON output
python scripts/screen_market.py --max-debt-to-equity 3.0 --json --limit 30
```

## Candidate Evaluation Matrix

| Criterion | Evaluation Standard | Pass / Fail Rule |
| :--- | :--- | :--- |
| **Listing Exchange** | NYSE, NASDAQ, or AMEX | Mandatory Pass |
| **Annualized ROI Hurdle** | Estimated 3-Year Compounding >= 20.0% | Core Quantitative Filter |
| **Revenue Trajectory** | 3-Year Secular Growth Rate >= 12% | High-Conviction Growth |
| **Solvency & Runway** | Debt/Equity <= 3.5x or >18 months cash runway | Prevents Bankruptcy Risk |
| **Competitive Moat** | High switching costs, network effects, or IP | Qualitative Moat Confirmation |
| **Handoff Action** | Register symbol in master database | Triggers Thesis Formulation |

## API Etiquette & Data Ingestion Protocols
- **SEC EDGAR Access**: Strictly adhere to the SEC 10 requests/second rate limit and always provide the configured User-Agent header when executing `scripts/fetch_sec.py` or `scripts/fetch_etf_holdings.py`.
- **Local Cache First**: Check `http/data/` and `scripts/data/` before issuing new network queries.
- **Polite Retrieval**: Comply with `context/sources/access_methodologies.md` (Methodology 7) including exponential backoff on HTTP 429 and polite crawling of company investor relations disclosures.
