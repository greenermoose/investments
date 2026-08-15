# Valuation Framework & Fundamental Screening

This document defines the fundamental valuation metrics, quality hurdles, and price target methodologies used by the Universe Screener and Thesis & Memory agents.

## Core Quality Screen Criteria
To be eligible for portfolio inclusion, a company should satisfy the following criteria:
1. Return on Invested Capital (ROIC): ROIC > 15% across a 3-5 year average, demonstrating a competitive moat.
2. Free Cash Flow (FCF) Conversion: FCF / Net Income > 80%, ensuring genuine cash generation.
3. Balance Sheet Health: Net Debt / EBITDA < 2.5x (excluding financial services / utilities).
4. Revenue Growth: Secular tailwind supporting > 7% organic annualized revenue growth.

## Valuation Methodologies

### 1. Discounted Cash Flow (DCF) - 2-Stage Model
- Stage 1 (Years 1-5): Detailed free cash flow projection based on revenue growth and operating margins.
- Stage 2 (Terminal Value): Perpetual growth rate of 2.5% to 3.0% (in line with long-term GDP growth).
- Discount Rate (WACC): Minimum 9% to 11% hurdle rate depending on company beta and capital structure.

### 2. Owner Earnings Yield
- Owner Earnings = Net Income + Depreciation/Amortization - Maintenance CapEx.
- Fair Value Target: Company trading at an Owner Earnings Yield > Risk-Free Rate + 300 bps equity risk premium.

### 3. Margin of Safety & Target Entry
- Margin of Safety: 15% to 25% discount to calculated intrinsic fair value.
- Entry Trigger: Sell Cash-Secured Puts at strikes equal to or below the Margin of Safety entry price.
