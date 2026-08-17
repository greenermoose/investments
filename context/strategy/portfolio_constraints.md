# Portfolio Constraints & Policy

This document defines the strict, non-negotiable risk and allocation boundaries that all agent recommendations must follow.

## 1. Core Mandate & 20-Year Return Hurdle
- Primary Objective: Manage downside risk while maximizing annualized return on investment (ROI).
- Target Hurdle: Achieve an annualized return of 20% or higher over a 20-year horizon.
- Failure Criterion: It is explicitly defined as a failure of our investment strategy if total annualized return is less than 20% after 20 years of placing trades.
- Empirical Foundation: All strategies, thesis models, and trade mechanics must be grounded in extensive empirical research identifying credible investment approaches that have demonstrated the ability to generate 20%+ annualized returns across multi-year cycles.

## 2. Asset Universe Constraints
- US Exchange-Listed Equities Only: Only common stocks of public companies listed on the NYSE, NASDAQ, or AMEX.
- Rejection of Passive Index / Mutual Funds: While understanding the academic literature on index funds and mutual funds, we do not buy and hold index funds or mutual funds. Alpha is generated through selective individual equity ownership and options income overlay.
- Exclusions: No OTC/pink sheet stocks, foreign ordinary shares not listed on US exchanges, closed-end funds, or non-SGOV ETFs.
- Cash Proxy: Unallocated cash collateral must be held in SGOV (iShares 0-3 Month Treasury Bond ETF) for risk-free yield.

## 3. Entry & Exit Determination (Fundamental + Technical)
- Dual Indicator Requirement: Determine entry price and exit price through the synthesis of:
  1. Fundamental Valuation: ROIC > 15%, FCF conversion > 80%, clean balance sheets, 13-quarter revenue path, and Margin of Safety valuation models (DCF and EV/Sales multiple analysis).
  2. Technical Indicators: Multi-timeframe moving averages (50-day / 200-day SMAs), horizontal support and resistance, momentum (RSI), and volatility bands to optimize timing and risk-adjusted entries/exits.

## 4. Options Strategy & Risk Management Constraints
- Permitted Option Strategies:
  1. Cash-Secured Puts (CSPs): Must have 100% cash or SGOV backing the assignment value (Strike x 100). Used on BUY candidates to generate upfront yield and secure discounted entry basis.
  2. Covered Calls (CCs): Permitted only on holdings where shares >= 100 per contract. Used to harvest option premium and execute disciplined scaling out at valuation price targets.
  3. Option Rolls: Rolling existing CSPs or CCs out in time and/or strike for net credits.
- Forbidden Derivatives & Practices:
  1. NO Option Buying: Never buy long calls or long puts (no speculative premium bleed or debit spreads).
  2. NO Naked Options: Never sell naked puts or naked calls.
  3. NO Margin Borrowing: Margin debt is strictly prohibited.

## 5. Diversification & Concentration Boundaries
- Position Concentration Guideline: Aim for approximately 25 or fewer simultaneous active equity holdings per portfolio. This is a soft target guideline rather than a rigid hard limit: with sufficient high conviction, a portfolio may be concentrated down to a single position (100% allocation), or expanded to 26+ holdings if high-conviction opportunities warrant it.
- Single Stock Maximum Allocation: A single company equity position can be 100% of a portfolio if you have high enough conviction in the trade.
- SGOV Minimum: No minimum cash/SGOV cushion needs to be maintained beyond the requirements for securing puts.

## 6. Execution Cadence Rules
- Single-Session "Set-and-Forget" Cadence: All orders are entered in a single session at Monday 9:30 AM ET (or as soon as the trader can log in). No mid-week monitoring or babysitting.
- Limit & Contingent Orders Only: All trade recommendations must be specified as market or limit orders, GTC rolls, broker-native contingent orders, or deterministic execution-time branches (e.g. "if stock >= $X when placing order, submit Order A; if < $X, submit Order B instead").
- Zero Open-Ended Ambiguity: Never present multiple-choice branches or "you decide" options. Deliver single, highest-conviction instructions for every position.
- Hands-Off Expirations: Expiring options, assignments, and exercise settlements are handled automatically by the broker on Friday afternoon. Over the weekend, the new snapshot records execution outcomes and updates the state.
