# Discussions of investing strategies and ideas

## Covered Calls & Rigorous Valuation Framework (May 2026)

### Core Strategy & Philosophy
* **The Goal**: Achieve a 20% annualized ROI.
* **The Philosophy**: Selling covered calls is effectively "generating current income from future theoretical income."
* **The Prerequisite**: The entire strategy rests on the foundational skill of identifying companies with genuine growth potential. If the underlying stock fails to grow (or declines), call premiums will not be enough to offset capital losses. Therefore, stock picking is the critical point of leverage.

### Upgrading Valuation Methodology
To improve stock selection, the approach to valuation needs to become more rigorous and less dependent on third-party aggregators (which often have stale or adjusted data). The plan involves two main pillars:

1. **Direct SEC Filing Analysis (Primary Sources)**
   * Move away from providers like Yahoo Finance.
   * Focus on extracting raw data directly from 10-Ks and 10-Qs to ensure exactness.
   * This is particularly important for accurately calculating metrics like **Price-to-Sales (P/S)** by using precise, fully diluted share counts (to account for stock-based compensation) and exact Trailing Twelve Months (TTM) revenue.

2. **Low-Guesswork Metrics Framework**
   * Incorporate robust financial metrics that are difficult to manipulate with accounting tricks and do not require heavy assumptions about the distant future (like complex DCF models do).
   * Potential metrics to include: Free Cash Flow (FCF) Yield, Return on Invested Capital (ROIC), and Gross Margin trends.

### Technical Implementation Plan
* **Automation**: Write code (assisted by AI) to automate the ingestion of SEC EDGAR filings.
* **Database Tracking**: Build a custom database to log these metrics longitudinally over time.
* **Comparative Analysis**: Track not just target companies, but also their industry peers to establish historical baseline valuations and identify relative undervaluation.

### Trading Skill & Cash Management
* **The Problem**: A lack of patience leading to buying before stocks are truly "on sale," and not sizing up heavily enough when extraordinary opportunities present themselves.
* **The "Powder" Dilemma**: How to manage uninvested capital to maximize returns:
  * *Option A (Two-Tier)*: Keep "damp powder" for normal dips/corrections, and "dry powder" strictly reserved for "screaming buy" market dislocations.
  * *Option B (Strict)*: Avoid damp powder entirely and only deploy capital when prices hit absolute rock-bottom, "screaming buy" levels.
* **The Risk of Option B (Cash Drag)**: Waiting exclusively for generational "screaming buys" can result in years of holding cash. Because markets generally trend upward, a 30% crash three years from now might still result in a stock price *higher* than today's current price. This "cash drag" can severely underperform consistent investing.
* **Potential Solutions**:
  * **Systematic Scaling (Kelly Criterion-style)**: Size bets based on the degree of undervaluation. Small bites on normal dips, massive sizing on extreme dislocations.
  * **Monetizing the Wait**: Use the "damp powder" to sell Cash-Secured Puts at those "screaming buy" strike prices. You get paid to wait, and if the crash happens, you automatically buy at your dream price.

### Execution Psychology & Conviction
* **The "Screaming Buy" Failure Point**: Successfully identifying a great company, but failing to size up the position adequately when the stock reaches extreme discount territory. 
* **Root Causes**:
  1. **Lack of Awareness**: Simply not noticing the stock has entered the buy zone. 
     * *Solution*: Implement strict, automated price alerts for the entire watchlist.
  2. **Lack of Conviction (Fear)**: When a stock is down 30-40%, the news is usually terrible. It requires immense psychological fortitude to buy when everyone else is panicking. 
* **The "Fundamental vs. Irrational" Check**: Before deploying heavy dry powder, there must be a rapid, systematic check to ask: *Did the fundamental thesis break, or is this just irrational market overselling?* If the valuation model still holds, you must execute the trade.

### Exit Strategy & Velocity of Money
* **The Problem**: Failing to sell and lock in profits often enough. Holding onto winners for too long without realizing the gains, thereby trapping capital that could be redeployed.
* **The "10% in 90 Days" Target**: Rather than aiming for massive, multi-year multi-bagger returns on every trade, focusing on the *velocity of money*. Achieving a 10% return every 90 days aggressively compounds to easily crush a 20% annual ROI target.
* **The Covered Call Synergy**: This exit strategy pairs perfectly with the Covered Call strategy. By buying a stock at a "screaming buy" level and immediately selling a 90-day covered call at a strike price 10% above the entry, the exit is entirely automated. 
  * If the stock rebounds 10%, the shares are called away, locking in the 10% capital gain *plus* the option premium.
  * If it doesn't hit 10%, the premium is kept as income, and another call can be written, continually lowering the cost basis.
* **Managing the "Long Tail" Upside**: Selling calls means capping potential upside, but the statistical probability of a massive, unexpected surge is small. 
  * If a surge *does* happen, the position can be defended with a **diagonal roll** for a net credit.
  * Even if the shares are ultimately called away, the capital is freed to wait for the next "screaming buy" opportunity elsewhere. You do not need to capture every single 100% "long tail" runner to achieve a 20% annualized ROI. Consistency and velocity matter more than holding out for lottery tickets.

### Portfolio-Level ROI & "Equity Drag"
* **The Reality of 20% Returns**: Most individual stocks do not natively appreciate by 20% year over year. A "buy and hold" strategy on a static portfolio will mathematically struggle to hit this aggressive target on a consistent basis.
* **The Danger of Equity Drag**: Just as holding too much cash creates "cash drag," holding stocks that are stagnant or depreciating creates "equity drag." This dead weight pulls down the overall portfolio ROI.
* **The Solution**: To hit a 20% portfolio-level ROI, active management is required in two forms:
  1. **Aggressive Call Selling**: Continually generating yield on the stagnant or slowly appreciating positions to manufacture the 20% return synthetically. 
  2. **Ruthless Rotation**: Systematically cutting loose the underperformers or stagnant assets and rotating that capital into new "screaming buy" opportunities. Capital cannot be allowed to sit idle in "dead money" positions if the 20% target is to be met.

### Blind Spots & Long-Term Risks (The 20-Year Horizon)
To sustain a 20% annualized ROI over two decades, the framework needs to address these potential failure points:

1. **Tax Advantage (The Roth IRA Superpower)**: Because this strategy is executed entirely within a Roth IRA, tax drag is completely neutralized. The "10% in 90 Days" high-velocity trading and option premium generation would normally be crushed by short-term capital gains taxes in a taxable account. By using a Roth IRA, 100% of the gross 20% ROI is retained, giving this strategy a massive structural compounding advantage.
2. **Bear Market Resilience & The Math of Micro-Gains**: A traditional "bear market" is defined as a 20% or greater decline in broad market indices (like the S&P 500), often lasting months or years. However, this macro definition is largely irrelevant to a strategy focused on the best 25 US public companies using high-velocity trading. 
   * **The Improbability of Absolute Stagnation**: It is statistically unlikely for the 25 best companies in the US to experience zero short-term upward price action for an extended period. Even in the worst macro environments, earnings reports, sector rotations, and oversold bounces create localized rallies.
   * **The Attainability of 20%**: When broken down, a 20% annual ROI does not require heroic 100% stock runners. Mathematically, 20% a year is roughly **1.53% per month** or **~0.35% per week**. 
   * **The Velocity Advantage**: If the strategy successfully captures a 10% gain in 90 days on a position (which equates to a ~46% annualized return), you only need that to happen on roughly half the portfolio to hit your overall 20% target. By focusing entirely on manufacturing these micro-gains (via 1-3% option premiums and 5-10% oversold bounces), the overarching macroeconomic "bear market" ceases to be a threat and instead becomes a volatility-generating asset.
3. **Position Sizing & Extreme Risk Tolerance**: Because this specific Roth IRA represents only a small fraction of a much larger, diversified macro-portfolio (real estate, taxable brokerages, cash, etc.), there is no maximum allocation limit. If conviction is high enough, **putting 100% of this account into a single "screaming buy" is acceptable**. 
4. **The 27-Bucket Conviction Framework**: Position sizing and "ruthless rotation" are dictated entirely by comparative expected ROI and conviction. The portfolio is structured into 27 dynamic buckets:
   * **Bucket 1: SGOV (The Baseline)** - Cash equivalent generating ~4% risk-free.
   * **Buckets 2-26: Current Holdings** - The 25 active stock positions, each assigned a mathematically modeled *Expected Annualized ROI* (based on covered call yields) and a *Certainty Value* over a specific time horizon.
   * **Bucket 27: The Screaming Buy** - The single best current opportunity on the market.
   * **The Rotation Rule**: Whenever Bucket 27's Expected ROI and Certainty exceed those of Buckets 1-26, the lowest-performing buckets are immediately liquidated (at market price) to fund the Screaming Buy. Capital always flows to the highest-conviction, highest-ROI bucket.
5. **The 90-Day Time-Stop**: In addition to comparative rotation, a strict time-stop enforces capital velocity. If a stock does not reach its target exit price (e.g., a 10% gain) within 90 days, the capital is forcefully rotated out to prevent "equity drag," regardless of underlying fundamentals.
6. **The Small Cap Illiquidity Premium**: While conventional wisdom suggests avoiding illiquid options due to wide bid/ask spreads, practical experience shows this can actually be an advantage. Because the underlying assets are often "hard to borrow" and option supply is tight, setting strict limit orders forces anxious buyers to meet the asking price. By acting as a liquidity provider in an illiquid market, we can capture an "illiquidity premium," making small caps a highly viable and lucrative part of the strategy.

### Real-World Feasibility & The Structural Advantage of Scale
* **The Buffett 50% Guarantee**: When assessing the real-world feasibility of a 20% annualized ROI, it is critical to recognize the "structural advantage" of managing a small portfolio. 
  * *The Exact Quote*: "If I was running $1 million today... I think I could make you 50% a year on $1 million. No, I know I could. I guarantee that."
* **Deconstructing the Guarantee**: Does Buffett actually believe this? Yes, absolutely. He is not theorizing; he actually achieved these exact numbers in the 1950s when managing his first small partnerships. The professional value investing community (including Charlie Munger and Joel Greenblatt, who achieved 50% annualized for a decade at Gotham Capital) widely agrees. This outsized return is possible due to:
  1. **The Institutional Size Penalty**: A $100B mutual fund cannot invest in a $50M market cap company. Even if the stock doubles, it adds a fraction of a percent to the fund's overall return. Therefore, institutional money completely ignores small-cap and micro-cap markets. This leaves the field wide open for retail investors to find massive, un-arbitraged mispricings.
  2. **Agility and Liquidity**: A small portfolio can slip in and out of a position invisibly. A massive fund takes weeks to build or exit a position, destroying their own entry/exit prices in the process.
  3. **Special Situations**: Spin-offs, liquidations, and forced algorithmic selling often create extreme, short-term pricing dislocations. These opportunities are too small for whales to exploit, leaving the alpha entirely on the table for retail traders.
* **Synthesizing with Existing Strategies**: Reviewing the existing `trading-strategies.md`, there is room to blend the Covered Call strategy with Strategy 8 ("Stable of Winners"). If a stock hits the "screaming buy" and rebounds 10%, Covered Calls could be sold against only 90% of the shares. If called away, the mathematical 20% portfolio ROI is locked in, but the 10% remnant is retained as a free "moonshot" ticket to capture the long-tail upside without risking the core compounding engine.

### The Compounding Math & Real-World Methodologies
* **The 20-Year Horizon**: A 20% annualized return over two decades within a tax-free Roth IRA will achieve the investment objective. 
  * **Starting Capital**: $200,000
  * **Annualized Return**: 20%
  * **Time Horizon**: 20 Years
  * **Final Value**: **$7,667,520**
  * *Note*: This assumes zero additional contributions over the 20 years. If the Roth IRA is fully funded each year, the final number is significantly higher. This turns a modest retirement account into a multi-generational wealth engine.
* **Proven Real-World Methodologies**: Are there specific, documented strategies that have actually achieved >20% returns with small portfolios? Yes, and they align with the framework we have designed:
  1. **Joel Greenblatt's "Magic Formula"**: Greenblatt managed Gotham Capital and achieved a **50% annualized return** for a decade. His methodology was brutally simple: rank companies by only two metrics—**Return on Invested Capital (ROIC)** and **Earnings Yield**. He bought "good companies at bargain prices." This perfectly mirrors our "Low-Guesswork Metrics" strategy.
  2. **Peter Lynch's Growth at a Reasonable Price (GARP)**: Managing the Magellan Fund, Lynch achieved a **29.2% annualized return** over 13 years. His strategy relied heavily on finding small or mid-cap companies with strong balance sheets and high growth rates *before* Wall Street analysts noticed them. 
  3. **Tobias Carlisle's "Acquirer's Multiple"**: Carlisle's deep value strategy focuses on Enterprise Value to Operating Earnings (EV/EBIT). By systematically buying the most irrationally beaten-down stocks (the "screaming buys") and ruthlessly rotating them when they revert to the mean, backtests and real-world funds have demonstrated long-term returns well above the 20% threshold.