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

The following phases outline the functionality to be moved from specifications and coded next.

### Active & Near-Term Focus

#### [MODIFY] [DashboardScreen.js](file:///c:/Users/fyhor/Documents/GitHub/investments/http/js/components/DashboardScreen.js)
* **Remaining UI Panel Integrations**: Integrate the remaining mockup cards with active calculated components/actions:
  * **Portfolio Allocation Visuals**: Link the Portfolio card to interactive asset allocation charts (e.g. cash vs. equities, stock allocation percentages).
  * **Screaming Buys Alert**: Indicator linking to watchlisted opportunities.
  * **Simulator**: Interface hook to launch Monte Carlo model runs.

#### [NEW] Lot Management Service (`LotManager.js`)
* **FIFO, LIFO, and Specific Identification**: Implement tax-lot tracking models to determine exact cost-basis configurations and calculate weighted-average base values.

---

### Future Roadmap Phases

### Phase 1: Portfolio View & History Rebuilder
* **Visual Portfolio Allocation**: Interactive charts (pie/bar) displaying asset allocation, cash vs. equities, and account divisions.
* **Time-Series Historical Tracker**:
  * Support uploading multiple historical position snapshots.
  * Side-by-side snapshot comparison (detecting additions, removals, and changes in position sizes).
  * Historical portfolio net-worth curve.

### Phase 2: Watchlist & 27-Bucket Opportunity Matrix
* **Watchlist Manager**: UI to add/remove tickers, set target entry prices, and document investment theses.
* **27-Bucket Allocation UI**:
  * Track Bucket 1 (SGOV / cash baseline).
  * Calculate and rank expected annualized ROI of Buckets 2–26 (combining underlying yield and option premiums).
  * Highlight Bucket 27 (Screaming Buy) and suggest rotation paths.

### Phase 3: SEC Ingestion & Valuation Engine
* **SEC EDGAR API Ingestion**: Script/service to fetch 10-K and 10-Q filings for watchlisted symbols.
* **Valuation Models**:
  * **P/S Historical Reversion**: Match current P/S against 3/5/10-year historical ranges using fully diluted shares outstanding.
  * **Reverse DCF**: Calculate growth rate implied by the current market price and compare it to historical growth rates.
  * **EV/FCF & ROIC**: Auto-generate valuation metrics that are resistant to accounting adjustments.
  * **Signal Generator**: Highlight stocks trading below historical P/S ranges or with FCF yields above targeted thresholds.

### Phase 4: Strategy Simulator
* **Monte Carlo Simulator Engine**: Run path simulations for selected equities.
* **Options Pricing Simulator**: Build a Black-Scholes model calculator that prices simulated option chains dynamically.
* **Strategy Testers**: Backtest options strategies (Covered Calls, CSPs, Collars, Dividend Capture "Double Dip", and horizontal/diagonal rolls) to compare their returns against simple buy-and-hold under varying market regimes.

### Phase 5: Automation & Convenience
* **Automated Price Alerts**: Desktop or browser notifications when watchlisted equities enter the "buy zone".
* **90-Day time-stop trigger**: Warning system highlighting assets that have been stagnant for 90 days and should be liquidated.
* **Backup & Restore Manager**: UI to export the IndexedDB state as a local JSON file and restore it on other devices.