# Portfolio Constraints & Policy

This document defines the strict, non-negotiable risk and allocation boundaries that all agent recommendations must follow.

## 1. Asset Universe Constraints
- US Exchange-Listed Equities Only: Only common stocks listed on the NYSE, NASDAQ, or AMEX.
- Exclusions: No OTC/pink sheet stocks, foreign ordinary shares not listed on US exchanges, closed-end funds, or non-SGOV ETFs.
- Cash Proxy: Uninvested collateral and cash must be held in SGOV (iShares 0-3 Month Treasury Bond ETF).

## 2. Options Strategy Constraints
- Allowed Option Strategies:
  1. Cash-Secured Puts (CSPs): Must have 100% cash or SGOV backing the assignment value (Strike x 100).
  2. Covered Calls (CCs): Permitted only on holdings where shares >= 100 per contract.
  3. Option Rolls: Rolling existing CSPs or CCs out in time and/or strike for net credits.
- Forbidden Derivatives: Naked options, long calls/puts without underlying, debit spreads, iron condors, straddles, or levered multi-leg structures.

## 3. Diversification & Concentration Boundaries
- Position Limit: Maximum of 25 simultaneous active equity holdings.
- Single Stock Maximum Allocation: No single company equity position should exceed 15% of total portfolio net liquidating value.
- SGOV Minimum: A minimum cash/SGOV cushion is maintained to service near-term CSP assignments.

## 4. Return Hurdle & Execution Cadence Rules
- Return Hurdle: Maximize the probability of achieving a 20%+ annualized return over a multi-decade (20-year) horizon.
- Single-Session "Set-and-Forget" Cadence: All orders are entered in a single session at Monday 9:30 AM ET (or as soon as the trader can log in). No mid-week monitoring or babysitting.
- Limit & Contingent Orders Only: All trade recommendations must be specified as limit orders, GTC rolls, broker-native contingent orders, or deterministic execution-time branches (e.g. "if stock >= $X when placing order, submit Order A; if < $X, submit Order B instead").
- Zero Open-Ended Ambiguity: Never present multiple-choice branches or "you decide" options. Deliver single, highest-conviction instructions for every position.
- Hands-Off Expirations: Expiring options, assignments, and exercise settlements are handled automatically by the broker on Friday afternoon. Over the weekend, the new snapshot records execution outcomes and updates the state.

