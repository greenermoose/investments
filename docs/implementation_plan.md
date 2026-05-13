# Market Simulator Architecture Plan

We are building a Python-based Monte Carlo market simulator. The system will analyze historical data to extract statistical rules, generate thousands of hypothetical market paths, and pit our 7 trading agents against these simulated markets to compare performance.

## User Review Required
> [!IMPORTANT]
> This plan outlines a significant software architecture. Please review the Monte Carlo generation and Options Pricing approach to ensure it meets your expectations for statistical realism.

## Open Questions
> [!WARNING]
> 1. **Options Pricing Engine:** Since we are generating *future* random stock prices, there is no real-world options data for them. Are you comfortable with the simulator using the Black-Scholes mathematical formula to dynamically price the agent's puts and covered calls during the simulation based on the simulated stock price and historical volatility?
> 2. **Scale:** How many days into the future should one simulated market last? (e.g., a 5-year or 10-year simulation of daily prices?)

## Proposed Architecture

### 1. Data Ingestion & Statistical Analysis
This module is responsible for pulling historical data and generating the "rules" for the simulation.
#### [NEW] `src/data/yahoo_client.py`
- Connects to `yfinance` to pull historical daily prices for the 25-stock watchlist.
#### [NEW] `src/data/statistical_analyzer.py`
- Analyzes the historical data to calculate the annualized drift ($\mu$), historical volatility ($\sigma$), correlation matrices between the 25 stocks, and typical dividend yields.

### 2. Monte Carlo Market Generator
This module generates the hypothetical future markets.
#### [NEW] `src/simulator/market_generator.py`
- Uses Geometric Brownian Motion (GBM) to simulate daily stock prices that follow the statistical rules extracted by the analyzer.
- Capable of generating thousands of independent parallel "market universes."
#### [NEW] `src/simulator/options_pricer.py`
- Implements the Black-Scholes-Merton model to dynamically calculate the premium of puts and calls at any strike/expiration on any given simulated day.

### 3. Agent Framework
This module implements the 7 documented trading strategies.
#### [NEW] `src/agents/base_agent.py`
- Base class handling capital management, SGOV balance tracking, margin constraints, and order execution logic.
#### [NEW] `src/agents/strategy_implementations.py`
- Classes for each strategy, containing their specific trigger logic (e.g., Bollinger Bands for Strategy 6, Trailing Stops for Strategy 7).

### 4. Backtesting Engine
The core loop that runs the agents through the simulated markets.
#### [NEW] `src/engine/backtester.py`
- Steps through the simulated timelines day by day.
- Processes agent limit orders, assigns options at expiration, and handles dividend payouts.
#### [NEW] `src/engine/results_analyzer.py`
- Aggregates the performance of all strategies across all simulated markets.
- Calculates average Annualized ROI, Max Drawdown, Win Rate, and Risk-Adjusted Return.

## Verification Plan

### Automated Tests
- Run unit tests to verify the mathematical accuracy of the Black-Scholes option pricer against known real-world examples.
- Verify the `market_generator` creates price distributions that statistically match the historical mean and variance.

### Manual Verification
- Run a small-scale simulation (10 markets over 1 year) and print out trade logs for a single agent to manually verify that SGOV is being sold before limits are placed, cash drag is applied, and trailing stops trigger at the exact correct percentages.
