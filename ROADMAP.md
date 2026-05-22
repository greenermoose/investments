# Investment App Roadmap

> [!IMPORTANT]
> **Developer & Agent Notice (Prevent Roadmap Drift)**: 
> You **MUST** update this roadmap file immediately after writing or modifying code.
> - When features are implemented, move them from the **Next Features & Development Phases** section to the **Coded Features** subsection under **Current Status**.
> - Ensure all paths, components, and services listed reflect their actual state in the codebase.
> - Ensure `CHANGELOG.md` and this document remain synchronized.

This document outlines the coding, functionality, and architectural roadmap to achieve the app's core investment goal.

---

## Overarching Goal

Help achieve an annualized **20% Return on Investment (ROI)** over a **20-year horizon** inside a tax-advantaged **Roth IRA** (e.g., compounding starting capital of $200,000 to over $7,600,000 with zero tax drag).

---

## Core Strategy & Philosophy

To achieve a consistent 20% return, the app is designed around five tactical pillars described in the design documents:

1. **Rigorous Intrinsic Valuation (Low-Guesswork Metrics)**
   * Avoid third-party data aggregators. Analyze raw **SEC EDGAR filings (10-K, 10-Q)** directly to obtain exact Trailing Twelve Months (TTM) revenue and fully diluted share counts (factoring in stock-based compensation).
   * Focus on metrics that are difficult to manipulate: **Price-to-Sales (P/S) historical reversion**, **Reverse Discounted Cash Flow (Reverse DCF)** growth expectations, **FCF Yield**, and **ROIC**.
2. **Capital Velocity & Time-Stops**
   * Focus on compounding micro-gains (e.g., target a **10% return in 90 days** on positions, which equates to ~46% annualized).
   * Enforce a strict **90-day time-stop** on stagnant equity positions to eliminate "equity drag" and recycle capital.
3. **Yield Enhancement (Options Wheel & Rolling)**
   * Sell Out-of-the-Money (OTM) **Covered Calls** to automate disciplined exits and collect premiums.
   * Sell **Cash-Secured Puts** (CSPs) on watchlisted "screaming buys" to monetize the wait, acquiring shares at a discount.
   * Roll options defensively (horizontal or diagonal) exclusively for a **net credit**.
4. **The 27-Bucket Conviction Matrix**
   * **Bucket 1**: Cash equivalent (e.g., SGOV generating risk-free yield).
   * **Buckets 2–26**: Active holdings (up to 25 positions), each mapped with expected ROI and conviction scores.
   * **Bucket 27**: The current market "Screaming Buy".
   * **Rotation Rule**: Automatically recommend liquidating the lowest-performing active buckets when Bucket 27 offers superior risk-adjusted ROI.
5. **Monte Carlo Strategy Simulator**
   * Model hypothetical future price paths and evaluate strategy outcomes using **Black-Scholes** options pricing, rather than relying on standard historical backtesting.

---

## Current Status (New v0.6.0+ Architecture)

Following the `v0.6.0` refactor, the application has transitioned to a lightweight, zero-dependency browser-based architecture.

### Coded Features
* **IndexedDB Database Layer (`DatabaseService.js`)**: Version 3 schema initialized with stores for `user_data` (profiles), `uploaded_files`, `equities`, and `companies`.
* **Brokerage Ingestion Engine (`BrokerageParser.js`, `CSVParser.js`)**: Classifies and parses CSV, JSON, and XML brokerage export statements.
* **Portfolio Processor (`PortfolioProcessor.js`)**: Heuristically groups files by account, reconciles transactions chronologically, rebuilds equity holdings, tracks acquisition dates, and updates database records.
* **Portfolio Valuation Service (`PortfolioValuation.js`)**: Computes running average cost basis, option premium liabilities, realized gains, and net asset values from chronological transaction histories.
* **UI Components & Features**:
  * `WelcomeScreen.js`: User registration and initial state setup.
  - `DashboardScreen.js`: File upload manager, showing file types (Positions/Transactions) and processing state.
  - **Dynamic Portfolio Metrics Panel (`DashboardScreen.js`)**: Added live, calculated portfolio stats:
    * **Net Liquidation Value**: Calculated from cash, stock value, and option liabilities.
    * **Options Drag**: Total premium liabilities reducing portfolio liquidity.
    * **Obligations & Capped Upside**: Tracks covered call strike cap values, short put cash collateral requirements, and underwater in-the-money obligation risks.
  - `EquitiesScreen.js`: Table view of the equities database universe, showing first/last owned dates.
  - `CompaniesScreen.js`: Association table matching equities/options to parent company profiles.

---

## Next Features & Development Phases

The following phases outline the functionality needed to build the ultimate decision support tool for achieving the overarching goal.

### Active & Near-Term Focus

#### [NEW] Watchlist & SEC Data Ingestion Engine
* **Watchlist Manager**: UI to add/remove tickers (owned or prospective) and set target entry prices.
* **SEC EDGAR API Ingestion**: Script/service to fetch 10-K and 10-Q filings for watchlisted symbols to obtain exact historical revenue and fully diluted shares outstanding.
* **Historical Price Normalization**: Acquire historical share prices, adjusted for splits and dividends, as a prerequisite for calculating historical metrics.

#### [NEW] Lot Management Service (`LotManager.js`)
* **Execution Scoring Mechanism**: Implement tracking to calculate the exact annualized ROI for every specific tax lot bought and sold. This serves as the primary feedback loop to spot patterns and evaluate real-world trading performance.

---

### Future Roadmap Phases

### Phase 1: Valuation Engine & Signal Generator
* **Core Valuation Models**:
  * **P/S Historical Reversion**: Match current P/S against 3/5/10-year historical ranges using fully diluted shares.
  * **Reverse DCF**: Calculate the growth rate implied by current market prices.
* **Sell Signal Generator**: Identify which **owned companies** are currently trading ABOVE their intrinsic values, flagging them as sell candidates.
* **Buy Signal Generator**: Identify which **watchlisted companies** are trading significantly below their intrinsic values ("Screaming Buys").

### Phase 2: The 27-Bucket Conviction Matrix
* **Conviction UI**: Build the conceptual framework and display to quickly visualize the highest conviction trade ideas.
* Track Bucket 1 (SGOV / cash baseline).
* Calculate and rank expected annualized ROI of active buckets (combining yield and option premiums).
* Highlight Bucket 27 (Screaming Buy) and suggest rotation paths.

### Phase 3: Trading Strategy Modeling
* **Monte Carlo Simulator Engine**: Run future path simulations for selected equities.
* **Options Pricing Simulator**: Build a Black-Scholes model calculator that prices simulated option chains dynamically.
* **Strategy Testers**: Backtest and model various options strategies (Covered Calls, CSPs, Collars, Rolling) to determine which trading strategies perform best under different market conditions.
