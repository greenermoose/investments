# Sources for Stock and Option Prices

## Stock Pricing Data
*   **Source:** Yahoo Finance API (`yfinance` Python library).
*   **Purpose:** To retrieve historical OHLCV (Open, High, Low, Close, Volume) data for the ~25 stocks and ETFs on the watchlist.
*   **Usage in Simulator:** We will use this historical data not to replay the past, but to analyze it. We will extract statistical properties such as:
    *   Annualized Drift (Expected return)
    *   Historical Volatility ($\sigma$)
    *   Correlation matrices between the assets

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

**Simulator Data Strategy for Options:**
Because our simulator relies on generating *hypothetical* future market paths (Monte Carlo simulations) rather than purely replaying history, we do not need terabytes of historical options tick data. Instead:
1. We pull standard historical Implied Volatility (IV) averages for our 25 stocks.
2. During the Monte Carlo simulation, the simulator will act as the "Options Exchange." It will mathematically approximate option premiums dynamically using the **Black-Scholes model**. This prices the agent's puts and calls perfectly relative to the simulated stock price, time to expiration, and historical volatility.
