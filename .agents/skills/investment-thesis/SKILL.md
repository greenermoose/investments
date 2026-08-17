---
name: investment-thesis
description: Institutional-grade workflow, quantitative forecasting methodologies, multi-horizon valuation modeling (13-quarter revenue, 6-horizon shares outstanding, 4-horizon price target ranges), dual revenue/PS narrative construction, and decisive Buy/Hold/Sell/Avoid rating logic for the Investment Thesis Agent.
---

# Investment Thesis Authoring & Valuation Modeling Skill

## Overview
This skill defines the complete operational protocol, quantitative models, narrative standards, and validation workflows for the **Investment Thesis Agent**.

The Investment Thesis Agent synthesizes all gathered public information (Tier 1 SEC EDGAR 10-K/10-Q filings, earnings releases, consensus estimates, industry TAM trends, and economic moat dynamics) to construct forward-looking, institutional-grade investment thesis dossiers in `context/theses/<TICKER>.md` conforming to `context/schemas/investment_thesis_schema.json`.

## Core Responsibilities
1. **Multi-Horizon Quantitative Forecasts**:
   - **13-Quarter Revenue Forecast ($Q_0$ to $Q_{12}$)**: Project current quarter revenue plus the next 12 quarters (3 full years) in USD, with explicit YoY growth rates and segment-level drivers.
   - **6-Horizon Shares Outstanding**: Project diluted shares outstanding at 13, 26, 39, 52, 104, and 156 weeks, incorporating share repurchase authorizations, free cash flow conversion, and stock-based compensation (SBC) offset.
   - **4-Horizon Price Trading Ranges**: Model Bear, Base, and Bull price bounds across 13 weeks, 52 weeks (1 year), 104 weeks (2 years), and 156 weeks (3 years).
2. **Dual Qualitative & Valuation Narratives**:
   - **Revenue Drivers Narrative**: Explain *why* the projected revenue path will happen (secular tailwinds, product roadmap, enterprise/consumer adoption, market share, TAM expansion, pricing power).
   - **Valuation & P/S Multiple Narrative**: Explain *why* the Price-to-Sales (P/S) multiple and margin profile will trend as modeled to drive the future stock price action.
3. **Decisive Rating Determination**:
   - Assign an unambiguous rating of `BUY`, `HOLD`, `SELL`, or `AVOID` using mathematical return hurdles and margin-of-safety rules.
4. **Data Provenance Compliance**:
   - Attribute all financial data points and claims according to the 5-tier source hierarchy defined in `context/sources/catalog.md`.

---

## Quantitative Modeling Methodologies

### 1. 13-Quarter Revenue Forecast Framework ($Q_0$ to $Q_{12}$)
The 13-quarter revenue path covers the current reporting quarter ($Q_0$) through 3 full years ($Q_{12}$).

$$\text{Revenue}_{t} = \sum_{i=1}^{n} \text{Segment Revenue}_{i, t}$$

- **Step 1: Historical Baseline Audit**: Retrieve last 8 quarters of segment revenue from Tier 1 Form 10-Q/10-K filings.
- **Step 2: Bottom-Up Segment Growth Vector**:
  - Subscription / SaaS: $\text{ARR}_{t} \times (1 + \text{Net Expansion Rate})$.
  - Hardware / Devices: $\text{Units Delivered} \times \text{Average Selling Price (ASP)}$.
  - Consumption / Cloud / AI: Baseline capacity $\times$ utilization growth $\times$ compute pricing.
- **Step 3: Seasonality Normalization**: Account for calendar Q4 holiday spikes (e.g. consumer tech) and enterprise Q4 budget flushes.
- **Step 4: YoY Growth Calculation**:
  $$\text{YoY Growth \%} = \left(\frac{\text{Projected Revenue}_t - \text{Reported Revenue}_{t-4}}{\text{Reported Revenue}_{t-4}}\right) \times 100$$

### 2. 6-Horizon Shares Outstanding Projection
Share counts must be modeled at:
- Horizon 1: **13 Weeks (1Q)**
- Horizon 2: **26 Weeks (2Q)**
- Horizon 3: **39 Weeks (3Q)**
- Horizon 4: **52 Weeks (1 Year)**
- Horizon 5: **104 Weeks (2 Years)**
- Horizon 6: **156 Weeks (3 Years)**

$$\text{Shares}_{t} = \text{Shares}_{t-1} \times \left(1 - \frac{\text{Annual FCF Buyback Allocation}}{\text{Market Cap}} + \text{SBC Dilution Rate}\right)^{\frac{\Delta t}{52}}$$

- **Net Dilution / Burn Rate**: For companies actively buying back shares with FCF (e.g. Apple, Google, Microsoft), net share count decreases at 1.5% to 3.5% annually. For growth companies with heavy SBC, net share count increases at 1.0% to 3.0% annually.

### 3. 4-Horizon Price Range & Target Modeling
Price ranges are modeled across four horizons:
- **13 Weeks (Near-Term)**: Reflects immediate earnings execution, sentiment, and current multiple range.
- **52 Weeks (1 Year)**: Reflects NTM (Next Twelve Months) revenue execution and fundamental re-rating.
- **104 Weeks (2 Years)**: Reflects mid-term compounding, market share gains, and earnings leverage.
- **156 Weeks (3 Years)**: Reflects long-term intrinsic compounding toward target enterprise valuation.

#### Mathematical Formulation for Price Targets:
$$\text{Base Target Price}_t = \frac{\text{TTM Revenue}_t \times \text{Target P/S Multiple}_t}{\text{Projected Diluted Shares}_t}$$

- **Bear Bound (Downside)**: Assumes lower-end revenue trajectory (-15% vs base) and compressed multiple (e.g., 20-30% discount to historical median).
- **Bull Bound (Upside)**: Assumes upper-end revenue trajectory (+15% vs base) and multiple expansion driven by operating leverage.
- **Expected CAGR**:
  $$\text{Annualized CAGR} = \left(\frac{\text{Base Target Price}_t}{\text{Current Price}}\right)^{\frac{52}{\text{Horizon Weeks}}} - 1$$

---

## Decisive Rating Logic

The Investment Thesis Agent must assign exactly one rating:

| Rating | 3-Year Expected CAGR Hurdle | Margin of Safety | Structural Criteria | Actionable Guidance |
| :--- | :--- | :--- | :--- | :--- |
| **BUY** | $\ge 20.0\%$ | $\ge 15.0\%$ discount to Base Target | Deep moat, ROIC > 15%, positive FCF, accelerating or stable growth | Add shares / Sell Cash-Secured Puts (0.20-0.30 Delta) to accumulate |
| **HOLD** | $10.0\% - 19.9\%$ | Adequate margin of safety | Thesis intact, compounding at steady rate, solid balance sheet | Maintain position / Harvest income via Covered Calls (0.20-0.30 Delta) |
| **SELL** | $< 10.0\%$ | Negative margin of safety (overvalued) | Multiple compression imminent, decelerating revenue, or better opportunities | Liquidate position / Roll covered calls aggressively into ITM |
| **AVOID** | Unfavorable risk/reward or $< 0\%$ | High downside skew | Chronic cash burn, excessive dilution (>3%/yr), structural moat erosion | Do not enter / Zero portfolio allocation |

---

## Dual Narrative Authoring Standard

Every dossier must contain two comprehensive narrative sections:

### 1. Revenue Drivers Narrative (`## Revenue Drivers Narrative`)
Must address:
- **Secular Tailwinds & TAM**: Size of addressable market and secular industry trends supporting the company.
- **Product Roadmap & Catalysts**: Key product releases, enterprise software upgrades, or capacity expansions driving volume.
- **Customer Monetization & Pricing Power**: Renewal rates, net retention rates (NRR), average revenue per user (ARPU), and pricing elasticity.
- **Market Share Dynamics**: Competitive gains or defenses against key industry competitors.

### 2. Valuation & P/S Multiple Narrative (`## Valuation & P/S Multiple Narrative`)
Must address:
- **Historical vs. Target Multiple Rationale**: Compare current P/S, EV/Sales, and P/E against 5-year historical medians.
- **Margin Profile & Operating Leverage**: Explain how gross margins and operating margins justify the forward multiple (e.g., higher SaaS mix expanding margins).
- **Multiple Expansion/Compression Drivers**: Justify why the multiple will expand, remain stable, or compress over the 3-year horizon.
- **Terminal Valuation Sanity Check**: Compare implied terminal P/E and FCF yield at year 3 against the risk-free rate + equity risk premium.

---

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

## Core Investment Thesis
<Executive thesis summary paragraph>

## Revenue Drivers Narrative
<Comprehensive narrative explaining why the projected 13-quarter revenue path will materialize>

## Valuation & P/S Multiple Narrative
<Comprehensive narrative explaining why the P/S ratio and multiple dynamics explain future price action>

## 13-Quarter Revenue Forecast Matrix (3-Year Path)
| Quarter | Projected Revenue (USD) | YoY Growth (%) | Primary Growth Driver |
| :--- | :--- | :--- | :--- |
| 2026-Q3 (Current) | $XX.XX B | +XX.X% | ... |
| 2026-Q4 | $XX.XX B | +XX.X% | ... |
| ... | ... | ... | ... |
| 2029-Q3 (Q12) | $XX.XX B | +XX.X% | ... |

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

## Anticipated Catalyst Timeline
| Target Date / Window | Event / Catalyst | Expected Outcome | Actual Outcome & Impact | Status |
| :--- | :--- | :--- | :--- | :--- |
| YYYY-QX | ... | ... | ... | PENDING |

## Explicit Invalidation Criteria (Exit Triggers)
1. **Trigger 1**: ...
2. **Trigger 2**: ...

## Data Provenance & Verification Metadata
| Data Element | Authority Tier | Source & Locator | Access Method | Retrieval / As-Of Date | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| ... | TIER_1_PRIMARY_REGULATORY | ... | deterministic_script | YYYY-MM-DD | VERIFIED_PRIMARY |
```

---

## Validation Workflow

Before writing or committing any thesis:
1. Run the deterministic validator:
   ```bash
   python scripts/validate_thesis.py --file context/theses/<TICKER>.md
   ```
2. Confirm that all 13 quarters are present in sequence ($Q_0$ to $Q_{12}$).
3. Confirm that all 6 share count horizons are present (13, 26, 39, 52, 104, 156 weeks).
4. Confirm that all 4 price target horizons are present (13, 52, 104, 156 weeks) with Bear $\le$ Base $\le$ Bull.
5. Verify that the rating is strictly one of `BUY`, `HOLD`, `SELL`, or `AVOID`.
