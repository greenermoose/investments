# Valuation & Pricing Framework (Fundamental + Technical)

This document defines the quantitative valuation metrics, fundamental quality screens, and technical indicators used to determine entry prices, target exit prices, and options strike selection.

## 1. 20-Year Compounding Mandate
- Annualized Target: Maximize probability of achieving >= 20% annualized return over 20 years.
- Failure Standard: Total annualized return < 20% over 20 years is defined as strategy failure.
- Empirical Foundation: Employs proven institutional strategies demonstrated to achieve 20%+ returns across multiple historical market cycles.

## 2. Core Fundamental Quality Screen
To qualify for portfolio inclusion and thesis authoring, a US exchange-listed company must meet:
1. Return on Invested Capital (ROIC): ROIC > 15% across 3-5 year averages, verifying structural competitive moat.
2. Free Cash Flow (FCF) Conversion: FCF / Net Income > 80%, ensuring high earnings quality and cash conversion.
3. Balance Sheet Strength: Net Debt / EBITDA < 2.5x (excluding financial institutions and utilities).
4. Organic Revenue Growth: Secular tailwind supporting durable multi-year top-line expansion.

## 3. Fundamental Valuation Methodologies
1. Multi-Horizon Revenue & Multiple Framework:
   - 13-Quarter bottom-up segment revenue modeling.
   - P/S and EV/Sales multiple normalization against 5-year historical medians and operating margin trajectory.
2. Discounted Cash Flow (DCF) - 2-Stage Model:
   - Stage 1 (Years 1-5): Detailed cash flow projections based on revenue path and operating leverage.
   - Stage 2 (Terminal Value): Perpetual growth rate of 2.5% to 3.0% with 9% to 11% WACC discount rate.
3. Margin of Safety:
   - Conservative 15% to 25% discount to calculated intrinsic fair value to establish the fundamental entry baseline.

## 4. Technical Indicators for Entry & Exit Determination
Fundamental valuation establishes *what* to buy and *fair value*; technical indicators optimize *when* and *at what exact price* to enter and exit:
1. Moving Average Structure:
   - 50-Day and 200-Day Simple Moving Averages (SMAs): Evaluates structural trend regime, golden/death crosses, and mean reversion levels.
2. Horizontal Support & Resistance Levels:
   - Identifies high-volume price congestion zones, multi-month consolidation floors (support for CSP strike placement and limit buys) and prior breakout peaks (resistance for Covered Call strikes and limit exits).
3. Momentum & Volatility Indicators:
   - Relative Strength Index (RSI, 14-period): Oversold levels (RSI < 35) confirm attractive risk-adjusted entry windows; overbought levels (RSI > 70) trigger covered call overlay or exit limit orders.
   - Bollinger Bands / ATR: Gauges volatility compression and expansion to calibrate option strikes and limit pricing.

## 5. Derivatives Execution Synthesis
- Cash-Secured Put Entry: Strike set at or below the intersection of fundamental Margin of Safety and key technical support (0.15 - 0.30 Delta, 30-45 DTE).
- Covered Call Exit: Strike set at or above fundamental fair value target and major technical resistance (0.20 - 0.35 Delta, 21-45 DTE).
- Strict Prohibition: No buying options and no naked options under any circumstances. All puts 100% cash-backed, all calls 100% share-backed.
