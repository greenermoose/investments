# Market Simulator Architecture Plan

We are building a Python-based Monte Carlo market simulator. The system will analyze historical data to extract statistical rules, generate thousands of hypothetical market paths, and pit our 7 trading agents against these simulated markets to compare performance.

## User Review Required
> [!IMPORTANT]
> This plan outlines a significant software architecture. Please review the Monte Carlo generation and Options Pricing approach to ensure it meets your expectations for statistical realism.

## Design Decisions & Constraints

> [!NOTE]
> - **Options Pricing:** The simulator will use the Black-Scholes mathematical formula combined with an "entropy" factor to account for the irrationality seen in real-world option pricing. We will acquire actual historical option data to compare against our model and tune the entropy.
> - **Scale:** The simulation engine will support infinite scale, capable of simulating as far into the future as we let it run.
> - **Performance & Implementation:** We will prototype the simulator in Python to validate the logic. Subsequently, we will rewrite the core simulation engine in a low-level language (such as C or Assembly) to achieve massive performance gains for long-running, large-scale simulations.

## Proposed Architecture

### 1. Data Ingestion & Statistical Analysis
This module is responsible for pulling historical data and generating the "rules" for the simulation.
#### [NEW] `src/data/yahoo_client.py`
- Connects to `yfinance` to pull historical daily prices for the 25-stock watchlist.
#### [NEW] `src/data/statistical_analyzer.py`
- Analyzes the historical data to calculate the annualized drift ($\mu$), historical volatility ($\sigma$), correlation matrices between the 25 stocks, and typical dividend yields.

### 2. Monte Carlo Market Generator
This module generates the hypothetical future markets. It will be designed to run continuously for infinite-scale simulation.
#### [NEW] `src/simulator/market_generator.py`
- Uses Geometric Brownian Motion (GBM) to simulate daily stock prices that follow the statistical rules extracted by the analyzer.
- Capable of generating parallel "market universes" continuously for as many simulated days as allowed to run.
#### [NEW] `src/simulator/options_pricer.py`
- Implements the Black-Scholes-Merton model combined with randomized "entropy" to dynamically calculate the premium of puts and calls.
- Simulates real-world pricing irrationality by deviating slightly from perfect Black-Scholes mathematical pricing.
#### [NEW] `src/data/options_data_validator.py`
- Fetches and analyzes actual historical options data to benchmark and tune the Black-Scholes + entropy pricing model.

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
- Run unit tests to verify the mathematical accuracy of the base Black-Scholes option pricer.
- Compare the output of the options pricing engine (Black-Scholes + entropy) against a dataset of actual historical options data to validate the realism of the pricing.
- Verify the `market_generator` creates price distributions that statistically match the historical mean and variance over large, indefinite timescales.

### Manual Verification
- Run a small-scale simulation (10 markets over 1 year) and print out trade logs for a single agent to manually verify that SGOV is being sold before limits are placed, cash drag is applied, and trailing stops trigger at the exact correct percentages.
