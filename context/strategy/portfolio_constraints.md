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

## 4. Cadence & Order Execution Rules
- Weekly Cadence: Decisions are formulated over the weekend based on market close data.
- Limit Orders Only: All trade recommendations must be specified as limit orders for Monday 9:30 AM ET market open. No market orders.
- No Mid-Week Impulsive Trades: Trades execute on scheduled rebalances unless an explicit catastrophic thesis invalidation event occurs.
