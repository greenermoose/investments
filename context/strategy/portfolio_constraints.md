# Portfolio Constraints & Policy

This document defines the strict, non-negotiable risk and allocation boundaries that all agent recommendations must follow.

## 1. Asset Universe Constraints
- US Exchange-Listed Equities Only: Only common stocks listed on the NYSE, NASDAQ, or AMEX.
- Exclusions: No OTC/pink sheet stocks, foreign ordinary shares not listed on US exchanges, closed-end funds, or non-SGOV ETFs.
- Cash Proxy: Cash (other than cash securing puts) must be held in SGOV (iShares 0-3 Month Treasury Bond ETF).

## 2. Options Strategy Constraints
- Allowed Option Strategies:
  1. Cash-Secured Puts (CSPs): Must have 100% cash backing the assignment value (Strike x 100).
  2. Covered Calls (CCs): Permitted only on holdings where shares >= 100 per contract.
  3. Option Rolls: Rolling existing CSPs or CCs out in time and/or strike for net credits.
- Forbidden Derivatives: Naked options, long calls/puts without underlying, debit spreads, iron condors, straddles, or levered multi-leg structures.

## 3. Diversification & Concentration Boundaries
- Position Concentration Guideline: Aim for approximately 25 or fewer simultaneous active equity holdings per portfolio. This is a guideline rather than a rigid hard limit: with sufficient high conviction, a portfolio may be concentrated down to a single position (100% allocation), or expanded to 26+ holdings if high-conviction opportunities warrant it.
- Single Stock Maximum Allocation: A single company equity position can be 100% of a portfolio if you have high enough conviction in the trade.
- SGOV Minimum: No minimum cash/SGOV cushion needs to be maintained beyond the requirements for securing puts.

## 4. Return Hurdle & Execution Cadence Rules
- Return Hurdle: Maximize the probability of achieving a 20%+ annualized return over a multi-decade (20-year) horizon.
- Single-Session "Set-and-Forget" Cadence: All orders are entered in a single session at Monday 9:30 AM ET (or as soon as the trader can log in). No mid-week monitoring or babysitting.
- Limit & Contingent Orders Only: All trade recommendations must be specified as market or limit orders, GTC rolls, broker-native contingent orders, or deterministic execution-time branches (e.g. "if stock >= $X when placing order, submit Order A; if < $X, submit Order B instead").
- Zero Open-Ended Ambiguity: Never present multiple-choice branches or "you decide" options. Deliver single, highest-conviction instructions for every position.
- Hands-Off Expirations: Expiring options, assignments, and exercise settlements are handled automatically by the broker on Friday afternoon. Over the weekend, the new snapshot records execution outcomes and updates the state.
