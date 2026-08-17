# Market Price Research, Recording & Technical Analysis Methodology

This document defines the architecture, data sources, ingestion processes, and mathematical frameworks for researching, verifying, and recording actual market share prices and trading volumes over time. It also details the systematic methodology used to ground Benchmark Entry Prices and Target Exit Prices in real data.

## 1. Data Source Authority & Provenance

In accordance with the 5-tier authority hierarchy defined in `context/sources/catalog.md`, stock market prices and historical trading volume are classified as Tier 2 Institutional Aggregators and Tier 1 Exchange Feeds:

```
+-------------------------------------------------------------------------+
| Tier 1: Primary Equity Exchanges (NASDAQ, NYSE, CBOE)                  |
| Official session close, consolidated tape settlement, official halts    |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| Tier 2: Institutional Market Feeds & APIs (Yahoo Finance v8, Polygon,   |
| Alpaca, Tiingo, Stooq) - Daily OHLCV time-series, volume, 52W ranges   |
+-------------------------------------------------------------------------+
```

### Authoritative Pricing Endpoints
- **Yahoo Finance Chart API (`query1.finance.yahoo.com/v8/finance/chart/{symbol}`)**:
  - Parameters: `interval=1d&range=3mo`
  - Output fields: `regularMarketPrice`, `chartPreviousClose`, `previousClose`, `regularMarketDayHigh`, `regularMarketDayLow`, `regularMarketVolume`, `fiftyTwoWeekHigh`, `fiftyTwoWeekLow`, `currency`, `exchangeName`.
  - Indicators: Arrays of `timestamp`, `open`, `high`, `low`, `close`, `volume` representing daily trading sessions.

## 2. Ingestion & Verification Protocol

The deterministic CLI script `scripts/fetch_market_prices.py` executes the following multi-stage verification pipeline for every tracked public equity in the universe:

### Step 1: Query Execution & Resilience
- Formats ticker symbols for exchange compatibility (e.g., Berkshire Hathaway Class B mapped to `BRK-B`).
- Submits structured HTTP request with declared browser User-Agent headers.
- Employs polite inter-request rate-limiting delays (80ms) and automated timeout/retry handling.

### Step 2: Factual Data Verification
- **Price Validity**: Confirms `regularMarketPrice > 0.0` and `close > 0.0`. Rejects null or negative values.
- **Volume Sanity**: Validates `day_volume >= 0` and ensures historical candle arrays match timestamp lengths.
- **Timestamp Freshness**: Verifies the latest candle timestamp aligns with the most recent US exchange trading session.
- **Delta Calculation**: Computes explicit daily dollar change (`current_price - previous_close`) and percentage change (`(day_change / previous_close) * 100`).

### Step 3: Cache Storage & Provenance
- Serializes complete technical payloads to `scripts/data/market_prices.json` and mirrors to `http/data/market_prices.json`.
- Records `as_of_timestamp`, `provenance_tier: TIER_2_FINANCIAL_AGGREGATOR`, and `provenance_source: Direct Exchange / Yahoo Finance Chart API`.

## 3. Data Structure for Share Price & Trading Volume Over Time

To support technical analysis and price movement prediction, price records store both snapshot metrics and historical daily candlestick time-series conforming to `context/schemas/market_prices_schema.json`.

### Structure Specification

```json
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "currency": "USD",
  "exchange": "NMS",
  "current_price": 258.45,
  "previous_close": 256.20,
  "day_change": 2.25,
  "day_change_percent": 0.88,
  "day_open": 257.00,
  "day_high": 259.80,
  "day_low": 256.50,
  "day_volume": 48291000,
  "average_volume_20d": 52100000,
  "volume_ratio": 0.93,
  "fifty_two_week_high": 260.10,
  "fifty_two_week_low": 164.08,
  "sma_20": 252.30,
  "sma_50": 241.10,
  "technical_support_20d": 248.50,
  "technical_resistance_20d": 260.00,
  "historical_candles_30d": [
    {
      "date": "2026-08-15",
      "open": 257.00,
      "high": 259.80,
      "low": 256.50,
      "close": 258.45,
      "volume": 48291000
    }
  ],
  "as_of_timestamp": "2026-08-17T10:30:00Z",
  "provenance_tier": "TIER_2_FINANCIAL_AGGREGATOR",
  "provenance_source": "Direct Exchange / Yahoo Finance Chart API"
}
```

### Technical Indicators for Price Movement Prediction
1. **20-Day Simple Moving Average (`sma_20`)**:
   Measures short-term momentum and baseline mean reversion. When price is above `sma_20` on above-average volume, short-term accumulation is confirmed.
2. **50-Day Simple Moving Average (`sma_50`)**:
   Acts as primary institutional trend support. Pullbacks to `sma_50` during secular uptrends represent high-probability risk-reward entry zones.
3. **Volume Ratio (`volume_ratio = day_volume / average_volume_20d`)**:
   - `volume_ratio > 1.5`: Institutional breakout or distribution event.
   - `volume_ratio < 0.7`: Low-volume consolidation or drift.
4. **20-Day Swing Support & Resistance**:
   - `technical_support_20d`: Lowest daily low observed in the past 20 trading sessions.
   - `technical_resistance_20d`: Highest daily high observed in the past 20 trading sessions.
5. **52-Week Range Position**:
   Calculates where the current price sits relative to its annual range (`(current_price - 52w_low) / (52w_high - 52w_low) * 100`).

## 4. Grounding Benchmark Entry Price & Target Exit Price

Historical dossiers previously suffered from ungrounded entry and exit prices that were disconnected from actual trading reality. All entry and exit prices are now strictly derived from verified market prices, technical support/resistance bands, and empirical 20% annualized compound growth models.

### Benchmark Entry Price Formulation

The Benchmark Entry Price represents the optimal execution price level for evaluating an investment thesis:

1. **For Active BUY Status (High Conviction Compounders)**:
   - If market is currently pulling back: `Benchmark Entry Price = round(min(current_price, sma_20 * 0.99), 2)` or latest market close.
   - If stock is in immediate breakout: `Benchmark Entry Price = round(current_price, 2)`.
   - Anchors limit orders entered during Monday 9:30 AM ET execution.

2. **For HOLD Status (Covered Call Compounding & Core Holdings)**:
   - `Benchmark Entry Price = round(current_price, 2)` (reflects current benchmark valuation baseline).

3. **For SELL / AVOID Status**:
   - `Benchmark Entry Price = round(current_price, 2)` (reference price where thesis invalidation occurred).

### Target Exit Price Formulation

The Target Exit Price is mathematically derived to ensure alignment with the core portfolio mandate: achieving an annualized return of 20% or higher over a multi-year horizon:

```
Target Exit Price = Benchmark Entry Price * (1 + Annual_Target_ROI)^Holding_Period_Years
```

#### Standard Parameter Grid:
- **3-Year Holding Period at 20.0% CAGR**:
  - Growth Multiplier: `(1.20)^3 = 1.728x` (72.8% total return target).
  - Example: Stock at $100.00 entry -> Target Exit Price = $172.80.
- **4-Year Holding Period at 20.0% CAGR**:
  - Growth Multiplier: `(1.20)^4 = 2.074x` (107.4% total return target / 2.07x compounder).
  - Example: Stock at $100.00 entry -> Target Exit Price = $207.40.
- **5-Year Holding Period at 20.0% CAGR**:
  - Growth Multiplier: `(1.20)^5 = 2.488x` (148.8% total return target / 2.49x compounder).
  - Example: Stock at $100.00 entry -> Target Exit Price = $248.80.
- **Covered Call / Income Focus (HOLD Status)**:
  - For mature cash cows generating options premium: Target exit price reflects upper multi-year technical resistance or strike cap (typically 1.25x to 1.40x benchmark entry, yielding 20.0% annualized via combined option premium + capital appreciation).

### Validation Constraint
- Every public equity dossier must satisfy: `target_exit_price > entry_price` and `((target_exit_price - entry_price) / entry_price) >= 0.20`.
- All calculated ROI figures in web interfaces and dossiers are dynamically verified against this mathematical model.
