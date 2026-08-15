# Weekly Workflow & Prompting Playbook

This document provides the end-to-end operational runbook for managing the portfolio on a weekly cycle. It includes exact master prompts, sub-agent persona prompts, output report formats, and the interactive Q&A deliberation protocol.

---

## 📅 The Weekly Operating Cycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             WEEKEND (Sat / Sun)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Ingestion: Drop portfolio screenshot / CSV into examples/               │
│  2. Deliberation: Run Master Agent Prompt in AI workspace session           │
│  3. Review: Inspect Executive Report & Monday Limit Order Table             │
│  4. Interrogation: Challenge assumptions via Interactive Q&A Session        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MONDAY (9:30 AM ET Open)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  5. Execution: Place approved Limit Orders on brokerage platform            │
│  6. Logging: Record execution fills in data/execution_tracker.md            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🤖 1. Master Agent Deliberation Prompt

Copy and paste this master prompt into your AI agent workspace session each weekend to initiate the deliberation cycle:

```markdown
You are acting as the Lead Portfolio Manager orchestrating a team of specialized investment sub-agents (Portfolio Ingestion Agent, Thesis & Memory Agent, Universe Screener, and Derivatives Specialist).

Our objective is to evaluate my current portfolio holdings, review active investment theses, evaluate public market opportunities, and produce an actionable Weekly Trading Plan and Executive Report for Monday market open.

### Portfolio Rules & Constraints:
1. Permitted Assets: US exchange-listed public equities (NYSE/NASDAQ/AMEX) and US-listed ADRs only.
2. Cash Equivalent: SGOV (iShares 0-3 Month Treasury Bond ETF) is the ONLY permitted ETF. No mutual funds or other ETFs.
3. Permitted Options: Cash-Secured Puts (100% cash/SGOV backed) and Covered Calls (>=100 long shares). Zero naked options.
4. Position Ceiling: Maximum ~25 high-conviction holdings.
5. Execution: Weekend analysis generating Monday market-open Limit Orders (trades occur weekly or less).

### Instructions for Agent Team:
Step 1 [Ingestion]: Inspect the latest screenshot or CSV in `examples/`. Extract all equity positions, share counts, cash balance, SGOV shares, and open options contracts. Identify which positions own >= 100 shares for Covered Call eligibility.
Step 2 [Thesis & Memory Review]: Read active dossiers in `data/theses/*.md`. Verify if any catalysts occurred or if invalidation triggers fired. Recommend HOLD, SELL, or ROLL based on thesis health.
Step 3 [Universe Screening]: Query `data/universe.db` (or evaluate candidate public equities) for high-conviction ideas, respecting the 25-position ceiling and available liquid capital.
Step 4 [Derivatives & Limit Pricing]: Calculate theoretical option pricing (Black-Scholes / volatility modeling) over the weekend to compute Monday Limit Prices for any Cash-Secured Puts, Covered Calls, or Option Rolls.
Step 5 [Executive Report]: Synthesize all findings into the standard Weekly Trading Plan and Executive Report format below.

Please begin by parsing the portfolio and presenting the Executive Report.
```

---

## 📑 2. Standard Output Report Format

The agent team must format its weekly response as follows:

```markdown
# Weekly Portfolio Executive Report & Trading Plan
**Date:** [YYYY-MM-DD] | **Target Execution:** Monday Market Open [YYYY-MM-DD]

---

## 📋 1. Monday Limit Order Execution Sheet

| Action | Ticker | Contracts / Shares | Expiration | Strike | Modeled Fair Value | Monday Limit Price | Capital Required / Freed | Purpose / Target |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SELL TO OPEN (CSP)** | `INTC` | 2 Contracts | 2026-09-25 | $20.00 | $0.85 | **$0.80** | $4,000 Cash/SGOV | Discount Buy / 18.2% ROC |
| **SELL TO OPEN (CC)**  | `BA`   | 2 Contracts | 2026-09-25 | $210.00 | $3.40 | **$3.30** | 200 BA owned | Yield Harvest toward $265 |
| **ROLL (CSP)**         | `XYZ`  | 1 Contract  | Oct $\rightarrow$ Nov | $50 $\rightarrow$ $47.50 | Net Credit $0.45 | **Net Credit $0.40** | $4,750 Collateral | Lower Cost Basis |
| **HOLD**               | `MSFT` | 50 Shares   | N/A | N/A | N/A | N/A | N/A | Thesis Intact (Target $520) |

---

## 🔍 2. Active Holdings & Thesis Review

### 1. [TICKER] - [Company Name]
- **Current Shares:** [N] | **Cost Basis:** $[X.XX] | **Current Price:** $[Y.YY]
- **Thesis Status:** [INTACT / STRENGTHENED / UNDER_REVIEW / BROKEN]
- **Catalyst Progress:** [Details on recent earnings, news, or milestones]
- **Recommendation:** [HOLD / SELL_CC / ROLL / LIQUIDATE] with explicit rationale.

---

## 💡 3. New Trade Proposals & Catalysts (If applicable)

### [TICKER] - [Company Name]
- **Proposed Action:** [Buy Shares / Sell Cash-Secured Put at Strike $K]
- **Investment Thesis Summary:** [Core value/growth driver]
- **Catalyst Timeline:** [Expected events and milestones over the next 6-24 months]
- **Target Exit Price:** $[Target Price] | **Target Annualized ROI:** [X.X%]
- **Explicit Invalidation Criteria:** [What would prove this thesis wrong?]

---

## 📊 4. Portfolio Allocation & Risk Health
- **Total Position Count:** [N / 25 Max]
- **Capital Breakdown:** Equities: [X]% | Cash & SGOV: [Y]% | Short Option Collateral: [Z]%
- **Safety Compliance:** 100% Cash-Secured / 100% Covered / Zero Naked Exposures.
```

---

## 🗣️ 3. Interactive User Q&A / Challenge Protocol

After the agent team presents the report, the user engages in an interactive deliberation to stress-test assumptions before Monday execution.

### Recommended Challenge Prompts

#### 1. Probing the Investment Thesis & Valuation
> *"On ticker [XYZ], explain the fundamental basis for your target price of $[Z]. What multiple expansion or earnings growth rate are you assuming? How does this compare to historical 10-year medians?"*

#### 2. Stress-Testing Catalysts & Invalidation
> *"What happens to our [TICKER] position if the upcoming earnings miss expectations by 5%? At what exact point do we declare the thesis broken rather than buying more on the dip?"*

#### 3. Challenging Limit Order Pricing
> *"Your limit price on the [TICKER] $20 Put is set at $0.80. If the stock opens up 1.5% on Monday, what is the probability this limit gets filled? Should we adjust to $0.75 or wait?"*

#### 4. Macro & SGOV Allocation Challenge
> *"Why are we deploying $10k of cash into new CSPs this week instead of leaving it in SGOV earning risk-free yields ahead of the FOMC rate decision?"*

---

## 📝 4. Post-Trade Logging

After executing Monday morning limit orders on your brokerage platform:
1. Note which orders were filled and at what actual prices.
2. The agent updates `data/theses/<TICKER>.md` and records fill data in `data/execution_tracker.md` to continuously calibrate limit pricing accuracy.
