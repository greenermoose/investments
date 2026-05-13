# Technical Analysis Dictionary

For the purposes of the market simulator and agent logic, "Technical Analysis" (TA) is defined broadly as any quantitative analysis derived purely from market-generated data. This excludes fundamental data (earnings, PE ratios, news) and focuses strictly on price, volume, options pricing, and market microstructure.

---

## 1. Options-Based Technical Analysis

Because options are derivatives of the underlying stock, their pricing and volume often provide leading indicators regarding institutional sentiment, expected volatility, and structural support/resistance.

### Put-Call Ratio (PCR)
*   **Definition:** The ratio of the trading volume (or open interest) of put options to call options.
*   **Usage:** It is primarily used as a **contrarian sentiment indicator**. 
    *   An excessively high PCR (e.g., > 1.2) suggests extreme fear and heavy downside hedging. Historically, this often marks a "bottom" or oversold condition.
    *   A very low PCR (e.g., < 0.6) indicates extreme greed and complacency, often preceding a market correction or local top.

### Implied Volatility (IV) & Volatility Skew
*   **Definition:** IV represents the market's expectation of future volatility, derived from the price of options (via Black-Scholes). Skew refers to the difference in IV between Out-of-the-Money (OTM) puts and OTM calls.
*   **Usage:** 
    *   **IV Rank/Percentile:** Compares current IV to its historical range. Agents can sell premium (Strategies 2 & 4) when IV is at historic highs (options are expensive) and avoid buying options when IV is high.
    *   **Volatility Skew (Smirk):** If OTM puts are significantly more expensive than equidistant OTM calls, it indicates heavy institutional demand for downside protection, signaling fear or anticipation of a crash.

### Gamma Exposure (GEX) & "Option Walls"
*   **Definition:** Measures the dollar value of stock that market makers must buy or sell to remain delta-neutral as the underlying price changes.
*   **Usage:** This is a structural liquidity indicator.
    *   **Positive Net GEX:** Market makers must sell into rallies and buy into dips. This acts as a shock absorber, signaling low future volatility and a range-bound market.
    *   **Negative Net GEX:** Market makers must sell as the stock drops and buy as it rises. This acts as an accelerator, signaling high volatility and potential momentum breakouts.
    *   **Call/Put Walls:** Strikes with massive open interest (e.g., a massive 0DTE Call Wall) often act as magnetic pins or hard resistance levels because market maker hedging activity suppresses price movement beyond that strike.

### Options Order Flow (Unusual Activity)
*   **Definition:** Tracking massive, aggressive options trades ("sweeps") executed at the ask price.
*   **Usage:** Indicates institutional conviction. If an agent detects a massive, multi-million dollar call sweep at the ask expiring in 3 weeks, it serves as a bullish momentum confirmation signal.

---

## 2. Price and Momentum Analysis

These are traditional indicators derived from the time-series of the stock price itself.

### Moving Averages (SMA / EMA)
*   **Definition:** The average price of the stock over a specific lookback period (e.g., 50-day, 200-day). Exponential (EMA) weights recent prices more heavily.
*   **Usage:** 
    *   **Trend Identification:** Price > 200 SMA indicates a long-term macro bull trend.
    *   **Support/Resistance:** The 50 SMA often acts as a psychological floor during a bull market.
    *   **Crossovers (Golden Cross / Death Cross):** When a fast EMA crosses above a slow SMA, it signals a momentum shift.

### Bollinger Bands & Mean Reversion
*   **Definition:** A Simple Moving Average (usually 20-day) with an upper and lower band set at two standard deviations above and below the SMA.
*   **Usage:** Essential for **Strategy 6 (Short-Term Channel Swing)**. The bands dynamically widen during high volatility and contract during low volatility (the "Bollinger Squeeze"). Touching the lower band signals an oversold condition (buy), and the upper band signals overbought (sell).

### Relative Strength Index (RSI)
*   **Definition:** A momentum oscillator that measures the speed and change of price movements on a scale of 0 to 100.
*   **Usage:** Standard thresholds are 30 (Oversold) and 70 (Overbought). In strong trends, RSI can remain overbought/oversold for long periods, so it is best used to identify divergence (e.g., price makes a new low, but RSI makes a higher low, signaling a reversal).

---

## 3. Volume and Microstructure Analysis

Price action without volume is often considered "noise." Volume validates the price movement.

### Volume Profile (VPVR)
*   **Definition:** Unlike standard volume (which shows volume by *time*), Volume Profile shows volume traded at specific *price levels*.
*   **Usage:** Identifies high-liquidity nodes. A price level where massive historical volume occurred becomes a "Point of Control" (POC) and acts as massive structural support or resistance.

### Bid-Ask Spread & Order Book Depth
*   **Definition:** The difference between the highest price a buyer will pay (Bid) and the lowest price a seller will accept (Ask). Depth refers to the number of open limit orders at surrounding price levels.
*   **Usage:** 
    *   A widening spread indicates evaporating liquidity or impending high volatility.
    *   Agents can analyze the order book depth to determine if a breakout is supported by real buyers or if it's a low-liquidity "fakeout."

---

## 4. Macro-Market Data (Interest Rates)

While traditionally classified under macro-economics, interest rates are driven by the bond market and represent a critical piece of quantitative market data. There is a massive, structural correlation between interest rates and equity valuations.

### The Risk-Free Rate (e.g., 10-Year Treasury Yield & SGOV)
*   **Definition:** The yield on government bonds, which acts as the baseline "risk-free" rate of return. In your account, this is actively represented by the yield on SGOV.
*   **Usage / Correlation:**
    *   **Valuation Discounting (The Gravity of Stocks):** Mathematically, a stock's theoretical value is the present value of its future cash flows. When interest rates rise, the discount rate used in these formulas rises, causing the present value of stocks (especially high-growth, long-duration equities) to drop mechanically.
    *   **Opportunity Cost:** As the risk-free rate rises, the opportunity cost of holding equities increases. If the market can earn 5% guaranteed in SGOV, the risk premium required to hold volatile stocks increases. A sudden spike in bond yields almost always triggers algorithmic sell-offs in equities.
    *   **Yield Curve:** The spread between short-term and long-term rates. An inverted yield curve (short-term rates > long-term rates) is historically one of the most reliable leading indicators of a market contraction. Agents could use the yield curve or the absolute level of the 10-year yield as a macro trend filter, adjusting their aggressiveness based on the interest rate environment.
