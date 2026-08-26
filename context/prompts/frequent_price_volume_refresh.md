# High-Frequency Market Price & Volume Refresh Protocol

This prompt protocol defines the high-frequency daily workflow for synchronizing live stock prices, trading volumes, 52-week support/resistance bounds, and technical moving averages (SMA 20, SMA 50) across all 150 universe constituents at 0 LLM token cost.

## Operational Context & Objective

Market prices and trading volumes fluctuate every trading day. The Pricing Agent and Portfolio Management Agent require accurate, up-to-date market prices to:
- Identify high-conviction BUY candidates trading near technical support levels.
- Evaluate whether existing positions are approaching 52-week target exit prices for Covered Call monetization.
- Monitor volume breakout spikes (volume ratio > 1.5x) indicating institutional accumulation or liquidation.
- Verify limit order execution conditions before Monday market open (9:30 AM ET).

## Execution Sequence (0 LLM Tokens)

### Step 1: Live Market Price & Volume Ingestion

Execute the live quote and technical indicator synchronization tool:

```bash
# Ingest live market prices, volumes, and 30-day candles across full universe
python scripts/fetch_market_prices.py --live
```

To refresh a targeted subset of high-priority symbols during intraday market action:

```bash
python scripts/fetch_market_prices.py --symbols NVDA AAPL MSFT TSLA AMZN --live
```

### Step 2: Quality Control & Price Invariant Verification

Verify that all ingested quotes pass deterministic sanity checks (positive prices, valid 52-week high/low bounds, non-zero volume):

```bash
python scripts/quality_control.py --audit
```

### Step 3: Opportunity & Support Level Scan

Screen the updated universe for high-conviction opportunities trading near technical support with estimated annualized returns >= 20%:

```bash
# Screen for qualifying opportunities (excluding Avoid list)
python scripts/screen_market.py --min-roi 20.0 --exclude-avoid
```

## Data Provenance & Output Stores

- **Primary Source:** Direct Exchange / Yahoo Finance API (Tier 2 Financial Aggregator).
- **Synchronized Files:**
  - `scripts/data/market_prices.json`
  - `http/data/market_prices.json`
  - `context/data/market_prices.json`
