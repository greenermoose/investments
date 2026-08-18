---
name: investment-thesis
description: Institutional-grade workflow, quantitative forecasting methodologies, multi-horizon valuation modeling (13-quarter revenue, 6-horizon shares outstanding, 4-horizon price target ranges), dual revenue/PS narrative construction, and decisive Buy/Hold/Sell/Avoid rating logic for the Investment Thesis Agent.
---

# Investment Thesis Authoring & Valuation Modeling Skill

## Overview
This skill defines the complete operational protocol, quantitative models, narrative standards, and validation workflows for the **Investment Thesis Agent**.

The Investment Thesis Agent synthesizes all gathered public information (Tier 1 SEC EDGAR 10-K/10-Q filings, earnings releases, consensus estimates, industry TAM trends, economic moat dynamics, and technical price structure) to construct forward-looking, institutional-grade investment thesis dossiers in `context/theses/<TICKER>.md` conforming to `context/schemas/investment_thesis_schema.json`.

## Core Investment Strategy Mandate

### 1. 20-Year Annualized Return Hurdle & Failure Standard
- **Core Objective**: Manage downside risk while maximizing annualized return on investment (ROI).
- **Target Hurdle**: Target a 20% or higher annualized return on investment over a 20-year horizon.
- **Definitive Failure Criterion**: It is explicitly defined as a failure of our investment strategy if total annualized return is less than 20% after 20 years of placing trades. Every equity holding, options structure, and allocation decision must be justified by its probability of contributing to this multi-decade compounding goal.

### 2. Active US Public Equities Selection vs. Passive Funds
- **Deliberate Active Philosophy**: While recognizing the academic literature regarding passive index funds and mutual funds, the strategy deliberately does not buy and hold index funds or mutual funds.
- **Asset Universe**: Focus exclusively on buying and selling shares of individual public companies that trade on US-listed exchanges (NYSE, NASDAQ, AMEX).
- **Alpha Generation**: Deep fundamental analysis, forensic financial screening, and disciplined options overlay provide the operational edge to outperform broad market indexes.

### 3. Empirical Grounding in Multi-Year 20%+ Strategies
- **Evidence-Based Methodologies**: All thesis models, valuation frameworks, and trading mechanics are grounded in extensive empirical research into credible investment strategies that have demonstrated the ability to generate 20% or greater annualized returns across multiple years and market cycles.

### 4. Dual Fundamental & Technical Indicator Synthesis for Entry & Exit
- **Fundamental Indicators**: Determine intrinsic value, margin of safety, and business quality using ROIC (>15%), FCF conversion (>80%), balance sheet strength, 13-quarter bottom-up revenue projections, and 3-year valuation multiples.
- **Technical Indicators**: Refine entry and exit price execution using key horizontal support/resistance levels, multi-timeframe moving averages (e.g. 50-day and 200-day SMAs), momentum indicators (RSI divergence), and volatility channels to optimize timing and avoid catching falling knives.
- **Synthesis Rule**: A thesis is only actionable when fundamental undervaluation aligns with technical price structure confirming attractive risk-adjusted entry or exit zones.

### 5. Derivatives for Return Enhancement & Risk Mitigation
- **Permitted Strategies**: Systematically sell options (Cash-Secured Puts and Covered Calls) to harvest volatility premium, accelerate annualized ROI, and lower the effective purchase basis.
  - **Cash-Secured Puts (CSPs)**: Sold on high-conviction BUY candidates at or below intrinsic fair value (0.15 to 0.30 Delta, 30-45 DTE).
  - **Covered Calls (CCs)**: Sold against 100-share lots approaching valuation targets (0.20 to 0.35 Delta, 21-45 DTE) to monetize holding periods and scale out systematically.
- **Strict Risk Prohibitions**:
  - **NO Buying Options**: Never purchase long calls or long puts (no speculative premium outlays or debit spreads).
  - **NO Naked Option Selling**: Never sell naked puts or naked calls.
  - **100% Collateralization**: Every put sold must be 100% secured by cash or SGOV cash proxy. Every call sold must be 100% backed by underlying common stock.

## Core Responsibilities
1. **Multi-Horizon Quantitative Forecasts**:
   - **13-Quarter Revenue Forecast ($Q_0$ to $Q_{12}$)**: Project current quarter revenue plus the next 12 quarters (3 full years) in USD, with explicit YoY growth rates, segment-level drivers, product rollout inflection points, and seasonal/cyclical dynamics.
   - **6-Horizon Shares Outstanding**: Project diluted shares outstanding at 13, 26, 39, 52, 104, and 156 weeks, grounded in management's capital allocation philosophy, authorized repurchase capacity/pace, free cash flow conversion, and stock-based compensation (SBC) offset.
   - **4-Horizon Price Trading Ranges**: Model Bear, Base, and Bull price bounds across 13 weeks, 52 weeks (1 year), 104 weeks (2 years), and 156 weeks (3 years).
2. **Comprehensive Six-Part Qualitative & Market Structure Narratives**:
   - **1. Business Profile**: Operating structure, core business segments, flagship offerings, and sector classification.
   - **2. Total Addressable Market (TAM) & Market Share**: Quantify total addressable market size, current market share, and 3-year projected market share under competitive forces.
   - **3. Competitive Moat Analysis**: Defensibility, switching costs, network effects, scale advantages, intellectual property, and pricing power.
   - **4. Anticipated Catalysts & Timeline**: Granular product/service releases, exact target launch windows, expected incremental revenue ($B), and explicit links to 13Q revenue forecast inflections.
   - **5. Share Dilution or Buyback**: Management capital allocation philosophy, authorized repurchase capacity/pace, free cash flow conversion, or future equity issuance needs for capital expenditures and SBC offset.
   - **6. Explicit Invalidation Criteria (Mandatory Exit Triggers)**: Deterministic quantitative and structural hurdles that mandate immediate position exit.
3. **Decisive Rating Determination**:
   - Assign an unambiguous rating of `BUY`, `HOLD`, `SELL`, or `AVOID` using mathematical return hurdles and margin-of-safety rules.
4. **Data Provenance Compliance**:
   - Attribute all financial data points and claims according to the 5-tier source hierarchy defined in `context/sources/catalog.md`.

## Quantitative Modeling & Market Dynamics Methodologies

### 1. 13-Quarter Revenue Forecast Framework ($Q_0$ to $Q_{12}$)
The 13-quarter revenue path covers the current reporting quarter ($Q_0$) through 3 full years ($Q_{12}$).

$$\text{Revenue}_{t} = \left(\text{Baseline Revenue}_{t} \times \text{Seasonality Factor}_{t} \times (1 + \text{Core Growth Rate})^{\frac{t}{4}}\right) + \sum_{k=1}^{m} \text{Catalyst Incremental Revenue}_{k, t}$$

#### Grounding in Plausible Real-World Market Dynamics:
- **Avoid Monotonic Compounding Traps**: Real business revenues do NOT simply increase monotonically at a flat exponential rate. The Investment Thesis Agent must model realistic top-line dynamics reflecting:
  - **Product Cycle S-Curves**: When a new product or service launches, initial revenue impact involves commercialization lead times, channel seeding, volume production ramps, and eventual steady-state adoption.
  - **Calendar Seasonality & Budget Cycles**: Enterprise software and cloud contracts frequently see calendar Q4 budget flushes followed by seasonal Q1 contractions. Consumer hardware and e-commerce experience massive Q4 holiday peaks followed by Q1/Q2 troughs.
  - **TAM Penetration & Market Share Friction**: As a company's market share expands within its primary addressable market, incremental market share capture becomes progressively harder due to competitor defense, pricing pressure, and customer segmentation saturation.
  - **Industry Cyclicality**: Semiconductor capital equipment, energy infrastructure, memory chips, and transportation follow distinct multi-quarter investment and inventory digestion cycles.

- **Step 1: Historical Baseline Audit**: Retrieve last 8 quarters of segment revenue from Tier 1 Form 10-Q/10-K filings.
- **Step 2: Bottom-Up Segment & Catalyst Growth Vectors**:
  - Map each key product and service under development in the **Anticipated Catalysts & Timeline** to its designated launch quarter ($Q_k$).
  - Calculate the expected incremental revenue contribution ($\Delta\text{Rev}_t$) starting from launch date through full commercial ramp.
- **Step 3: Seasonality & Cyclicality Normalization**:
  - Apply empirical seasonal weights (e.g. Q4 index 1.10x, Q1 index 0.94x, Q2 index 0.98x, Q3 index 1.02x) matching the sector's historical quarterly pattern.
- **Step 4: YoY Growth Calculation**:
  $$\text{YoY Growth \%} = \left(\frac{\text{Projected Revenue}_t - \text{Reported Revenue}_{t-4}}{\text{Reported Revenue}_{t-4}}\right) \times 100$$

### 2. Total Addressable Market (TAM) & Market Share Modeling
For every equity, the agent must evaluate:
- **Total Addressable Market (TAM)**: The aggregate annual revenue potential ($B) across all serviceable geographies and target customer segments.
- **Current Market Share (%)**:
  $$\text{Current Market Share \%} = \left(\frac{\text{Company TTM Revenue}}{\text{Current Industry TAM}}\right) \times 100$$
- **Future Market Share Trajectory (3-Year Forecast %)**:
  - Evaluate whether the company can defend its existing base against incumbents and new entrants.
  - Model market share expansion driven by new product introductions entering adjacent TAM segments.
  - Confirm that projected year-3 revenue ($\text{Revenue}_{12} \times 4$) does not exceed realistic market share bounds of the projected future TAM.

### 3. Share Dilution or Buyback Modeling (6 Horizons)
Diluted shares outstanding must be modeled at:
- Horizon 1: **13 Weeks (1Q)**
- Horizon 2: **26 Weeks (2Q)**
- Horizon 3: **39 Weeks (3Q)**
- Horizon 4: **52 Weeks (1 Year)**
- Horizon 5: **104 Weeks (2 Years)**
- Horizon 6: **156 Weeks (3 Years)**

$$\text{Shares}_{t} = \text{Shares}_{0} \times \left(1 + \text{Net Annual Dilution or Burn Rate}\right)^{\frac{\text{Weeks}}{52}}$$

#### Management Capital Allocation Analysis:
- **Share Repurchase Leaders (Net Burn Rate: -1.0% to -4.0%/year)**: Companies with high free cash flow conversion (>80%), robust balance sheets, and active Board-authorized share buyback programs (e.g. Apple, Alphabet, Meta, AutoZone). Buybacks retire shares, expanding per-share earnings and intrinsic price targets.
- **Stock-Based Compensation Diluters (Net Dilution Rate: +1.0% to +3.5%/year)**: High-growth cloud, cyber, and tech companies issuing substantial equity grants to employees. Buybacks (if any) only partially offset option dilution.
- **Capital Raise & Equity Issuance Risks (Net Dilution Rate: >+3.5%/year)**: Speculative growth, biotech, or capital-intensive infrastructure companies with ongoing cash burn that may need secondary equity offerings to fund operations or debt service.

### 4. 4-Horizon Price Range & Target Modeling
Price ranges are modeled across four horizons:
- **13 Weeks (Near-Term)**: Reflects immediate earnings execution, sentiment, technical support/resistance, and current multiple range.
- **52 Weeks (1 Year)**: Reflects NTM (Next Twelve Months) revenue execution and fundamental re-rating.
- **104 Weeks (2 Years)**: Reflects mid-term compounding, market share gains, and earnings leverage.
- **156 Weeks (3 Years)**: Reflects long-term intrinsic compounding toward target enterprise valuation.

#### Mathematical Formulation for Price Targets:
$$\text{Base Target Price}_t = \frac{\text{TTM Revenue}_t \times \text{Target P/S Multiple}_t}{\text{Projected Diluted Shares}_t}$$

- **Bear Bound (Downside)**: Assumes lower-end revenue trajectory (-15% vs base) and compressed multiple (e.g., 20-30% discount to historical median).
- **Bull Bound (Upside)**: Assumes upper-end revenue trajectory (+15% vs base) and multiple expansion driven by operating leverage.
- **Expected CAGR**:
  $$\text{Annualized CAGR} = \left(\frac{\text{Base Target Price}_t}{\text{Current Price}}\right)^{\frac{52}{\text{Horizon Weeks}}} - 1$$

## Decisive Rating Logic

The Investment Thesis Agent must assign exactly one rating:

| Rating | 3-Year Expected CAGR Hurdle | Margin of Safety | Structural Criteria | Actionable Guidance |
| :--- | :--- | :--- | :--- | :--- |
| **BUY** | $\ge 20.0\%$ | $\ge 15.0\%$ discount to Base Target | Deep moat, ROIC > 15%, positive FCF, accelerating or stable growth | Add shares / Sell Cash-Secured Puts (0.20-0.30 Delta) to accumulate |
| **HOLD** | $10.0\% - 19.9\%$ | Adequate margin of safety | Thesis intact, compounding at steady rate, solid balance sheet | Maintain position / Harvest income via Covered Calls (0.20-0.30 Delta) |
| **SELL** | $< 10.0\%$ | Negative margin of safety (overvalued) | Multiple compression imminent, decelerating revenue, or better opportunities | Liquidate position / Roll covered calls aggressively into ITM |
| **AVOID** | Unfavorable risk/reward or $< 0\%$ | High downside skew | Chronic cash burn, excessive dilution (>3%/yr), structural moat erosion | Do not enter / Zero portfolio allocation |

## Six-Section Narrative Authoring Standard

Every dossier must contain the following six core narrative sections:

### 1. Business Profile (`## Business Profile` / `## Core Investment Thesis`)
Must summarize:
- Core business model, revenue streams, customer segments, and primary products/services.
- Strategic position within its sector and industry classification.
- Executive summary of the 3-year investment rationale and return expectation.

### 2. Total Addressable Market & Market Share (`## Total Addressable Market & Market Share`)
Must analyze:
- **Estimated TAM Size ($B)**: Current dollar value of the total market that the company's products/services address, along with market CAGR.
- **Current Market Share (%)**: Percentage of the addressable market currently captured.
- **Future Market Share Projections**: Modeled market share trajectory over 3 years, explaining ability to defend core share and expand into adjacent markets.

### 3. Competitive Moat Analysis (`## Competitive Moat Analysis`)
Must analyze:
- Structural sources of competitive advantage (switching costs, high intangible assets/IP, proprietary algorithms, network effects, low-cost production).
- Durability of pricing power, gross margin defense, and return on invested capital (ROIC > 15%).

### 4. Anticipated Catalysts & Timeline (`## Anticipated Catalysts & Timeline`)
Must specify:
- **Specific Products & Services Under Development**: Concrete product names, architectural generations, service tiers, or platform expansions.
- **Target Launch Window / Impact Date**: Calendar quarter or release date.
- **Expected Revenue Contribution ($B)**: Dollar magnitude or growth acceleration expected from each catalyst.
- **Connection to 13-Quarter Projections**: Direct bridge explaining which quarter in the 13Q matrix inflects upward as a result of the catalyst.

### 5. Share Dilution or Buyback (`## Share Dilution or Buyback`)
Must evaluate:
- **Management Philosophy & Track Record**: Board authorizations, historic buyback execution, or past equity issuance cadence.
- **Share Repurchase Capacity**: Free cash flow conversion and cash reserves available to retire shares.
- **Capital Raise / Dilution Risks**: Potential need for secondary offerings, convertible debt, or heavy SBC dilution offsetting shareholder returns.

### 6. Explicit Invalidation Criteria (`## Explicit Invalidation Criteria (Exit Triggers)`)
Must define:
- Concrete, measurable exit triggers that indicate thesis failure (e.g. gross margins dropping below X%, customer churn exceeding Y%, key product cancellation, debt leverage breach).

## Canonical Dossier Markdown Layout

Every dossier in `context/theses/<TICKER>.md` must use the following standard layout:

```markdown
# Investment Thesis Dossier: <TICKER> - <COMPANY_NAME>

## Summary & Key Metrics
- **Ticker:** <TICKER>
- **Exchange:** <EXCHANGE>
- **Entry Date:** YYYY-MM-DD
- **Benchmark Entry Price:** $XX.XX per share
- **Current Price:** $XX.XX per share
- **Target Exit Price:** $XX.XX per share
- **Expected Holding Period:** 3 to 5 Years
- **Conviction Score:** X.X / 10.0
- **Rating:** BUY | HOLD | SELL | AVOID
- **Target Strategy:** <STRATEGY>
- **SEC EDGAR URL:** <URL>

## Business Profile
<Comprehensive description of operating model, product segments, and executive thesis>

## Total Addressable Market & Market Share
<Analysis of estimated TAM in billions, current market share percentage, and 3-year projected market share expansion/defense>

## Competitive Moat Analysis
<Detailed analysis of defensible economic moats, pricing power, switching costs, and ROIC protection>

## Anticipated Catalysts & Timeline
<Detailed breakdown of specific products and services being developed, impact dates, expected revenue magnitude, and direct connection to the 13-quarter revenue path>

## Share Dilution or Buyback
<Evaluation of management approach to shares outstanding, active share repurchase authorizations, and assessment of future dilution or capital raising needs>

## Explicit Invalidation Criteria (Exit Triggers)
1. **Structural Moat Invalidation:** ...
2. **Operating Margin Deterioration:** ...
3. **Customer Retention / Churn Risk:** ...
4. **Governance or Solvency Failure:** ...

## Revenue Drivers Narrative
<Comprehensive narrative explaining why the projected 13-quarter revenue path will materialize>

## Valuation & P/S Multiple Narrative
<Comprehensive narrative explaining why the P/S ratio and multiple dynamics explain future price action>

## 13-Quarter Revenue Forecast Matrix (3-Year Path)
| Quarter | Date | Projected Revenue (USD) | YoY Growth (%) | Projected Shares (B) | Projected P/S | Primary Growth Driver |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2026-Q3 (Current) | 2026-09-30 | $XX.XX B | +XX.X% | X.XXX B | X.Xx | ... |
| 2026-Q4 | 2026-12-31 | $XX.XX B | +XX.X% | X.XXX B | X.Xx | ... |
| ... | ... | ... | ... | ... | ... | ... |
| 2029-Q3 (Q12) | 2029-09-30 | $XX.XX B | +XX.X% | X.XXX B | X.Xx | ... |

## Shares Outstanding Projections (6 Horizons)
| Horizon | Projected Diluted Shares | Net Annual Dilution / Burn Rate | Rationale & Assumptions |
| :--- | :--- | :--- | :--- |
| 13 Weeks (1Q) | X,XXX M | -X.X% | Share repurchase pace |
| 26 Weeks (2Q) | X,XXX M | -X.X% | Share repurchase pace |
| 39 Weeks (3Q) | X,XXX M | -X.X% | Share repurchase pace |
| 52 Weeks (1Y) | X,XXX M | -X.X% | FCF buyback allocation |
| 104 Weeks (2Y) | X,XXX M | -X.X% | Multi-year buyback program |
| 156 Weeks (3Y) | X,XXX M | -X.X% | Multi-year buyback program |

## Price Target Ranges & Valuation Scenarios (4 Horizons)
| Horizon | Bear Price (Downside) | Base Target Price | Bull Price (Upside) | Implied P/S Multiple | Expected Annualized CAGR |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 13 Weeks | $XX.XX | $XX.XX | $XX.XX | X.Xx | +XX.X% |
| 52 Weeks (1Y) | $XX.XX | $XX.XX | $XX.XX | X.Xx | +XX.X% |
| 104 Weeks (2Y) | $XX.XX | $XX.XX | $XX.XX | X.Xx | +XX.X% |
| 156 Weeks (3Y) | $XX.XX | $XX.XX | $XX.XX | X.Xx | +XX.X% |

## Analyst Price Targets & Wall Street Coverage
| Analyst Name | Firm / Institution | Date Announced | Market Price at Announcement | Target Price | Implied Upside (%) | Rating / Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| <ANALYST_NAME> | <FIRM> | YYYY-MM-DD | $XX.XX | $XX.XX | +XX.X% | BUY / OUTPERFORM |
| ... | ... | ... | ... | ... | ... | ... |

## Anticipated Catalyst Timeline
| Target Date / Window | Product / Service Catalyst | Expected Revenue Impact ($B) | Revenue Quarter Inflection | Expected Outcome & Milestone | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| YYYY-QX | ... | $X.XX B | QX | ... | PENDING |

## Data Provenance & Verification Metadata
| Data Element | Authority Tier | Source & Locator | Access Method | Retrieval / As-Of Date | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| ... | TIER_1_PRIMARY_REGULATORY | ... | deterministic_script | YYYY-MM-DD | VERIFIED_PRIMARY |
```

## Validation Workflow

Before writing or committing any thesis:
1. Run the deterministic validator:
   ```bash
   python scripts/validate_thesis.py --file context/theses/<TICKER>.md
   ```
2. Verify all six narrative sections are present and substantive.
3. Confirm that all 13 quarters are present in sequence ($Q_0$ to $Q_{12}$) with catalyst-informed non-monotonic progression.
4. Confirm that all 6 share count horizons are present (13, 26, 39, 52, 104, 156 weeks).
5. Confirm that all 4 price target horizons are present (13, 52, 104, 156 weeks) with Bear $\le$ Base $\le$ Bull.
6. Verify that the rating is strictly one of `BUY`, `HOLD`, `SELL`, or `AVOID`.

