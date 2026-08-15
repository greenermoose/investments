# Options Pricing & Strategy Reference

This document provides the mathematical foundation and parameter rules for the Derivatives & Limit Pricing Specialist agent.

## Cash-Secured Put (CSP) Guidelines
- Target Delta: 0.15 to 0.30 (80% to 85% theoretical probability of expiring OTM).
- Target Expiration (DTE): 30 to 45 Days to Expiration (optimal theta decay curve).
- Annualized Return on Collateral (AROC) Hurdle: Minimum 12% to 18% annualized return on required cash collateral:
  AROC = (Option Premium / Strike Price) * (365 / DTE)
- Collateral Allocation: 100% reserved in SGOV or cash.

## Covered Call (CC) Guidelines
- Eligibility: Restricted to equity holdings with >= 100 shares.
- Target Strike: Out-of-the-money (OTM) strike above average cost basis, aligned with the company's valuation price target.
- Target Delta: 0.20 to 0.35.
- Target DTE: 21 to 45 days.

## Option Rolling Rules
- Roll Trigger (Puts): Roll when underlying breaches strike (ITM) or extrinsic value drops below 20% of initial premium with > 14 DTE.
- Roll Direction: Roll out in time (further expiration) and down in strike (lower assignment price) for a net credit. Never roll for a net debit.
- Roll Trigger (Calls): If underlying surges past strike and assignment would cause undesirable tax hit or early exit below fair value, roll out and up for a net credit.

## Weekend Black-Scholes Modeling
- Inputs: Current Stock Price (S), Strike (K), Risk-Free Rate (r, using 3-month Treasury yield), Time to Expiration (T), Implied Volatility (sigma).
- Output: Theoretical fair value used to set conservative limit orders for Monday 9:30 AM ET market open.
