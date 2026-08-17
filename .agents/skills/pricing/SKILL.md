---
name: pricing
description: Quantitative pricing modeling, technical price trend analysis, Black-Scholes options valuation, Greeks calculation (Delta, Theta, AROC), and Monday limit order execution pricing for the Pricing Agent.
---

# Pricing Agent Skill

## Overview
This skill defines the complete operational protocol, mathematical formulas, options parameter rules, and technical trend modeling for the **Pricing Agent**.

The Pricing Agent unifies all pricing calculations across both common equities and options contracts. It bridges fundamental intrinsic value targets from the Investment Thesis Agent with technical market microstructure (support/resistance levels, trend structures, momentum channels, volatility surfaces) to compute exact limit prices for Monday 9:30 AM ET execution.

## Core Responsibilities

### 1. Technical Price Trend & Limit Order Modeling
- Synthesize technical indicators to identify high-probability entry and exit zones for common stock limit orders:
  - Key horizontal support and resistance levels.
  - Multi-timeframe moving averages (20-day, 50-day, 200-day SMAs).
  - Volatility channels and Relative Strength Index (RSI) momentum divergence.
- Compute conservative buy limit prices near key support zones (avoiding chasing market spikes) and disciplined sell limit prices near valuation resistance targets.

### 2. Cash-Secured Put (CSP) Pricing & Strike Selection
- Sell CSPs exclusively on high-conviction `BUY` candidates surfaced by the Investment Thesis Agent to collect upfront premium and accumulate shares at a structural discount:
  - Target Delta: 0.15 to 0.30 (80% to 85% theoretical probability of expiring OTM).
  - Target Expiration (DTE): 30 to 45 Days to Expiration (optimal theta decay slope).
  - Annualized Return on Collateral (AROC) Hurdle: Minimum 12.0% to 18.0%:
    $$\text{AROC} = \left(\frac{\text{Option Premium}}{\text{Strike Price}}\right) \times \left(\frac{365}{\text{DTE}}\right) \times 100$$
  - Strict Collateralization: 100% secured by cash or SGOV cash proxy.

### 3. Covered Call (CC) Pricing & Strike Selection
- Sell Covered Calls against existing 100-share blocks approaching fair value targets to monetize holding periods and execute disciplined scale-outs:
  - Eligibility: Strictly restricted to holdings with >= 100 shares.
  - Target Strike: Out-of-the-money (OTM) strike above average cost basis, aligned with the company's 52-week valuation target.
  - Target Delta: 0.20 to 0.35.
  - Target DTE: 21 to 45 days.

### 4. Defensive Option Rolling Rules
- Roll Trigger (Puts): When underlying breaches strike price (ITM) or extrinsic value drops below 20% of initial premium with > 14 DTE.
- Roll Trigger (Calls): When underlying surges past strike and assignment would cause premature exit below revised fair value.
- Net Credit Mandate: All rolls must be executed out in time and away in strike strictly for a net credit. Never execute a roll for a net debit.

## Deterministic Pricing Tooling

Calculate Black-Scholes pricing, Greeks, AROC, and technical limit bounds deterministically using `scripts/calculate_pricing.py`:

```bash
# Calculate CSP pricing and Greeks (Delta, Theta, AROC)
python scripts/calculate_pricing.py option --symbol NVDA --stock-price 124.50 --strike 120.00 --dte 35 --type put

# Calculate Covered Call pricing
python scripts/calculate_pricing.py option --symbol MSFT --stock-price 415.00 --strike 450.00 --dte 39 --type call

# Verify net-credit roll economics
python scripts/calculate_pricing.py roll --close-cost 3.50 --open-credit 4.80 --contracts 1

# Calculate technical limit order price bounds
python scripts/calculate_pricing.py limit --stock-price 124.50 --support 118.00 --resistance 135.00
```

## Pricing Parameter Reference Table

| Strategy | Target Delta | Target DTE | Return Hurdle / Metric | Collateral Rule |
| :--- | :--- | :--- | :--- | :--- |
| **Cash-Secured Put** | 0.15 - 0.30 | 30 - 45 Days | AROC >= 12% - 18% | 100% Cash or SGOV |
| **Covered Call** | 0.20 - 0.35 | 21 - 45 Days | Yield Harvest + Exit Target | 100 Shares Common Stock |
| **Defensive Roll** | Out & Away | 30 - 60 Days | Strictly Net Credit ($> $0.00) | Maintained from original leg |
| **Equity Buy Limit** | At/Near Support | Single Session | Below Benchmark Entry | Available Settled Cash |
| **Equity Sell Limit** | At/Near Resistance | Single Session | Intrinsic Fair Value Target | Active Common Shares |
