# Portfolio Constraints & Risk Rules

This document codifies the mandatory constraints and risk policies governing the **Agentic Investment Advisor**. All agents must validate every recommendation against these rules before presenting proposals to the user.

---

## 📋 Summary of Core Constraints

| Category | Constraint Policy | Enforcement |
| :--- | :--- | :--- |
| **Eligible Assets** | US Public Equities & US-listed ADRs only | Hard Filter |
| **Cash Management** | `SGOV` as the sole permissible ETF; idle cash | Hard Filter |
| **Fund Restriction** | Mutual funds and broad ETFs prohibited (except SGOV) | Hard Filter |
| **Permitted Options** | Cash-Secured Puts (CSPs), Covered Calls (CCs), and Rolls only | Hard Rule |
| **Prohibited Options** | **Zero Naked Calls or Naked Puts** | Absolute Ban |
| **Concentration** | Maximum ~25 active positions | Guideline Limit |
| **Trading Cadence** | Weekly or less frequent (Weekend planning $\rightarrow$ Monday limit orders) | Operational Rule |
| **Position Thesis** | Every position requires an explicit catalyst, target price, and invalidation rule | Memory Rule |

---

## 🏢 1. Permitted Asset Universe

1. **US Exchange-Traded Equities:**
   - Common stock listed on major US exchanges: **NYSE**, **NASDAQ**, and **AMEX**.
   - International companies are permitted **only** if they trade directly on a US exchange as a common stock or American Depositary Receipt (ADR).
2. **Prohibition on Funds:**
   - **No mutual funds.**
   - **No broad-market or sector ETFs** (e.g., SPY, QQQ, XLF), with one single explicit exception:
3. **The SGOV Exception (Cash-Equivalent Parking Vehicle):**
   - `SGOV` (iShares 0-3 Month Treasury Bond ETF) is permitted as a safe, liquid, yield-generating cash proxy.
   - When market conditions appear overextended, or when no individual company presents a compelling risk/reward setup, unallocated capital is parked in `SGOV` or cash to earn risk-free yields while waiting for entry points.

---

## 🛡️ 2. Derivatives Strategy & Safety Rules

### Rule 2.1: 100% Cash-Secured Puts (CSPs)
- Put options may be sold **only** to acquire high-conviction target companies at a discount or to generate cash yield while waiting for an entry price.
- **Collateral Requirement:** Every sold put contract (representing 100 shares) must be backed 100% by unallocated cash or liquid `SGOV` shares.
- **Formula:** 
  $$\text{Required Collateral} = \text{Strike Price} \times 100 \times \text{Contracts}$$
- Selling puts on margin or without full cash backing is **strictly prohibited**.

### Rule 2.2: 100% Covered Calls (CCs)
- Call options may be sold **only** against long shares of stock already owned in the portfolio.
- **Eligibility Check:** The underlying holding must have at least **100 shares** per call contract sold.
- **Strike Selection:** Strikes must be placed at or above the position's cost basis, or aligned with the thesis price target where selling the shares at expiration achieves the target return.
- **Zero Naked Calls:** Selling calls without holding the underlying 100 shares is **strictly prohibited**.

### Rule 2.3: Option Rolling Mechanics
- **Rolling Puts (Defensive/Yield):** If a short put is tested (underlying drops near or below strike), the position may be rolled out in time (further DTE) and down in strike for a **net credit** or small debit to reduce breakeven cost.
- **Rolling Calls (Profit-Taking/Yield):** If a short call is tested (underlying rallies near or above strike), the position may be rolled out in time and up in strike for a net credit to lock in higher equity gains.

---

## 🎯 3. Concentration & Position Sizing

- **Maximum Holdings:** Approximately **25 positions** active at any given time.
- **Rationale:** 
  - Over-diversification dilutes high-conviction ideas and makes thesis tracking unmanageable.
  - A concentrated portfolio of $\le 25$ stocks ensures deep fundamental research, active catalyst monitoring, and thorough risk oversight.
- **Adding New Tickers:** If the portfolio already holds ~25 positions, adding a new stock requires identifying a lower-conviction holding to liquidate or allowing an existing covered call to be called away.

---

## ⏰ 4. Trading Cadence & Order Types

- **Cadence:** Trades are planned and placed at most **once per week** (or less frequently).
- **Execution Workflow:**
  1. Weekend: Portfolio parsing, thesis review, options theoretical pricing, and plan generation.
  2. Weekend: User Q&A, interrogation, and plan refinement.
  3. Monday Market Open (9:30 AM ET): User submits structured **Limit Orders** to the brokerage.
- **Order Discipline:** All option and equity entries/exits use **Limit Orders** (never market orders) to prevent slippage and capture modeled fair value.
