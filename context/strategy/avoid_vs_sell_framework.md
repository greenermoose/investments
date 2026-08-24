# Avoid vs. Sell Framework: Taxonomy of Value Traps vs. Capital Reallocation

This document establishes the institutional doctrine, theoretical foundation, and operational criteria governing the distinction between `AVOID` and `SELL` within the Agentic Investment Advisor system.

## Executive Purpose & Token Economics

Our core mandate requires maximizing the probability of achieving a 20% or higher annualized return over a 20-year horizon across US public equities, while managing downside risk.

Authoring an institutional-grade investment thesis dossier requires substantial token expenditure and compute:
- 13-Quarter bottom-up revenue projections ($Q_0$ to $Q_{12}$) linked to catalyst milestones
- 6-Horizon diluted share count forecasts (13, 26, 39, 52, 104, 156 weeks) modeling buyback pace and SBC dilution
- 4-Horizon Bear/Base/Bull valuation price bands
- Forensic SEC EDGAR footnote audits (pensions, litigation, environmental liabilities, take-or-pay contracts)
- Options strike modeling (Delta, AROC, premium yields)

Expending deep analysis tokens on structurally impaired businesses, chronic cash burners, or secularly declining value traps produces negative return on investment in tokens and time. 

To maximize operational efficiency and capital preservation, the system establishes a clean conceptual and operational divide between:
1. **`AVOID`**: A universe-level screening gate and capital defense filter designed to freeze deep compute and exclude uninvestable businesses.
2. **`SELL`**: A portfolio-level capital reallocation and disposition mandate designed to harvest gains, manage downside multiple compression, or exit positions that no longer meet our 20%+ compounding hurdle.

## Fundamental Distinction: `AVOID` vs. `SELL`

| Dimension | `AVOID` | `SELL` |
| :--- | :--- | :--- |
| **Primary Subsystem Role** | Universe screening gate & compute defense filter | Portfolio disposition & capital reallocation mandate |
| **Actionable Mandate** | Do not own, do not sell cash-secured puts, and freeze deep 13Q/6-horizon modeling | Liquidate shares, roll covered calls in-the-money, and reallocate dry powder |
| **Underlying Business Quality** | Structurally broken, unviable unit economics, chronic dilution, or insolvency risk | High or solid business quality whose valuation has outrun intrinsic compounding capacity |
| **Valuation Multiple Sensitivity** | Uninvestable regardless of how cheap the multiple appears (classic value trap) | Temporarily overvalued (expected 3-year CAGR < 10%); attractive again upon multiple contraction |
| **Token Investment Policy** | Lightweight triage metadata card only (~500–1,500 tokens) | Full institutional dossier maintenance to optimize exit timing and covered call strikes |
| **Re-evaluation Vector** | Requires fundamental structural turnaround or balance sheet repair to unlock | Automatically re-enters BUY/HOLD evaluation as price mean-reverts toward fair value |

## Detailed Hallmarks of an `AVOID` Company

An equity is classified as `AVOID` when it exhibits structural flaws that make multi-year compounding virtually impossible, destroying shareholder capital through operational burn, dilution, or technological obsolescence.

### 1. Secular Disruption & Irreversible TAM Decay
- The company operates in a legacy industry undergoing secular contraction (e.g. legacy print media, linear cable television networks, combustion engine component suppliers without EV transition, declining physical retail).
- Core product lines suffer irreversible customer churn and volume contraction that cannot be compensated by price increases.

### 2. Broken Unit Economics & Structural Unprofitability
- Negative gross margins or gross margins persistently below industry viable floors (<15-20%), indicating the company loses money on every incremental unit sold.
- Customer Acquisition Cost (CAC) structurally exceeds Customer Lifetime Value (LTV), requiring continuous marketing subsidies to generate artificial top-line growth.

### 3. Solvency Distress & Chronic Liquidity Drain
- Less than 12 months of liquid cash and cash equivalents relative to trailing 12-month operational cash burn, without committed credit facilities or non-dilutive financing.
- Excessive balance sheet leverage: Net Debt to EBITDA > 5.0x or Debt-to-Equity > 4.0x in a non-utility or capital-intensive sector.
- Disclosures of debt covenant compliance risk, credit rating downgrades to deep junk (Caa/CCC), or auditor explanatory paragraphs regarding substantial doubt as a going concern in SEC Form 10-K/10-Q filings.

### 4. Hyper-Dilution & Executive Extraction Flywheels
- Diluted shares outstanding expanding at > 3% to 5% annually over trailing 8 quarters, driven by excessive stock-based compensation (SBC) or recurring secondary offerings to fund operating losses.
- Management teams that treat common equity as a funding mechanism to enrich insiders while per-share intrinsic value is continuously diluted.

### 5. Moat Destruction & Pricing Commoditization
- Complete absence of durable competitive advantages: zero switching costs, zero network effects, lack of proprietary IP, and inability to raise prices without triggering customer defection.
- Return on Invested Capital (ROIC) persistently below the Weighted Average Cost of Capital (WACC), destroying economic value with every dollar of reinvested capital.

### 6. Forensic, Regulatory & Toxic Liabilities Red Flags
- Material weaknesses in internal controls over financial reporting, restatements of historical financials, or ongoing SEC enforcement investigations regarding accounting fraud or revenue recognition irregularities.
- Unquantifiable toxic off-balance sheet liabilities (e.g. massive PFAS contamination cleanup, multi-district mass-tort product liability litigations, or unhedged defined-benefit pension deficits) that threaten total equity value.

## Detailed Hallmarks of a `SELL` Company

An equity is classified as `SELL` not because the underlying business is inherently defective, but because market price dynamics, valuation multiples, or portfolio opportunity costs dictate capital liquidation and redeployment.

### 1. Valuation Multiple Exhaustion on High-Quality Businesses
- A fundamentally elite company (wide moat, ROIC > 25%, positive FCF) whose stock price has appreciated to extreme valuation multiples (e.g. Price-to-Sales at 95th historical percentile).
- Projected 3-year annualized CAGR drops below 10.0% (and often below risk-free SGOV cash yield), indicating multiple compression will negate business compounding.

### 2. Catalyst Realization & Peak Operating Leverage
- The core multi-year catalyst (e.g. major cloud platform launch, regulatory drug approval, major chip architecture ramp) has fully materialized and been absorbed into consensus expectations.
- Operating margins and revenue growth rates have reached cyclical peak levels, leaving no upside surprise potential.

### 3. Execution Invalidation for Active Portfolio Holdings
- An existing portfolio holding experiences a thesis breach (e.g. 2 consecutive quarters of margin deceleration below modeled floors, cancellation of a flagship catalyst, or unexpected dilutive acquisition).
- The Memory Agent issues a formal invalidation alert, requiring the Lead Portfolio Manager to execute a disciplined exit rather than rationalizing continued ownership.

### 4. Opportunity Cost & Capital Rotation
- In a concentrated portfolio targeting >= 20% annualized return, capital tied up in a 5%–8% CAGR position represents an opportunity cost when high-conviction 20%+ CAGR `BUY` candidates are available.
- Capital is liquidated via Monday limit orders or covered calls to fund higher-conviction Accumulation opportunities.

## Operational Guidance for Multi-Agent System

1. **Equity Research Agent**: Focuses on high-conviction discovery. Pre-screens candidate tickers against the `AVOID` triage criteria. If a candidate triggers `AVOID` red flags, it is cataloged in the Avoid Registry without triggering expensive deep research.
2. **Investment Thesis Agent**: Focuses deep 13-quarter, 6-horizon, and 4-horizon modeling exclusively on `QUALIFIED_CANDIDATE` equities. When authoring dossiers, `AVOID` ratings are populated via lightweight triage templates, while full quantitative forecasting is applied to `BUY`, `HOLD`, and `SELL`.
3. **Memory Agent**: Tracks de-listing triggers for `AVOID` equities and invalidation exit triggers for active `HOLD`/`BUY` positions transitioning to `SELL`.
4. **Lead Portfolio Manager Agent**: Enforces strict execution isolation: `AVOID` tickers are never included in trade orders or cash-secured put candidates; `SELL` tickers receive concrete single-session limit sell orders or aggressive ITM covered call exit structures.
