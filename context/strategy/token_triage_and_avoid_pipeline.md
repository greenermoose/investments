# Token Triage & Avoid Pipeline: Two-Stage Equity Gating Architecture

This document defines the technical architecture, operational gating workflows, and de-listing triggers for the two-stage equity analysis funnel designed to maximize token and compute ROI.

## Architecture of the Two-Stage Funnel

To prevent wasting LLM tokens and human/agent analysis time on companies destined for value destruction, the system routes all equities through a two-stage funnel:

```
[ All Public US Equities / Index Constituents / Screened Tickers ]
                                |
                                v
           +-----------------------------------------+
           |    STAGE 1: Lightweight Triage Gate     |
           |  - Deterministic Metric Filter (Python) |
           |  - Lightweight Red-Flag Scan (~1K tok)  |
           +-----------------------------------------+
                          /            \
        Fails Triage /                  \ Passes Triage
                     v                    v
       +--------------------+     +--------------------------------+
       |     AVOID LIST     |     |       CANDIDATE PIPELINE       |
       | - Frozen Compute   |     | - Unlocked for Deep Analysis   |
       | - Lightweight Card |     +--------------------------------+
       | - De-Listing Watch |                    |
       +--------------------+                    v
                                  +--------------------------------+
                                  |   STAGE 2: Deep Scrutiny Mode  |
                                  | - 13Q Catalyst Revenue Model   |
                                  | - 6-Horizon Diluted Shares     |
                                  | - 4-Horizon Bear/Base/Bull     |
                                  | - 6-Part Narrative Dossier     |
                                  | - Derivatives (CSP / CC)       |
                                  +--------------------------------+
                                                 |
                                                 v
                                       [ BUY | HOLD | SELL ]
```

## Stage 1: Lightweight Triage & Avoid Gating Protocol

Stage 1 operates as a low-cost filter executed before any full thesis dossier generation.

### 1. Deterministic Financial Screening (0 LLM Tokens)
The deterministic screening engine (`scripts/triage_universe.py`) audits the following baseline quantitative thresholds:

1. **Gross Margin Viability Floor**: TTM Gross Margin >= 15.0% (except commodity/retail where Gross Margin >= 10.0% with positive Operating Margin).
2. **Solvency & Liquidity Safety**:
   - Cash Runway >= 12 months for non-profitable companies, OR
   - TTM Operating Cash Flow > $0.
3. **Debt Encumbrance Ceiling**:
   - Total Debt / Equity <= 4.0x (or Net Debt / EBITDA <= 4.5x), except regulated utilities and financial institutions.
4. **Dilution Constraint**:
   - 3-Year CAGR of Diluted Shares Outstanding <= 4.0% per year (unless TTM Revenue Growth exceeds 30.0% per year).
5. **Auditor Opinion Check**:
   - Clean audit opinion without explanatory paragraphs regarding going-concern distress in latest Form 10-K.

### 2. Lightweight Qualitative Triage Probe (~500 to 1,500 Tokens)
For companies meeting baseline quantitative thresholds or edge cases, a concise LLM evaluation tests three qualitative failure conditions:
- **Secular Obsolescence**: Is the core product line being rendered obsolete by emergent technological paradigms?
- **Forensic Accounting & Legal Hazards**: Are there open SEC accounting investigations, mass torts, or restatements?
- **Economic Moat Viability**: Does the business possess any sustainable pricing power or customer lock-in?

### 3. Triage Classification Outcome
- **FAIL**: Tagged as `AVOID`. Minimal metadata record created. Bypassed in weekly deep thesis updates.
- **PASS**: Tagged as `QUALIFIED_CANDIDATE`. Handed off to the Investment Thesis Agent for Stage 2 deep analysis.

## Stage 2: Deep Scrutiny Protocol (Institutional-Grade Thesis)

Only equities tagged as `QUALIFIED_CANDIDATE` receive full institutional modeling (~15,000+ tokens per ticker):
- **13-Quarter Revenue Forecast ($Q_0$ to $Q_{12}$)**: Segment-level catalysts, product launch dates, seasonal adjustments, and non-monotonic S-curve progression.
- **6-Horizon Diluted Shares Outstanding (13, 26, 39, 52, 104, 156 Weeks)**: Free cash flow buyback pace and SBC dilution modeling.
- **4-Horizon Bear/Base/Bull Price Bounds**: Multi-year valuation scenarios and expected CAGR calculations.
- **Comprehensive Six-Part Narrative**: Business Profile, TAM & Market Share, Competitive Moat, Catalysts Timeline, Capital Needs & Strategy, and Explicit Invalidation Criteria.
- **Derivatives Overlay**: Pricing Agent generates exact CSP discount accumulation strikes and CC monetization levels.

## De-Listing Triggers (Moving Off the Avoid List)

Companies placed on the Avoid List are not permanently forgotten. The Memory Agent and Equity Research Agent audit the Avoid Registry quarterly against explicit **De-Listing Triggers**:

| Trigger Category | Qualification Standard for De-Listing |
| :--- | :--- |
| **Operational Cash Flow Inflection** | 2 consecutive quarters of positive operating cash flow and gross margin stabilization |
| **Balance Sheet Recapitalization** | Successful long-term debt refinancing, credit rating upgrade, or non-dilutive equity infusion extending cash runway > 24 months |
| **Governance & Leadership Reset** | Replacement of executive leadership with proven capital allocators and elimination of dilutive equity grants |
| **Transformational Catalyst / TAM Expansion** | Commercial launch of a validated high-margin product line addressing a large, growing TAM that halts secular decline |
| **Cyclical Trough Turnaround** | In cyclical industries, confirmation of trough capex digestion, inventory normalization, and rising order book book-to-bill ratio (> 1.05x) |
| **Regulatory / Litigation Resolution** | Binding settlement or dismissal of toxic liabilities/mass torts with remaining cash flow intact |

When a company meets one or more de-listing triggers:
1. The Memory Agent logs a status transition from `AVOID` to `QUALIFIED_CANDIDATE`.
2. The company is queued for the Investment Thesis Agent to author a full Stage 2 thesis dossier.

## Avoid Metadata Schema

Triage metadata for `AVOID` equities is recorded compactly in `context/data/universe.json` and `context/theses/<TICKER>.md`:

```json
{
  "symbol": "TICKER",
  "name": "Company Name",
  "triage_status": "AVOID",
  "triage_date": "YYYY-MM-DD",
  "avoid_reasons": [
    "CHRONIC_CASH_BURN_SUB_12M_RUNWAY",
    "HYPER_DILUTION_SBC_EXCEEDING_5_PCT",
    "SECULAR_TAM_CONTRACTION"
  ],
  "triage_summary": "Brief 1-2 sentence executive summary of structural impairment.",
  "de_listing_triggers": [
    "Gross margin expansion above 25% with positive operating cash flow",
    "Debt-to-equity reduction below 3.5x via asset disposition"
  ],
  "next_audit_date": "YYYY-MM-DD"
}
```

## Token ROI Impact Analysis

Assuming a broad tracking universe of 150 candidate equities:
- **Without Triage**: 150 full dossiers x 15,000 tokens = **2,250,000 tokens per update cycle**.
- **With 2-Stage Triage (Assuming ~40% Avoid Rate)**:
  - 150 equities x 800 triage tokens = 120,000 tokens
  - 90 qualified equities x 15,000 deep tokens = 1,350,000 tokens
  - **Total**: 1,470,000 tokens (**34.7% compute and cost reduction**).
- **Time Savings**: Frees agent deliberation cycles and human review bandwidth from analyzing hopeless value traps, concentrating 100% of analytical focus on equities capable of achieving our 20%+ annualized compounding mandate.
