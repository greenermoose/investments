# Literature Review: Trading Strategies Analysis

This document summarizes financial literature, expert opinions, and backtesting analyses regarding the six trading strategies proposed for the market simulator.

## 1. Scale Trading & Active Legging (Strategies 1 & 3)
*Also known as: Interval Trading, Scaling In/Out, Averaging Down.*

**What the Literature Says:**
Scaling into a position (buying in tranches as the price falls) is a highly debated topic.
*   **The Quantitative View:** Algorithmic and execution literature supports scaling as a way to minimize market impact and achieve a "Volume Weighted Average Price" (VWAP). It mathematically lowers the cost basis compared to a single lump-sum purchase if the asset continues to drop.
*   **Expert Criticism (The "Falling Knife"):** Trading psychology experts (like Mark Minervini and Edwin Lefèvre) heavily criticize scaling into losing positions on *individual equities*. The classic adage "never average a loser" applies here. Because individual companies can go bankrupt, scaling down can result in maximum capital allocation to a failing asset. 
*   **Consensus:** Literature suggests scale trading is effective for broad index ETFs (where bankruptcy risk is zero), but extremely risky for individual stocks unless backed by infallible fundamental analysis.

## 2. The Options Wheel (Strategy 2)
*Also known as: Systematic Cash-Secured Puts, Buy-Write, Covered Call Cycles.*

**What the Literature Says:**
The Wheel is arguably the most popular retail options strategy, widely researched by platforms like QuantConnect and analyzed in academic papers on "systematic short put writing."
*   **Performance Expectations:** Backtests generally show the Wheel generating 12–25% annual returns in range-bound or moderately bullish markets. It often produces better *risk-adjusted* returns (Sharpe ratio) than the S&P 500 due to the lowered volatility from premium collection.
*   **The "Hidden Drawdown" Risk:** Critics (such as Early Retirement Now) point out that the strategy's risk profile is identical to a naked put. The fatal flaw occurs when a trader is assigned a "stinker" stock that crashes 50%. The trader is left holding a massive capital loss while trying to sell covered calls for pennies, drastically underperforming buy-and-hold.
*   **Consensus:** Stock selection is paramount. The strategy only works if you are fundamentally happy holding the underlying asset for years if necessary.

## 3. Floor-to-Ceiling Premium Farming & Rolling (Strategy 4)
*Also known as: Covered Call Rolling, Option Defense Mechanics.*

**What the Literature Says:**
This strategy involves capping upside potential in exchange for steady income, actively defending the shares by rolling options.
*   **Bull Market Underperformance:** Academic literature consistently shows that systematic covered call writing underperforms a simple buy-and-hold strategy during strong bull markets. You end up giving away the best days of your best stocks.
*   **Mechanics of Rolling:** Brokerage literature (Schwab, tastylive) supports rolling for a net credit as a sound mechanical defense. However, experts note that rolling up and out on a surging stock often means locking up capital for months with very low annualized returns on the rolled trade.

## 4. The "Double Dip" (Strategy 5)
*Also known as: Dividend Capture, Buy-Write Dividend Stripping.*

**What the Literature Says:**
Combining dividend capture with covered calls is frequently pitched as a "double income" hack, but financial literature highlights significant structural headwinds.
*   **Efficient Market Pricing:** Options pricing models (like Black-Scholes) strictly account for dividends. Because the stock price mathematically drops on the ex-dividend date, the call option premium you sell is usually reduced proportionally. There is no "free lunch."
*   **Early Assignment Risk:** Options Clearing Corporation (OCC) data shows a massive spike in early assignments right before an ex-dividend date. If your short call is In-The-Money (ITM), the buyer will likely exercise it early to steal the dividend from you. You lose the dividend and your shares are called away, defeating the purpose of the capture.
*   **Consensus:** Highly difficult to execute profitably in an efficient market due to early assignment risks and adjusted option pricing.

## 5. Short-Term Channel Swing / Mean Reversion (Strategy 6)
*Also known as: Bollinger Band Bounce, RSI Oversold/Overbought Trading.*

**What the Literature Says:**
Mean reversion is a classic quantitative strategy relying on the statistical tendency of prices to return to their historical average.
*   **The "Whipsaw" Danger:** Technical analysis literature (including John Bollinger's own writings) warns that bands are not absolute walls. In a strong trending market (a sudden crash or a breakout), the stock will "ride the band." Traders attempting to buy the bottom band during a fundamental crash will be repeatedly stopped out or left holding heavy losses.
*   **Consensus:** Highly effective in sideways, low-volatility markets. Catastrophic in high-volatility, trending markets. It requires strict stop-losses.
