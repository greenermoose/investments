# Trading Strategies

This document outlines the trading strategies intended for use in the market simulator. The overarching goal is to maximize annualized return within a high-risk (small portfolio fraction), tax-advantaged (Roth IRA) account by actively capturing gains at peaks and buying at valleys, avoiding the pitfalls of long-term "buy and hold" round trips.

Uninvested capital is held in SGOV (short-term treasury ETF) to generate yield, serving as "dry powder" that is sold via market-limit orders when liquidity is needed for equity purchases. The trading universe is restricted to ETFs and a curated watchlist of ~25 individual public companies.

## Strategy 1: Scaled Position Trading (Legging In and Out)

**Concept:** 
Rather than buying or selling an entire position at a single price point, this strategy uses a series of limit orders to incrementally build a position as the price falls ("legging in") and incrementally sell the position as the price rises ("legging out"). 

**Motivation:**
It is impossible to perfectly time the absolute bottom or top of a market movement. Legging in ensures that the average cost basis improves if a stock continues to drop after an initial purchase. Legging out locks in profits incrementally as a stock rises, ensuring that gains are captured rather than lost in a subsequent downturn.

**Simulator Agent Implementation Details:**

1.  **Legging In (Entry Execution):**
    *   **Trigger:** The agent identifies an asset from the watchlist that has reached an "oversold" condition based on fundamental criteria or a predetermined price drop threshold.
    *   **Capital Allocation:** The agent determines the maximum capital allocation for this asset.
    *   **Tranche Setup:** Instead of deploying 100% of the allocated capital at the current market price, the agent divides the capital into $N$ tranches.
    *   **Order Placement:**
        *   Tranche 1: Buy limit order near the current price.
        *   Tranche 2: Buy limit order at $X\%$ below Tranche 1.
        *   Tranche 3: Buy limit order at $Y\%$ below Tranche 2, etc.
    *   **Action:** If the price continues to drop, the agent automatically executes the lower limit orders, lowering the overall average cost basis.

2.  **Legging Out (Exit Execution):**
    *   **Trigger:** Upon the successful execution of *any* entry tranche, the agent immediately calculates target sell prices. The targets are strongly influenced by the desired *annualized return*.
    *   **Tranche Setup:** The held position is divided into $M$ sell tranches.
    *   **Order Placement:**
        *   Sell Tranche 1: Limit order placed at a price that achieves a baseline target return (e.g., locking in a quick gain to protect capital).
        *   Sell Tranche 2: Limit order placed higher, targeting a larger gain.
        *   Sell Tranche 3: Limit order placed even higher, capturing "peak" pricing.
    *   **Action:** As the price rises and hits the limit orders, the agent automatically trims the position, realizing profits and freeing up capital. If the price falls before hitting the highest sell limits, the agent has still secured partial profits on the way up.

3.  **Capital Management Integration (No-Margin Constraint):**
    *   **Pre-Funding Limit Orders:** Because this is a Roth IRA without margin privileges, cash must be available *before* placing a buy limit order. The agent must first sell SGOV to raise cash. Only after SGOV is sold can the equity limit order be placed.
    *   **Opportunity Cost (Cash Drag):** While a buy limit order is pending, the allocated capital sits in cash earning minimal interest (~0.05%) instead of the SGOV yield (~4%). This creates a tangible "cash drag" cost while waiting for orders to fill.
    *   **Re-investing to SGOV:** If a sell limit order executes, or if an open buy limit order is canceled, the resulting cash is immediately swept back into SGOV to resume generating yield.

4.  **Order Duration and Lifecycle Management:**
    *   **Order Type:** Limit orders will primarily be placed as **GTC (Good 'Til Canceled)** to allow them to wait for the target price.
    *   **Expiration/Cancellation Criteria:** The agent will test rules for canceling or modifying open orders, specifically balancing price aggressiveness against cash drag:
        *   **Time-Based Expiration (Yield Tradeoff):** Canceling unfilled entry orders after a set number of days and using the cash to buy back SGOV. The simulator will test the optimization of this timeframe: waiting longer for a better entry price vs. losing out on SGOV interest while sitting in cash.
        *   **Fundamental Shift:** Canceling entry orders if the underlying company's fundamental thesis or broader market condition changes.
        *   **Price Drift:** Modifying limit prices if the asset's overall trading range shifts over time.

**References:**
*   Minervini, M. *Think and Trade Like a Champion*. Minervini emphasizes strict risk management and strongly criticizes "averaging down" or scaling into losing positions in individual stocks, highlighting the risk of ruin.
*   Lefèvre, E. *Reminiscences of a Stock Operator*. A foundational text on trading psychology that advises against adding to losing positions, a core risk of the "legging in" mechanic when applied to individual equities.

## Strategy 2: The Options Wheel (Cash-Secured Puts & Covered Calls)

**Concept:**
Instead of using limit orders to buy and sell underlying shares, this strategy generates income through option premiums while waiting to acquire or dispose of an asset. It involves selling Cash-Secured Puts (CSPs) to establish an entry, and selling Covered Calls (CCs) to manage the exit.

**Motivation:**
This strategy directly addresses the "cash drag" problem identified in the no-margin account. When waiting for a target entry price, selling SGOV to sit in cash is costly. By selling a put, the collected premium offsets the lost SGOV interest. When exiting, covered calls generate additional return while waiting for the target exit price to hit.

**Simulator Agent Implementation Details:**

1.  **Entry via Cash-Secured Puts (CSPs):**
    *   **Trigger:** The agent evaluates the watchlist periodically (e.g., monthly) for target entry points.
    *   **Execution:** 
        1.  Sell sufficient SGOV to cover the total potential assignment cost (100 shares $\times$ Strike Price).
        2.  Sell a put option at the target entry strike price.
    *   **Yield Offset:** The premium collected must be evaluated against the lost SGOV yield (~4%) to ensure the trade is net-positive over the holding period compared to simply holding SGOV.
    *   **Outcome:** 
        *   If the option expires worthless (price stays above strike): The agent keeps the premium, uses the cash to buy back SGOV, and re-evaluates the next cycle.
        *   If assigned (price drops below strike): The agent takes possession of 100 shares at the target entry price. The effective cost basis is the Strike Price minus the premium received.

2.  **Exit via Covered Calls (CCs):**
    *   **Trigger:** The agent holds 100+ shares of an asset via assignment or direct purchase.
    *   **Execution:** The agent sells a covered call against the position.
    *   **Dynamic Strike Selection (Annualized ROI Target):** The strike price is not fixed based on a percentage gain; it is dynamically determined by the agent's strict target for annualized ROI.
        *   *Short Holding Period:* If the position was just established, the agent may accept a lower strike price because a quick turnover yields a massive annualized return.
        *   *Long Holding Period:* The longer the asset is held, the higher the required exit price becomes to achieve the same annualized ROI. The agent must calculate the minimum strike price that satisfies the ROI formula based on the total days held and all accumulated premiums.
    *   **Outcome:**
        *   If the option expires worthless: The agent keeps the premium, which further lowers the effective cost basis, and sells another covered call in the next cycle.
        *   If assigned (called away): The shares are sold at the strike price. The total return (Strike Price - Initial Cost Basis + All Premiums) is locked in, and all resulting cash is swept immediately back to SGOV.

**References:**
*   *Early Retirement Now (ERN)*. "Passive options strategies are not a free lunch." ERN provides a mathematical breakdown of the Wheel Strategy, proving its risk profile is identical to a naked short put and exposing the "hidden drawdown" risk of being assigned falling stocks.
*   *QuantConnect*. Algorithmic backtests on systematic short put writing demonstrate that while the strategy can produce superior risk-adjusted returns (Sharpe ratio) due to premium collection, it underperforms simple buy-and-hold during strong bull markets.

## Strategy 3: The "Screaming Buy" Active Legging & Covered Call Exit

**Concept:**
This is a highly active, alert-driven strategy designed to capitalize on extreme, short-term oversold conditions (a "screaming buy"). It combines rapid, aggressive legging for entry with a covered call strategy for exit.

**Motivation:**
When a stock on the watchlist crashes to a price that is simply too good to pass up, waiting for passive limit orders to fill or waiting to sell puts might result in missing the bottom. This strategy demands immediate cash availability and aggressive purchasing to establish a position near the extreme low, followed by disciplined, income-generating exits.

**Simulator Agent Implementation Details:**

1.  **Rapid Entry (Active Legging):**
    *   **Trigger:** The agent receives a simulated "alert" indicating an asset has crossed a dramatic, predefined "screaming buy" price threshold.
    *   **Liquidity Generation:** The agent immediately places a limit order priced at the current market bid to sell SGOV, prioritizing instantaneous execution to free up cash.
    *   **Active Legging Execution:**
        *   The agent divides the newly raised cash into a fixed number of rapid-fire entry legs (e.g., $N=5$).
        *   Instead of passive GTC orders, the agent places immediate limit orders (priced at or slightly above the current ask, effectively acting as market orders but with price protection).
        *   It executes these $N$ legs consecutively, attempting to average into the best possible price during the volatility until the allocated capital is completely deployed.

2.  **Exit via Covered Calls (CCs):**
    *   Once the position is fully established from the active legging phase, the agent switches exactly to the exit methodology defined in **Strategy 2**.
    *   **Execution:** The agent immediately sells covered calls against the newly acquired position.
    *   **Dynamic Strike Selection:** The strike price is strictly determined by the annualized ROI target, requiring lower strikes for quick turnarounds and higher strikes as the holding period extends.
    *   **Outcome:** If assigned, shares are called away, the ROI target is achieved, and capital returns to SGOV. If worthless, collected premiums lower the cost basis and a new call is sold in the next cycle.

**References:**
*   Bellafiore, M. *The Playbook*. Discusses the necessity of having systematized, rapid-execution setups for extreme market conditions. Bellafiore emphasizes that when a true edge (like a "screaming buy" alert) is present, aggressive and rapid capital deployment is required before the market corrects the inefficiency.

## Strategy 4: The Floor-to-Ceiling Ride (Premium Maximization)

**Concept:**
This strategy combines the rapid, aggressive entry of Strategy 3 with a long-term, premium-harvesting hold. The asset is held and "farmed" for covered call premiums from its defined historical floor all the way to its projected ten-year ceiling. 

**Motivation:**
Some high-conviction stocks are worth holding for massive long-term appreciation. Instead of exiting early based on a fixed ROI target, this strategy seeks to ride the underlying asset from a "valley" to a "peak" while generating steady cash flow along the entire journey, only accepting assignment if mathematically advantageous or if the ceiling is reached.

**Simulator Agent Implementation Details:**

1.  **Fundamental Anchors:**
    *   The agent is configured with a predefined **Floor Price** and a **Ten-Year Ceiling Price** for each asset on the watchlist.

2.  **Rapid Entry (Active Legging):**
    *   **Trigger:** An alert is generated when the asset's price falls below its configured **Floor Price**.
    *   **Execution:** Identical to Strategy 3. The agent sells SGOV at market and actively legs into the equity to capture the lowest possible cost basis.

3.  **The Ride Phase (Price < Ceiling):**
    *   **Goal:** Generate maximum income via covered calls while strictly avoiding assignment.
    *   **Execution:** Sell covered calls with strikes/expirations selected to minimize assignment risk while yielding premium.
    *   **Defense (The Rolling Rule):** If the stock unexpectedly rallies and threatens assignment:
        *   The agent attempts to **roll** the option horizontally (same strike, later expiration) or diagonally (higher strike, later expiration).
        *   **Strict Condition:** The agent will *only* execute a roll if it results in a **Net Credit**. It will never roll for a net debit.
        *   If no net-credit roll is available, the agent accepts early assignment and sweeps cash back to SGOV.

4.  **The Exit Phase (Price >= Ceiling):**
    *   **Trigger:** The asset's price reaches or exceeds the **Ten-Year Ceiling Price**.
    *   **Goal:** The agent no longer fears assignment and actively seeks to exit the position.
    *   **Execution Tactics (Agent tests or selects one):**
        *   **Aggressive Calls:** Sell At-The-Money (ATM) or In-The-Money (ITM) calls to force assignment while harvesting maximum premium.
        *   **Limit Orders:** Place standard limit sell orders at the ceiling price.
        *   **Collaring:** Buy a protective put and sell a covered call. This locks in the gains while allowing the agent to wait out a definitive breakout or breakdown before final exit.

**References:**
*   *tastylive*. Options education network that extensively documents the mechanics of "rolling for a net credit." Their quantitative research supports rolling as the primary defensive mechanism for covered calls to extend duration and collect extrinsic value while avoiding assignment.
*   *Charles Schwab Options Research*. Literature on covered call defense emphasizes that while rolling is effective, capping upside on a high-conviction long-term hold mathematically guarantees underperformance if the stock experiences a massive breakout above the ceiling.

## Strategy 5: The "Double Dip" (Dividend Capture + Covered Call)

**Concept:**
This strategy targets companies on the watchlist with upcoming ex-dividend dates. It seeks to capture both the quarterly dividend and the premium from a short-term covered call in a compressed timeframe, maximizing annualized ROI.

**Motivation:**
In a tax-advantaged Roth IRA, dividends are not taxed, making dividend capture highly efficient. By pairing the stock purchase with an At-The-Money (ATM) or slightly In-The-Money (ITM) covered call, the agent mitigates the typical price drop that occurs on the ex-dividend date while boosting the total yield of the short-term trade.

**Simulator Agent Implementation Details:**

1.  **Entry (Timing is Critical):**
    *   **Trigger:** The agent scans the watchlist for stocks 2-5 days away from their ex-dividend date.
    *   **Execution:** Sell SGOV to raise cash, then buy 100 shares of the target stock.
2.  **Exit (Simultaneous Call Sale):**
    *   **Execution:** Immediately upon buying the shares, sell an ATM or slightly ITM covered call expiring as soon as possible after the ex-dividend date (typically within 1-2 weeks).
3.  **Outcome:**
    *   If called away: The agent collects the dividend plus the option premium, yielding a massive annualized return due to the short holding period. Cash returns to SGOV.
    *   If the price drops and the option expires worthless: The premium offsets the price drop. The agent lowers its cost basis and rolls into Strategy 2 (Standard Covered Calls) or Strategy 4 depending on the price relative to the 10-year ceiling.

**References:**
*   *Options Clearing Corporation (OCC)*. Reports and data from the OCC demonstrate a significant statistical spike in early option assignments immediately preceding ex-dividend dates, confirming the high risk of shares being called away before the dividend is captured.
*   *TSI Network*. Financial research on dividend capture strategies. They criticize the "double dip" strategy by noting that efficient options pricing models (Black-Scholes) already price in the expected dividend drop, meaning the collected premium is inherently smaller and offers no statistical "free lunch."

## Strategy 6: Short-Term Channel Swing (Mean Reversion)

**Concept:**
A bread-and-butter active trading strategy that relies on technical indicators to define short-term rolling "valleys" and "peaks" over a 30-to-90 day window, rather than waiting for macro 10-year extremes.

**Motivation:**
While waiting for "screaming buys", capital sits in SGOV earning 4%. This strategy keeps capital actively churning in the mid-range of a stock's historical price, capturing 5-10% swings continuously to compound returns.

**Simulator Agent Implementation Details:**

1.  **Technical Setup:**
    *   The agent calculates short-term technical bands for each stock (e.g., 20-day Bollinger Bands or RSI indicators) to establish a dynamic "Local Floor" and "Local Ceiling".
2.  **Entry (Local Valley):**
    *   **Trigger:** The stock touches the Local Floor (e.g., lower Bollinger Band or RSI < 30).
    *   **Execution:** Sell SGOV, place a buy limit order to acquire the shares.
3.  **Exit (Local Peak):**
    *   **Trigger:** The agent immediately calculates a target sell price based on the Local Ceiling (e.g., upper Bollinger Band) or a standard annualized ROI goal.
    *   **Execution:** Place a GTC sell limit order at the target price. If the price hits, shares are sold, and cash returns to SGOV. 
    *   *(Note: This strategy uses limit orders for both entry and exit, focusing purely on price action rather than options).*

**References:**
*   Bollinger, J. *Bollinger on Bollinger Bands*. The creator of the indicator explains how to use bands to define rolling local floors and ceilings for mean reversion trading. Crucially, he warns against the "whipsaw" effect, noting that in strong trends, prices will "ride the band" rather than revert, necessitating strict stop-loss rules.

## Strategy 7: Momentum Breakout with Trailing Stop Loss

**Concept:**
Instead of trying to catch falling knives or buy at "valleys," this strategy relies on momentum. It buys assets that are breaking *out* to new highs and uses a dynamic Trailing Stop Loss to ride the trend up, automatically cutting the cord the moment the trend breaks.

**Motivation:**
All previous strategies involve holding through drawdowns, which carries the risk of massive capital loss if a stock fundamentally collapses. This strategy prioritizes absolute capital protection. By using a trailing stop, it guarantees that losers are cut quickly and winners are allowed to run without the user needing to guess the "peak." It actively prevents the "round trip" by mathematically locking in profits as the stock ascends.

**Simulator Agent Implementation Details:**

1.  **Entry (The Breakout):**
    *   **Trigger:** The agent detects that a stock has broken above a key resistance level (e.g., crossing above a 50-day moving average or hitting a 3-month high).
    *   **Execution:** Sell SGOV. Immediately place a buy limit order to acquire the shares during the breakout momentum.
2.  **Exit (The Trailing Stop):**
    *   **Execution:** The moment the buy order fills, the agent establishes a **Trailing Stop Loss** (e.g., 8% below the current market price).
    *   **Dynamic Management:** As the stock price rises, the trailing stop price automatically ratchets upward to stay exactly 8% below the new high-water mark. It never moves down. 
    *   **Outcome:** If the stock drops 8% from its highest achieved price, the stop loss automatically triggers a market sell order. The position is liquidated, capital is protected (or profits are locked in), and cash is swept immediately back to SGOV. 

**References:**
*   O'Neil, W. *How to Make Money in Stocks*. O'Neil's CAN SLIM strategy is foundational for momentum trading. He strictly mandates an absolute maximum stop loss of 7% to 8% to prevent catastrophic drawdowns, arguing that capital preservation is the single most important rule of investing.
*   Minervini, M. *Trade Like a Stock Market Wizard*. Discusses the brutal mathematics of drawdowns, proving that cutting losses early with strict stops is a mathematical necessity because a 50% loss requires a 100% gain just to break even.

## Strategy 8: The Catalyst "Free Roll" (House Money)

**Concept:**
This strategy involves making short-to-medium term catalyst-driven trades with a strict rule: upon achieving a specific modest gain, the vast majority of the position is sold to recoup 100% of the initial invested capital, leaving the remaining shares to run indefinitely as "house money." If the catalyst fails to materialize within a set timeframe, the entire position is liquidated.

**Motivation:**
The goal is to build up a stable of "winners" (long-term holds with a net-zero cost basis) while cutting "losers" where the predictive thesis was incorrect. It allows for capturing long-term upside without permanently tying up the initial capital, which is continuously recycled into new opportunities.

**Simulator Agent Implementation Details:**

1.  **Entry (Catalyst Identification):**
    *   **Trigger:** The agent identifies an upcoming catalyst expected to generate an 11.11% or greater gain within the next 6 months.
    *   **Execution:** Sell SGOV to raise cash and buy shares of the target stock.

2.  **Exit (The "Free Roll" GTC Order):**
    *   **Execution:** Immediately upon buying the shares, the agent places a GTC (Good 'Til Canceled) limit sell order for **90%** of the acquired shares at a price **11.11%** above the purchase price.
    *   *The Math:* Selling 90% of the position at an 11.11% gain recovers exactly 100% of the initial capital ($0.90 \times 1.1111 \approx 1.00$).

3.  **Time-Bound Liquidation (The 6-Month Rule):**
    *   **Trigger:** 6 months have passed since the initial purchase.
    *   **Condition:** The GTC limit order has *not* triggered (the catalyst failed or underperformed).
    *   **Action:** The agent cancels the GTC order and executes a market sell for the entire position, accepting the loss or subpar gain, and sweeps the cash back to SGOV.

4.  **Long-Term Hold (The "House Money"):**
    *   If the GTC order triggers within the 6-month window, the agent has fully recouped its initial capital. The remaining 10% of shares are kept in the portfolio indefinitely with no predefined exit strategy, letting the "winners run."

**References:**
*   Tharp, V. *Trade Your Way to Financial Freedom*. Discusses position sizing and the psychological and mathematical benefits of trading with "house money" after initial risk has been entirely removed from a trade.
