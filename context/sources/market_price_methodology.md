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
| Alpaca, Tiingo, Stooq) - Dual nominal & adjusted OHLCV, splits, divs    |
+-------------------------------------------------------------------------+
```

### Authoritative Pricing Endpoints
- **Yahoo Finance Chart API (`query1.finance.yahoo.com/v8/finance/chart/{symbol}`)**:
  - Parameters: `interval=1d&range=3mo&events=div%7Csplit` (or `range=3y`/`5y` for persistent archive)
  - Output fields: `regularMarketPrice`, `chartPreviousClose`, `previousClose`, `regularMarketDayHigh`, `regularMarketDayLow`, `regularMarketVolume`, `fiftyTwoWeekHigh`, `fiftyTwoWeekLow`, `currency`, `exchangeName`.
  - Indicators:
    - `indicators.quote[0]`: Arrays of `timestamp`, `open`, `high`, `low`, `close`, `volume` (backward **Split-Adjusted**).
    - `indicators.adjclose[0]`: Array of `adjclose` (backward **Dividend- and Split-Adjusted**).
  - Corporate Actions:
    - `events.splits`: Dict of split timestamps with `numerator`, `denominator`, and `splitRatio`.
    - `events.dividends`: Dict of ex-dividend timestamps with `amount`.

## 2. Ingestion & Verification Protocol

The deterministic CLI script `scripts/fetch_market_prices.py` executes the following multi-stage verification pipeline for every tracked public equity in the universe:

### Step 1: Query Execution & Resilience
- Formats ticker symbols for exchange compatibility (e.g., Berkshire Hathaway Class B mapped to `BRK-B`).
- Submits structured HTTP request with declared browser User-Agent headers and query parameters `&events=div|split`.
- Employs polite inter-request rate-limiting delays (80ms) and automated timeout/retry handling.

### Step 2: Factual Data Verification & Adjustment Parsing
- **Price Validity**: Confirms `regularMarketPrice > 0.0` and `close > 0.0`. Rejects null or negative values.
- **Volume Sanity**: Validates `day_volume >= 0` and ensures historical candle arrays match timestamp lengths.
- **Corporate Action Multipliers**: Derives cumulative split multipliers from `events.splits` and cash payouts from `events.dividends`.
- **Timestamp Freshness**: Verifies the latest candle timestamp aligns with the most recent US exchange trading session.
- **Delta Calculation**: Computes explicit daily dollar change (`current_price - previous_close`) and percentage change (`(day_change / previous_close) * 100`).
- **Concordance Verification**: Verifies `nominal_close == round(split_adj_close * split_factor, 2)` for all candlesticks.

### Step 3: Cache Storage & Provenance
- Serializes complete dual-price technical payloads to `scripts/data/market_prices.json` and mirrors to `http/data/market_prices.json` and `context/data/market_prices.json`.
- Records `as_of_timestamp`, `provenance_tier: TIER_2_FINANCIAL_AGGREGATOR`, and `provenance_source: Direct Exchange / Yahoo Finance Chart API`.

## 3. Dual-Series Architecture: Nominal vs. Adjusted Prices

To support both historical document verification and quantitative mathematical modeling, the system maintains two parallel price representations:

### Architectural Principles

1. **Continuous Backward-Adjusted Series (`split_adj_open`, `split_adj_high`, `split_adj_low`, `split_adj_close`, `adj_close`)**:
   - Backward-adjusted whenever a forward split, reverse split, or dividend occurs.
   - Anchors to the active session market price ($P_0$).
   - Ensures continuous mathematical trends without split step-cliffs for moving averages (SMA 20, SMA 50), technical support/resistance bands, options Greeks, and CAGR calculations.
2. **Immutable Historical Nominal Series (`nominal_open`, `nominal_high`, `nominal_low`, `nominal_close`)**:
   - Permanently locked at the exact dollar amount printed on the exchange floor tape on that trading session.
   - Enables 100% auditable ground-truthing against historical press releases, news archives, and SEC Form 4 insider transaction reports.
3. **Deterministic Multiplier Conversion**:
   $$\text{Nominal Price}(t) = \text{Split-Adjusted Price}(t) \times \prod_{t_{split} > t} \left(\frac{\text{numerator}_i}{\text{denominator}_i}\right)$$
   $$\text{Split-Adjusted Price}(t) = \frac{\text{Nominal Price}(t)}{\text{Cumulative Split Multiplier}(t)}$$

### Data Structure Specification

```json
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "currency": "USD",
  "exchange": "NMS",
  "current_price": 313.42,
  "nominal_current_price": 313.42,
  "closing_price": 313.42,
  "previous_close": 316.75,
  "nominal_previous_close": 316.75,
  "split_adj_previous_close": 316.75,
  "adj_close": 313.42,
  "day_change": -3.33,
  "day_change_percent": -1.05,
  "day_open": 312.42,
  "day_high": 315.60,
  "day_low": 311.20,
  "day_volume": 10327146,
  "average_volume_20d": 48291000,
  "volume_ratio": 0.21,
  "fifty_two_week_high": 344.57,
  "fifty_two_week_low": 225.95,
  "sma_20": 315.80,
  "sma_50": 308.90,
  "technical_support_20d": 300.00,
  "technical_resistance_20d": 344.57,
  "cumulative_split_factor": 1.0,
  "recent_splits": [],
  "recent_dividends": [
    {
      "date": "2026-08-07",
      "amount": 0.26
    }
  ],
  "historical_candles_30d": [
    {
      "date": "2026-08-25",
      "nominal_open": 314.72,
      "nominal_high": 316.91,
      "nominal_low": 312.17,
      "nominal_close": 316.75,
      "nominal_volume": 34132300,
      "split_adj_open": 314.72,
      "split_adj_high": 316.91,
      "split_adj_low": 312.17,
      "split_adj_close": 316.75,
      "adj_close": 316.75,
      "open": 314.72,
      "high": 316.91,
      "low": 312.17,
      "close": 316.75,
      "volume": 34132300,
      "split_factor": 1.0,
      "split_ratio": null,
      "dividend_amount": null
    }
  ],
  "as_of_timestamp": "2026-08-26T16:00:00Z",
  "last_updated": "2026-08-26T16:00:00Z",
  "provenance_tier": "TIER_2_FINANCIAL_AGGREGATOR",
  "provenance_source": "Direct Exchange / Yahoo Finance Chart API"
}
```

## 4. Technical Indicators for Price Movement Prediction

1. **20-Day Simple Moving Average (`sma_20`)**:
   Measures short-term momentum and baseline mean reversion on the split-adjusted continuous series. When price is above `sma_20` on above-average volume, short-term accumulation is confirmed.
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

## 5. Grounding Benchmark Entry Price & Target Exit Price

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
