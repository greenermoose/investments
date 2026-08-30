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
- Synthesize technical indicators to identify experimental entry and exit zones for common stock limit orders:
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

### 4. Defensive Option Rolling & Buy to Close (BTC) Rules
- Roll Trigger (Puts): When underlying breaches strike price (ITM) or extrinsic value drops below 20% of initial premium with > 14 DTE, provided the thesis remains intact.
- Roll Trigger (Calls): When underlying surges past strike and assignment would cause premature exit below revised fair value.
- Net Credit Mandate: All rolls must be executed out in time and away in strike strictly for a net credit. Never execute a roll for a net debit.
- Buy to Close (BTC) Trigger (Losing Propositions): When a holding's thesis breaks or an equity is deemed a losing proposition:
  - Short Puts: Buy to close the put on Monday open to avert assignment and eliminate downside exposure on a declining stock.
  - Short Calls: Buy to close the call on Monday open to unlock 100-share blocks for immediate common stock liquidation.

## Deterministic Pricing Tooling

Calculate Black-Scholes pricing, Greeks, AROC, net-credit rolls, and technical limit bounds deterministically using `scripts/calculate_pricing.py`:

Option pricing requires an **archived option-chain snapshot**. The strike, the
expiration, and the volatility surface must all have been observed in a real
chain; they may not be supplied by hand. The `--stock-price`, `--dte`, and
`--iv` flags no longer exist, because each of them let a price be modeled
against a contract that may not trade. Archive a chain first:

```bash
python scripts/manage_universe.py experiment archive-chain <cboe-chain.csv>   --symbol NVDA --observed-at 2026-08-28T20:00:00Z   --underlying-price 124.50 --source-url https://www.cboe.com/delayed_quotes/nvda/quote_table
```

Then price only strikes and expirations present in that snapshot:

```bash
# Calculate CSP pricing and Greeks (Delta, Theta, AROC)
python scripts/calculate_pricing.py option --symbol NVDA   --chain-snapshot context/data/option_chains/2026-08-28/OPT-NVDA-20260828.json   --strike 120.00 --expiration 2026-10-02 --type put   --dividend-yield 0.0 --minimum-aroc 12.0

# Calculate Covered Call pricing
python scripts/calculate_pricing.py option --symbol MSFT   --chain-snapshot context/data/option_chains/2026-08-28/OPT-MSFT-20260828.json   --strike 450.00 --expiration 2026-10-02 --type call   --dividend-yield 0.0072 --minimum-aroc 12.0

# Verify net-credit roll economics
python scripts/calculate_pricing.py roll --close-cost 3.50 --open-credit 4.80 --contracts 1

# Calculate Buy-to-Close (BTC) order pricing on a losing proposition / broken thesis
python scripts/calculate_pricing.py btc --symbol INTC --type put --strike 30.00 --current-mark 4.50 --contracts 1 --reason "Thesis invalidation"

# Calculate technical limit order price bounds
python scripts/calculate_pricing.py limit --stock-price 124.50 --support 118.00 --resistance 135.00
```

## What the Model Does and Does Not Claim

- `--dividend-yield` is required and has no default. Passing `0` for a
  non-payer is a statement; omitting it would have been a guess.
- The delta reported is a **model delta** computed from the archived surface,
  not a live market delta. Order proposals must record it as `model_delta`.
- A sell limit is set at the greater of the modeled reservation credit and the
  minimum strategy return. An order that does not fill is an acceptable
  outcome; the limit is never lowered during the week to force a fill.
- Weekend pricing is a reservation-price estimate against a delayed Friday
  chain. It is not a live fair value and will diverge from Monday's open.

## Pricing Parameter Reference Table

| Strategy | Target Delta | Target DTE | Return Hurdle / Metric | Collateral Rule |
| :--- | :--- | :--- | :--- | :--- |
| **Cash-Secured Put** | 0.15 - 0.30 | 30 - 45 Days | AROC >= 12% - 18% | 100% Cash or SGOV |
| **Covered Call** | 0.20 - 0.35 | 21 - 45 Days | Yield Harvest + Exit Target | 100 Shares Common Stock |
| **Defensive Roll** | Out & Away | 30 - 60 Days | Strictly Net Credit ($> $0.00) | Maintained from original leg |
| **Buy to Close (BTC)** | N/A (Closing) | Immediate (Mon Open) | Downside Loss Mitigation | Releases cash / Unlocks shares |
| **Equity Buy Limit** | At/Near Support | Single Session | Below Benchmark Entry | Available Settled Cash |
| **Equity Sell Limit** | At/Near Resistance | Single Session | Intrinsic Fair Value Target | Active Common Shares |

## Dual Price Series Architecture: Nominal vs. Split-Adjusted vs. Dividend-Adjusted
- **Active Trade & Option Execution**: Limit orders and option strike selections always anchor to the active session market price (`current_price` / `nominal_current_price`) which matches real-time broker execution.
- **Technical Trend Indicators (SMA 20, SMA 50, Channels)**: Computed strictly against the continuous backward-adjusted series (`split_adj_close` / `close`) to eliminate artificial split cliffs and preserve genuine moving average slopes.
- **Historical Press Release & Document Ground-Truthing**: When reconciling analyst notes, executive remarks, or news dispatches citing historical stock prices, agents must compare against the immutable nominal series (`nominal_close`, `daily_nominal_closes`) rather than backward-adjusted figures.
- **Multi-Year ROI & Benchmark Calculations**: Use total-return adjusted prices (`adj_close`, `daily_adjusted_closes`) to capture both capital appreciation and cash dividend distributions.

## API Etiquette & Market Price Fetching Protocols
- **Price Feed Pacing**: When fetching real-time/historical candles via `scripts/fetch_market_prices.py`, maintain standard throttle intervals (0.08s - 0.2s pause between symbols) to prevent IP rate-limiting.
- **FRED & Treasury Risk-Free Rate Caching**: Cache benchmark Treasury yields (3M Treasury DGS3MO) with a 24-hour TTL in `scripts/data/` rather than querying external endpoints on every options pricing calculation.
- **Offline & Cache Primacy**: Adhere strictly to `context/sources/access_methodologies.md` (Methodology 7) by utilizing local market price caches in `http/data/market_prices.json` during agent deliberation loops.


