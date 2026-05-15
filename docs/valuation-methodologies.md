# Valuation Methodologies

Methods used to determine the fair value of a company.

---

## Method 1: Historical Price-to-Sales (P/S) Ratio Reversion

**Concept:**
This valuation method focuses on predicting future stock prices by estimating future revenue and shares outstanding, and then applying the company's historical Price-to-Sales (P/S) ratio range. It intentionally ignores harder-to-predict metrics like EBITDA or net income.

**Motivation:**
Top-line revenue and share count changes (issuance vs. buybacks) are often easier to project with a degree of accuracy than bottom-line earnings, which can be distorted by accounting maneuvers, one-time charges, or fluctuating profit margins. By comparing the current or forward P/S ratio against its historical norms, it provides a clear, simplified signal of whether the stock is trading at a premium or a discount.

**Implementation Details:**

1.  **Determine Historical P/S Range:**
    *   Analyze the company's historical P/S ratio over a relevant timeframe (e.g., 3, 5, or 10 years) to establish a "normal" trading range, identifying the typical highs (expensive) and lows (cheap).

2.  **Estimate Future Revenue:**
    *   Project the company's future sales based on growth trends, management guidance, or overall market conditions.

3.  **Estimate Shares Outstanding:**
    *   Determine the likely future share count. Evaluate whether the company is likely to issue more shares (dilution) or execute share buybacks (concentration). This is critical for calculating per-share metrics accurately.

4.  **Calculate Projected Price:**
    *   Using the projected revenue and estimated shares outstanding, apply the historical P/S multiples to estimate a range for the future stock price.
    *   *Formula:* `Projected Price = (Estimated Revenue / Estimated Shares Outstanding) * Target P/S Multiple`

5.  **Signal Generation:**
    *   **Cheap Signal:** If the current or forward P/S ratio falls below the historical lower bound of the range, it serves as a signal that the stock may be undervalued.
    *   **Expensive Signal:** If the current or forward P/S ratio rises above the historical upper bound of the range, it serves as a signal that the stock may be overvalued.

**References:**
*   Fisher, K. *Super Stocks*. Kenneth Fisher popularized the use of the Price-to-Sales ratio in this 1984 book. He argued that earnings are volatile and easily manipulated by accounting, whereas sales are stable. He used the P/S ratio to find undervalued "Super Companies" that were experiencing temporary earnings glitches but had strong underlying revenue generation.
*   O'Shaughnessy, J. *What Works on Wall Street*. Through extensive quantitative backtesting of decades of stock market history, O'Shaughnessy concluded that the Price-to-Sales ratio was the single most effective valuation metric, crowning it the "King of the Value Factors" for consistently identifying market-beating stocks.

---

## Method 2: Reverse Discounted Cash Flow (Reverse DCF)

**Concept:**
Traditional DCF models require estimating a company's exact future cash flows for the next 10 years and discounting them back to present value, which is highly subjective and error-prone. A Reverse DCF flips the equation: it takes the *current market price* of the stock and calculates exactly what future growth rate the market has currently priced in.

**Motivation:**
This methodology grounds valuation in reality by showing you the market's current expectations. Instead of asking "What is this stock worth?", it asks, "Can this company realistically achieve the growth rate implied by its current stock price?" If the market is pricing in 25% annual growth, but the industry average is 10%, it is a clear warning sign.

**Implementation Details:**
1.  Determine the company's current Free Cash Flow (FCF).
2.  Input the current stock price, outstanding shares, and a standard discount rate (e.g., 10%) into a Reverse DCF formula.
3.  Calculate the implied FCF growth rate required over the next 5-10 years to justify the current price.
4.  **Signal Generation:**
    *   **Cheap Signal:** If the implied growth rate is significantly lower than the company's historical growth or reasonable forward estimates, the stock may be undervalued.
    *   **Expensive Signal:** If the implied growth rate is absurdly high or mathematically impossible given the total addressable market, the stock is likely overvalued.

---

## Method 3: Historical Dividend Yield Reversion

**Concept:**
Similar to the P/S ratio reversion, this method analyzes a company's historical dividend yield range. For mature, stable, dividend-paying companies, the yield tends to fluctuate within a predictable band. 

**Motivation:**
This directly complements dividend capture and income-generation strategies. When a high-quality company faces short-term market panic, its stock price drops, causing its dividend yield to spike artificially high relative to its historical norm. This provides a tangible, income-based signal of mispricing.

**Implementation Details:**
1.  Analyze the company's dividend yield over the past 5-10 years to find the historical high (floor price) and historical low (ceiling price).
2.  Ensure the dividend itself is safe by checking the payout ratio and free cash flow coverage.
3.  **Signal Generation:**
    *   **Cheap Signal:** The current yield hits or exceeds the historical maximum yield band (e.g., historical yield is 2-4%, current is 4.5%).
    *   **Expensive Signal:** The current yield drops to or below the historical minimum yield band (e.g., current yield drops to 1.5%).

---

## Method 4: Price-to-Earnings-to-Growth (PEG) Ratio

**Concept:**
Popularized by Peter Lynch, the PEG ratio contextualizes the traditional Price-to-Earnings (P/E) ratio by dividing it by the company's expected earnings growth rate. 

**Motivation:**
A P/E ratio alone is useless for high-growth companies. A stock with a P/E of 40 might look too expensive to touch, but if its earnings are growing at 50% a year, it is actually undervalued relative to its growth. The PEG ratio prevents missing out on momentum "winners" simply because their standard multiples look inflated.

**Implementation Details:**
1.  Calculate or identify the current or forward P/E ratio.
2.  Estimate the expected annual EPS growth rate for the next 3-5 years.
3.  *Formula:* `PEG Ratio = P/E Ratio / Expected Earnings Growth Rate`
4.  **Signal Generation:**
    *   **Cheap Signal:** A PEG ratio below 1.0 generally indicates the stock is undervalued relative to its growth rate.
    *   **Expensive Signal:** A PEG ratio significantly above 1.5 or 2.0 suggests the stock's price has outpaced its realistic growth trajectory.

---

## Method 5: Enterprise Value to Free Cash Flow (EV/FCF)

**Concept:**
This method compares the total cost of acquiring the entire business (Enterprise Value) to the actual hard cash the business generates annually (Free Cash Flow), bypassing accounting "earnings" entirely.

**Motivation:**
Net Income (the "E" in P/E) includes non-cash charges and can be heavily manipulated by management. Free Cash Flow is much harder to fake. Furthermore, Market Cap ignores debt. Enterprise Value (Market Cap + Total Debt - Cash) shows the *true* price tag. EV/FCF is the cleanest metric for evaluating cash generation relative to the total cost of ownership.

**Implementation Details:**
1.  Calculate Enterprise Value (Market Cap + Debt - Cash and Cash Equivalents).
2.  Calculate Free Cash Flow (Operating Cash Flow - Capital Expenditures).
3.  *Formula:* `EV/FCF = Enterprise Value / Free Cash Flow`
4.  **Signal Generation:**
    *   **Cheap Signal:** A low EV/FCF ratio (e.g., under 15, depending on industry) indicates the company is generating significant cash relative to its true valuation, often signaling a "cash cow" or undervalued asset.
    *   **Expensive Signal:** A very high EV/FCF ratio indicates the business is expensive relative to the actual cash it produces, regardless of what its accounting earnings claim.