# Sources for Stock and Option Prices

## Stock Pricing Data

1.  **Yahoo Finance API (`yfinance` Python library):**
    *   **Pros:** Free, extremely easy to use for historical OHLCV (Open, High, Low, Close, Volume) data for the ~25 stocks and ETFs on the watchlist.
    *   **Cons:** Prone to rate limiting, occasional data inconsistencies.
    *   **Usage in Simulator:** We will use this historical data not to replay the past, but to analyze it. We will extract statistical properties such as:
        *   Annualized Drift (Expected return)
        *   Historical Volatility ($\sigma$)
        *   Correlation matrices between the assets
2.  **Alpha Vantage:**
    *   **Pros:** Comprehensive API for stock history, technical indicators, and fundamental data. Includes a generous free tier.
    *   **Cons:** Free tier has daily/minute API call limits.
3.  **Alpaca:**
    *   **Pros:** Developer-first platform. Excellent for combining market data with actual algorithmic trading execution capabilities.
    *   **Cons:** Requires account setup, primarily focused on US equities.
4.  **Financial Modeling Prep (FMP):**
    *   **Pros:** Great value, strong fundamental data combined with price history and easy-to-use documentation.
    *   **Cons:** Advanced features and extensive history require a paid plan.

## Historical Options Pricing Data
Acquiring high-quality historical options data is notoriously difficult and usually expensive. Here are the leading sources based on our research:

1.  **ThetaData:**
    *   **Pros:** Highly cost-effective, granular (tick-level) historical data, very developer-friendly with strong Python SDKs. It provides the Greeks (Delta, Gamma, Theta, etc.) out of the box.
    *   **Cons:** Unnecessary if we only need End-of-Day prices.
2.  **Polygon.io:**
    *   **Pros:** Exceptional API documentation, very easy to integrate. Good for raw End-of-Day options prices.
    *   **Cons:** Often lacks pre-computed "clean" Greeks; requires manual implied volatility calculation.
3.  **ORATS (Options Research & Technology Services):**
    *   **Pros:** Top-tier for cleaned, smoothed volatility surfaces and Greeks. They fix the messy "noise" in options data.
    *   **Cons:** Enterprise pricing, usually too expensive for a personal project.
4.  **Tradier:**
    *   **Pros:** Developer-friendly brokerage that provides reliable API access to market data including options chains. Often free if you maintain a funded account.
    *   **Cons:** Requires opening a brokerage account to access the best data rates.
5.  **Alpha Vantage:**
    *   **Pros:** Provides options data alongside their core stock data, making it a good "all-in-one" general purpose API.
    *   **Cons:** Options data might not be as granular or specialized as dedicated providers like ThetaData.

**Simulator Data Strategy for Options:**
Because our simulator relies on generating *hypothetical* future market paths (Monte Carlo simulations) rather than purely replaying history, we do not need terabytes of historical options tick data. Instead:
1. We pull standard historical Implied Volatility (IV) averages for our 25 stocks.
2. During the Monte Carlo simulation, the simulator will act as the "Options Exchange." It will mathematically approximate option premiums dynamically using the **Black-Scholes model**. This prices the agent's puts and calls perfectly relative to the simulated stock price, time to expiration, and historical volatility.
