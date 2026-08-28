# Open Questions & Strategic Issues for Advanced AI Review

This document maintains an active registry of architectural, quantitative, prompt-engineering, and strategic questions identified during the development of the investment analysis and stock picking system.

## Purpose & Background

To optimize development velocity and operational cost efficiency, the initial version of our stock picking system and multi-agent workflows is built using AI models with limited intelligence and reasoning capacity. Throughout this implementation phase, certain strategic trade-offs, simplified heuristics, and modeling decisions have been made.

This registry captures high-leverage questions and structural dilemmas that should be systematically reviewed, benchmarked, and refined when more intelligent AI models (e.g. frontier reasoning models and autonomous quantitative agents) become available.

## Instructions for Maintaining & Adding Items

Human operators and AI agents should continuously capture emerging dilemmas and compromises as they arise across the codebase.

### When to Log an Item
Log an open question or issue whenever:
1. A simplified heuristic or hardcoded rule was adopted because current models struggled with open-ended or high-dimensional quantitative synthesis.
2. A trade-off exists between strict empirical determinism and agent creative flexibility.
3. Prompt structures or agent personas produce inconsistent, overly cautious, or suboptimal stock selections.
4. Higher-order mathematical, econometric, or portfolio-theory methodologies could replace initial baseline approximations.

### Addition Guidelines & Entry Format
When adding an item to the registry below, adhere to the following format:

- **Item ID**: Sequential identifier in the format `OQI-YYYY-MM-###`.
- **Title / Question**: Concise formulation of the strategic question or dilemma.
- **Date Logged**: ISO date (`YYYY-MM-DD`).
- **Domain / Agents**: Affected subsystem (e.g. `Investment Thesis`, `Equity Research`, `Pricing`, `Prompt Engineering`).
- **Related Files**: Markdown links to relevant dossiers, scripts, schemas, or prompt definitions.
- **Context & Strategic Nuance**: Detailed breakdown of why this is a challenge and where current limitations lie.
- **Current Baseline Implementation**: The interim heuristic or mechanism currently implemented.
- **Advanced AI Review Mandate**: Specific questions, experiments, and deliverables for more capable AI models to evaluate.
- **Status**: `OPEN`, `UNDER_INVESTIGATION`, or `RESOLVED`.

## Open Questions & Strategic Issues Registry

### OQI-2026-08-001: Empirical Grounding vs. AI Model Alpha Flexibility

- **Item ID**: OQI-2026-08-001
- **Date Logged**: 2026-08-19
- **Domain / Agents**: Investment Thesis Agent, Equity Research Agent, Valuation Framework
- **Related Files**: [investment-thesis SKILL.md](file:///c:/Users/fyhor/Documents/GitHub/investments/.agents/skills/investment-thesis/SKILL.md), [valuation_framework.md](file:///c:/Users/fyhor/Documents/GitHub/investments/context/strategy/valuation_framework.md), [valuation_model.py](file:///c:/Users/fyhor/Documents/GitHub/investments/scripts/valuation_model.py), [roi_distribution_benchmarks.md](file:///c:/Users/fyhor/Documents/GitHub/investments/context/research/roi_distribution_benchmarks.md)
- **Status**: OPEN

#### Question
How can we ground the investment thesis development process on empirical data while also providing for flexibility for our AI models to find alpha in its stock picking and trading plan?

#### Context & Strategic Nuance
Our mandate requires all recommendations to maximize the probability of achieving a 20%+ annualized return over a 20-year horizon, grounded in empirical market research and SEC filings. However, strict empirical grounding can easily collapse into rigid backward-looking index replication or deterministic multiple screens (e.g. simple low P/E or low P/S screens) that fail to anticipate non-linear inflection points, structural business model transformations, or emergent secular winners.

Conversely, giving AI models unconstrained flexibility frequently leads to hallucinated projections, unjustified multiple expansion, and optimistic sentiment without margin of safety. Finding alpha requires balancing:
1. **Empirical Guardrails**: Enforcing verifiable financial history (10-K/10-Q figures, ROIC hurdle thresholds, historical multiple distributions, share dilution decay).
2. **Forward Alpha Discovery**: Allowing models to recognize early inflections (new product TAM acceleration, operating leverage inflection, gross margin expansion, competitive displacement) and construct differentiated variant perceptions against consensus market expectations.

#### Current Baseline Implementation
Currently, deterministic Python scripts ([valuation_model.py](file:///c:/Users/fyhor/Documents/GitHub/investments/scripts/valuation_model.py) and [return_engine.py](file:///c:/Users/fyhor/Documents/GitHub/investments/scripts/return_engine.py)) enforce strict historical anchoring (e.g. capping terminal multiples against 5-year historical medians, limiting revenue growth based on 13-quarter trajectory fit). AI models populate narrative dossiers within structured JSON schemas, but quantitative projections are tightly bounded to avoid runaway upside hallucinations.

#### Advanced AI Review Mandate
When frontier reasoning models review this issue, they should address:
1. What dynamic Bayesian or statistical frameworks can calibrate how much weight to place on historical financial distributions versus forward qualitative catalysts on a per-industry basis?
2. How can we construct quantitative "variant perception" scores that explicitly measure where an agent thesis diverges from sell-side consensus, verifying that divergence against empirical precedent of similar historical corporate inflections?
3. How can the trading plan generation dynamically size conviction based on empirical signal reliability without violating strict downside risk constraints?

### OQI-2026-08-002: Optimal Prompt Architectures for Investment Thesis Stock Picking

- **Item ID**: OQI-2026-08-002
- **Date Logged**: 2026-08-19
- **Domain / Agents**: Investment Thesis Agent, Prompt Architecture, Multi-Agent System
- **Related Files**: [weekly_deliberation.md](file:///c:/Users/fyhor/Documents/GitHub/investments/context/prompts/weekly_deliberation.md), [investment-thesis SKILL.md](file:///c:/Users/fyhor/Documents/GitHub/investments/.agents/skills/investment-thesis/SKILL.md), [investment_thesis_schema.json](file:///c:/Users/fyhor/Documents/GitHub/investments/context/schemas/investment_thesis_schema.json)
- **Status**: OPEN

#### Question
What prompts will help AI models playing the role of investment thesis agent pick good stocks?

#### Context & Strategic Nuance
Prompting an AI agent to "pick good stocks" or evaluate equities is vulnerable to several systemic failure modes in standard LLMs:
1. **Recency & Hype Bias**: Defaulting to the largest, most widely discussed mega-cap tech stocks regardless of current valuation or risk-reward skew.
2. **Overly Diffuse Recommendations**: Generating generic buy recommendations without sharp differentiation or conviction-weighted ranking.
3. **Superficial Bull Cases**: Repeating corporate press release bullet points rather than stress-testing unit economics, capital allocation records, and downside failure modes.
4. **Failure to Synthesize Fundamentals and Derivatives**: Evaluating a stock in isolation without structuring cash-secured put discount entry points or covered call monetization levels.

To consistently discover equities capable of generating 20%+ annualized returns, prompts must induce deep forensic scrutiny, rigorous competitive moat analysis, multi-horizon scenario modeling (Bear/Base/Bull), and adversarial red-teaming.

#### Current Baseline Implementation
The current prompt infrastructure relies on role-specific skill instructions ([investment-thesis SKILL.md](file:///c:/Users/fyhor/Documents/GitHub/investments/.agents/skills/investment-thesis/SKILL.md)) and structured markdown output schemas with strict validation rules. Prompt instructions enforce the 20% 20-year hurdle and demand multi-horizon projections (13Q revenue, 6-horizon shares outstanding, 4-horizon price bands).

#### Advanced AI Review Mandate
When frontier reasoning models review this issue, they should evaluate and test:
1. **Chain-of-Thought & Scaffold Architectures**: What multi-step reasoning chains (e.g. Forensic Financial Autopsy -> Moat Verification -> Invalidation Definition -> Valuation Stress-Testing -> Derivative Structure) produce the highest alpha and lowest false-positive rate across historical backtests?
2. **Adversarial Red-Team Prompting**: Can an explicit "Short Seller / Bear Thesis" agent sub-prompt be embedded into the thesis generation pipeline to actively attack every prospective Buy recommendation before finalizing a rating?
3. **Structured Prompt Ingestion**: How should Tier 1 SEC filings, earnings transcripts, and competitive metrics be ingested and summarized within prompt context to maximize the signal-to-noise ratio for stock selection?
4. **Evaluation Benchmark**: What objective evaluation benchmark (e.g. historical backtesting against 5-year multi-cycle stock performance) should be used to quantitatively score and rank candidate prompt templates?

### OQI-2026-08-003: Macroeconomic Regimes, Secular Trends, and Thematic Synthesis in Fundamental Analysis

- **Item ID**: OQI-2026-08-003
- **Date Logged**: 2026-08-19
- **Domain / Agents**: Investment Thesis Agent, Equity Research Agent, Macro & Thematic Synthesis
- **Related Files**: [investment-thesis SKILL.md](file:///c:/Users/fyhor/Documents/GitHub/investments/.agents/skills/investment-thesis/SKILL.md), [equity-research SKILL.md](file:///c:/Users/fyhor/Documents/GitHub/investments/.agents/skills/equity-research/SKILL.md), [weekly_deliberation.md](file:///c:/Users/fyhor/Documents/GitHub/investments/context/prompts/weekly_deliberation.md), [valuation_framework.md](file:///c:/Users/fyhor/Documents/GitHub/investments/context/strategy/valuation_framework.md)
- **Status**: OPEN

#### Question
How do we systematically incorporate macro-regime shifts (e.g. global bond routs, rate regime changes), industry-wide disruption cycles (e.g. the "SaaS-pocalypse" / multiple re-ratings), and broader technological and social trends into the bottom-up fundamental analysis performed by the Investment Thesis Agent?

#### Context & Strategic Nuance
Legendary stock pickers historically succeed not only by performing forensic balance sheet analysis on single equities, but by identifying and riding overarching secular waves, technological paradigms, and macroeconomic regimes that drive dramatic inflections in consumer spending, enterprise budgets, and corporate profitability.

Current multi-agent investment architectures face specific challenges when bridging top-down macro/thematic trends with bottom-up equity research:
1. **Macro & Secular Disruption Blind Spots**: Bottom-up valuation models anchored strictly on trailing 10-K/10-Q figures and linear 13-quarter revenue growth can miss structural industry regime shifts (such as enterprise SaaS multiple compression / "SaaS-pocalypse" or higher-for-longer cost of capital caused by global bond market routs).
2. **AI Thematic Synthesis Capabilities**: Multi-agent AI systems possess a unique capability to continuously digest and synthesize vast, heterogeneous datasets (cross-industry earnings calls, consumer behavior indicators, regulatory shifts, technological breakthroughs, and macro yield curve dynamics) to detect early-stage structural trends before they are fully recognized by consensus sell-side analysts.
3. **Translating Thematic Trends to Individual Alpha**: A broad macro or tech trend (e.g. generative AI infrastructure, edge compute, reshoring, demographic shifts) must be translated into quantifiable company-level metrics: incremental addressable market (TAM), pricing power, operating leverage, and earnings per share impact for specific public companies, rather than vague thematic hype.

#### Current Baseline Implementation
The current system focuses primarily on bottom-up equity research (evaluating universe constituents via historical SEC filings, 13-quarter revenue trends, and deterministic multiples) without a formal macro/thematic tracking layer. Macro factors and industry re-ratings are indirectly captured through company earnings results and price action rather than explicit top-down thematic modules.

#### Advanced AI Review Mandate
When frontier reasoning models review this issue, they should address:
1. **Thematic Knowledge Store Architecture**: How can we design a persistent thematic and secular trend knowledge repository (e.g. `context/trends/` or specialized macro dossiers) that tracks evolving paradigms (e.g. enterprise software disruption, bond yield regimes, power/energy constraints for compute) and maps their beneficiaries and casualties across universe constituents?
2. **Top-Down to Bottom-Up Valuation Bridge**: What quantitative mechanism should allow macro/thematic insights to directly adjust bottom-up valuation parameters (e.g. terminal multiple ceilings, cost of capital hurdle rates, revenue trajectory acceleration/deceleration coefficients) in [valuation_model.py](file:///c:/Users/fyhor/Documents/GitHub/investments/scripts/valuation_model.py)?
3. **Cross-Industry Trend Detection Agents**: Can a dedicated Macro & Thematic Research Agent or specialized prompt pipeline monitor cross-sector signals (e.g. supplier lead times, capex announcements, consumer spend surveys, bond market volatility) to generate predictive thematic briefs for the Investment Thesis Agent?
4. **Historical Paradigm Backtesting**: How can we evaluate whether thematic trend identification improves the hit rate of 20%+ annualized return equity selections versus pure bottom-up fundamental screening over 10- to 20-year historical market cycles?

### OQI-2026-08-004: Holding Period Determination, Inflection Point Synchronization, and Macro/Cycle Calibration

- **Item ID**: OQI-2026-08-004
- **Date Logged**: 2026-08-24
- **Domain / Agents**: Investment Thesis Agent, Pricing Agent, Lead Portfolio Manager Agent, Valuation Framework
- **Related Files**: [investment-thesis SKILL.md](file:///c:/Users/fyhor/Documents/GitHub/investments/.agents/skills/investment-thesis/SKILL.md), [pricing SKILL.md](file:///c:/Users/fyhor/Documents/GitHub/investments/.agents/skills/pricing/SKILL.md), [valuation_framework.md](file:///c:/Users/fyhor/Documents/GitHub/investments/context/strategy/valuation_framework.md), [valuation_model.py](file:///c:/Users/fyhor/Documents/GitHub/investments/scripts/valuation_model.py), [return_engine.py](file:///c:/Users/fyhor/Documents/GitHub/investments/scripts/return_engine.py)
- **Status**: OPEN

#### Question
How should the holding period for a given position be determined and quantitatively synchronized with predicted business inflection points? What empirical literature guides optimal holding periods across different asset profiles, and what explicit heuristics can incorporate macro variables (market valuation regimes, interest rates/cost of capital, technology adoption cycles, options premium harvest) to dynamically modulate the target holding duration?

#### Context & Strategic Nuance
Our investment mandate requires a 20%+ annualized return over a 20-year horizon, using active US equities selection and options overlays without speculative trading. A recurring structural question is: *what determines the holding period of an investment, and how does it connect to the predicted inflection point of the underlying business?*

1. **Company-Specific Circumstances & Thesis Archetypes**:
   - **Catalyst / Inflection Plays (1 to 2 Years / 4 to 8 Quarters)**: New product commercialization ramps, operational turnarounds, margin inflection, or regulatory approvals have defined realization windows where operating leverage peaks. Holding beyond the catalyst realization often leads to diminishing marginal CAGR.
   - **High-ROIC Secular Compounders (3 to 5+ Years / Indefinite)**: Businesses with durable economic moats, high returns on invested capital (ROIC > 15%), and large reinvestment runways compound intrinsic value continuously. Selling prematurely cuts off multi-bagger compounders.
   - **Cyclical / Capex Plays (2 to 3 Years / 8 to 12 Quarters)**: Semiconductor capital equipment, memory chips, and industrial cycles require buying at trough cycle inflection and selling into peak cycle multiple expansion.

2. **Empirical Literature on Optimal Holding Periods**:
   - **Value & Mean Reversion Literature (De Bondt & Thaler 1985; Lakonishok, Shleifer & Vishny 1994; Fama & French 1992, 1996)**: Fundamental mispricings and valuation multiples take an empirical median of 3 to 5 years (36 to 60 months) to fully mean-revert to fair value. Sub-1-year periods are dominated by market microstructure noise; beyond 5 years, underlying business ROIC dominates initial multiple re-rating.
   - **Momentum & PEAD Literature (Jegadeesh & Titman 1993; Bernard & Thomas 1989)**: Momentum and post-earnings announcement drift exhibit half-lives of 3 to 12 months, after which mean reversion sets in.
   - **Quality Compounder Literature (Buffett, Munger; Phil Fisher; Terry Smith; Chuck Akre)**: Compounding returns are maximized when the holding period equals the duration over which ROIC remains well above WACC and capital can be reinvested at high marginal returns.
   - **Tax and Frictional Efficiency (Constantinides 1984)**: Holding assets for at least 1 year (qualifying for long-term capital gains tax rates) and minimizing transaction turnover significantly reduces hurdle drag.

3. **Macro, Technological, and Structural Heuristics Modulating Holding Periods**:
   - **Interest Rate / Cost of Capital Regime**: High interest rate environments raise the discount rate on distant cash flows, favoring shorter-duration positions (1-2 year cash-flow inflections) over speculative 10-year horizons.
   - **Market Valuation Regime (Bull vs. Bear/Crisis Entry)**: Acquiring high-quality assets at crash troughs (e.g. 2008, 2020, 2022) allows target 20%+ IRR to be achieved in 12-24 months due to violent multiple expansion, shortening the holding period, whereas high broad-market valuation regimes require longer 3-5 year earnings growth compounding.
   - **Technology S-Curve Adoption Phase**: The steep adoption phase (10% to 50% penetration) typically spans 3 to 5 years; entering before adoption inflection risks dead money, while holding past 50% penetration enters growth deceleration.
   - **Derivatives Premium Duration Compression**: Systematically selling 30-45 DTE cash-secured puts and covered calls generates 15-25% annualized cash yield, shortening the payback period and providing an automated, disciplined mechanism for rotating out of positions upon full fair value realization.

#### Current Baseline Implementation
Currently, dossiers in `context/theses/<TICKER>.md` declare a standardized `Expected Holding Period: 3 to 5 Years`, paired with a 13-quarter (3-year) bottom-up revenue projection and 4 valuation horizons (13 weeks, 52 weeks, 104 weeks, 156 weeks). While [valuation_model.py](file:///c:/Users/fyhor/Documents/GitHub/investments/scripts/valuation_model.py) and [return_engine.py](file:///c:/Users/fyhor/Documents/GitHub/investments/scripts/return_engine.py) calculate annualized CAGR across these four discrete horizons, the assignment of expected holding duration is largely static rather than dynamically derived from catalyst timing, industry capex cycles, or macro valuation regimes.

#### Advanced AI Review Mandate
When frontier reasoning models review this issue, they should evaluate and formulate:
1. **Dynamic Inflection-to-Holding Period Mapping Algorithm**: How can we formulate a mathematical function that maps catalyst launch dates, product S-curve inflection quarters ($Q_k$), and operating leverage peak estimates directly to an equity's target holding period ($T_{\text{target}}$)?
2. **Multi-Horizon Exit Trigger Calibration**: How should the Lead Portfolio Manager and Pricing Agent synthesize dynamic holding periods with covered call strike horizons (e.g. selling shorter 30-DTE calls near catalyst targets vs. wider 60-90 DTE calls on multi-year compounders)?
3. **Macro Regime Modulator**: What quantifiable macroeconomic rules (e.g. 10-year Treasury yield shifts, equity risk premium spreads, sector Capex-to-Depreciation ratios) should dynamically lengthen or compress target holding periods across the portfolio?
4. **Historical Backtesting of Holding Duration Strategies**: How does a catalyst-synchronized holding period strategy compare against fixed 1-year rebalancing and static 5-year buy-and-hold across multi-cycle historical datasets in achieving the 20%+ annualized compounding mandate?

### OQI-2026-08-005: Token ROI Optimization & Avoid List Gating Architecture

- **Item ID**: OQI-2026-08-005
- **Date Logged**: 2026-08-24
- **Domain / Agents**: Equity Research Agent, Investment Thesis Agent, Memory Agent, Token Economics
- **Related Files**: [avoid_vs_sell_framework.md](file:///c:/Users/fyhor/Documents/GitHub/investments/context/strategy/avoid_vs_sell_framework.md), [token_triage_and_avoid_pipeline.md](file:///c:/Users/fyhor/Documents/GitHub/investments/context/strategy/token_triage_and_avoid_pipeline.md), [triage_universe.py](file:///c:/Users/fyhor/Documents/GitHub/investments/scripts/triage_universe.py), [equity-research SKILL.md](file:///c:/Users/fyhor/Documents/GitHub/investments/.agents/skills/equity-research/SKILL.md), [investment-thesis SKILL.md](file:///c:/Users/fyhor/Documents/GitHub/investments/.agents/skills/investment-thesis/SKILL.md)
- **Status**: OPEN

#### Question
How can we mathematically optimize the triage gating thresholds and lightweight LLM scanning heuristics to maximize token cost efficiency while minimizing Type II errors (false negatives where an eventual multi-bagger compounder is mistakenly relegated to the Avoid List)?

#### Context & Strategic Nuance
Generating institutional-grade investment thesis dossiers (13-quarter revenue forecasts, 6-horizon shares outstanding, 4-horizon price targets, forensic footnote audits) requires ~15,000+ tokens per ticker. In an expanding universe of 150 to 500+ equities, analyzing companies doomed to secular obsolescence, unmanageable debt default, or chronic share dilution creates massive compute drag.

We have established a two-stage analysis funnel:
1. **Stage 1 (Lightweight Triage & Gating)**: Deterministic quantitative filters + lightweight qualitative LLM probes (~1,000 tokens) tag value traps as `AVOID` and freeze deep compute.
2. **Stage 2 (Deep Scrutiny)**: High-token institutional modeling is reserved exclusively for cleared `QUALIFIED_CANDIDATE` equities.

The critical strategic trade-offs involve:
- **Type I Errors (False Positives)**: Allowing a value trap through triage into Stage 2 deep analysis wastes ~15,000 tokens, but the deep analysis will subsequently catch the flaws and assign a `SELL` or `AVOID` rating without risking capital.
- **Type II Errors (False Negatives)**: Prematurely tagging an early-stage inflection play or misunderstood turnaround as `AVOID` saves tokens, but risks missing a 20%+ annualized alpha compounding opportunity.

#### Current Baseline Implementation
Currently, [triage_universe.py](file:///c:/Users/fyhor/Documents/GitHub/investments/scripts/triage_universe.py) enforces quantitative baselines (gross margin >= 15%, runway >= 12m, dilution <= 4%/yr, debt/equity <= 4.0x) paired with the conceptual doctrine in [avoid_vs_sell_framework.md](file:///c:/Users/fyhor/Documents/GitHub/investments/context/strategy/avoid_vs_sell_framework.md). Equities on the Avoid List maintain explicit de-listing triggers audited quarterly by the Memory Agent.

#### Advanced AI Review Mandate
When frontier reasoning models review this issue, they should evaluate and formulate:
1. **Optimal Multi-Armed Bandit / Active Learning Allocation**: How can we dynamically allocate exploration tokens (e.g. sampling 5-10% of borderline Avoid equities for deep audits) to empirically calibrate triage error rates?
2. **Probabilistic Triage Scoring Models**: Can we train a lightweight logistic or gradient-boosted classifier on historical 10-K data to assign a continuous "Avoid Probability Score" ($P_{\text{avoid}}$) that routes compute budget with optimal precision-recall trade-offs?
3. **Automated De-Listing Trigger Parsing**: How can LLM-based SEC 8-K / 10-Q parsers autonomously evaluate and score de-listing triggers (e.g. debt restructuring covenants, executive turnaround plans) to promote avoided companies in real time without human intervention?

### OQI-2026-08-006: Fundamental Data Absence, Non-Functional Triage Gating, and Price Series Integrity

- **Item ID**: OQI-2026-08-006
- **Date Logged**: 2026-08-28
- **Domain / Agents**: Equity Research Agent, Investment Thesis Agent, Pricing Agent, Data Provenance, Quality Control
- **Related Files**: [triage_universe.py](../../scripts/triage_universe.py), [build_universe_json.py](../../scripts/build_universe_json.py), [quality_control.py](../../scripts/quality_control.py), [fetch_sec.py](../../scripts/fetch_sec.py), [calculate_pricing.py](../../scripts/calculate_pricing.py), [valuation_framework.md](../strategy/valuation_framework.md), [errata_log.md](errata_log.md)
- **Status**: OPEN

#### Question
The strategy mandate requires ROIC discipline, FCF conversion analysis, gross margin gating, and solvency verification. None of these metrics exist as fields in any dataset in this repository. What is the minimum viable fundamental data layer required before the Stage 1 triage gate and the valuation framework can do the work their specifications describe?

#### Context & Strategic Nuance

**1. The Stage 1 triage gate is currently inert.**

[triage_universe.py](../../scripts/triage_universe.py) reads five fields to enforce its documented thresholds (gross margin >= 15%, runway >= 12 months, dilution <= 4%/yr, Debt/Equity <= 4.0x):

    gross_margin       -> company.get("gross_margin_pct")
    fcf                -> company.get("free_cash_flow_usd_m")
    debt_equity        -> company.get("debt_to_equity")
    dilution_rate      -> company.get("annual_dilution_pct")
    runway_months      -> company.get("cash_runway_months")

An audit on 2026-08-28 confirmed all five are present in **0 of 175** universe records. Every gate is guarded as `if value is not None`, so all five silently pass for every equity. The function therefore returns `QUALIFIED_CANDIDATE` for anything not already carrying a manually assigned `thesis_status` of `AVOID`. The token-economics argument in [OQI-2026-08-005](open_questions_and_issues.md) presumes this gate filters value traps before Stage 2 deep compute. It does not filter anything.

**2. The valuation stack runs on revenue and a P/S multiple alone.**

Universe records carry `ttm_revenue`, `total_debt`, `cash_and_cash_equivalents`, `shares_outstanding`, `current_ps_multiple`, and `target_ps_multiple`. They carry no income statement below the top line and no cash flow statement at all. Specifically absent across all records: gross margin, operating margin, net income, operating cash flow, capital expenditure, free cash flow, shareholders' equity, ROIC, and cash runway.

Two direct consequences:
- Debt/Equity is uncomputable despite `total_debt` being stored, because shareholders' equity is absent.
- Every price target in `price_target_ranges_4h` is a revenue multiple applied to a forecast revenue line. A business earning negative gross margin and one earning 70% gross margin are valued by identical machinery.

This is an **extraction gap, not a sourcing gap**. The SEC XBRL `companyfacts` endpoint that [fetch_sec.py](../../scripts/fetch_sec.py) already authenticates against exposes every one of these fields as Tier 1 primary regulatory data.

**3. The day-change price series is corrupt.**

170 of 175 records carry `previous_close` disagreeing with `nominal_previous_close` while `cumulative_split_factor` is 1.0, yielding implausible single-session moves for large caps (ABNB +39.59%, ADP +30.80%, ABT +30.24%). Recorded against direct brokerage observation on 2026-08-28: universe.json reports ENVX at -52.13% on the day; the broker terminal reports $0.00. Logged as ERR-2026-08-015.

Corrupt data is a more severe failure than absent data, because absent data fails loudly at the point of use while corrupt data propagates silently into technical support and resistance levels, momentum readings, and limit order pricing.

**4. Quality control can destroy the modeling layer it is meant to protect.**

[quality_control.py](../../scripts/quality_control.py) `fix_all` contains a second, independent universe record builder that emits approximately 49 fields, materially fewer than the roughly 95 fields produced by the canonical builder in [build_universe_json.py](../../scripts/build_universe_json.py). Running `--fix` overwrites both `http/data/universe.json` and `context/data/universe.json`, destroying 46 fields per record across the entire universe, including all 13-quarter revenue forecasts, 4-horizon price targets, 6-horizon share projections, and every return-engine output. [onboard_company.py](../../scripts/onboard_company.py) recommends running `--fix` in its own console output on any audit finding. Logged as ERR-2026-08-014.

#### Current Baseline Implementation
Triage thresholds are documented and enforced in code, but the code reads fields that no data pipeline populates. Valuation proceeds on P/S multiples anchored to historical medians. Price data is ingested without a concordance assertion between split-adjusted and nominal series. Quality control maintains two divergent definitions of a universe record with no schema arbitrating between them.

#### Advanced AI Review Mandate

**Tier 1: Fundamental extraction (unblocks triage and valuation).**
1. Which XBRL `us-gaap` concepts should map to each required field, and how should the mapping degrade gracefully across filers using different taxonomy tags for the same economic quantity (for example `Revenues` versus `RevenueFromContractWithCustomerExcludingAssessedTax`)?
2. How should trailing twelve month aggregation handle non-calendar fiscal years, 52/53-week retail calendars, and restated comparatives without double counting?
3. What ROIC definition should be canonical given the strategy's ROIC > 15% hurdle: NOPAT over invested capital, and with what treatment of operating leases, goodwill, and excess cash?

**Tier 2: Data classes that would materially change plan quality.**
1. **Options chains.** The strategy specifies cash-secured puts at 0.15 to 0.30 delta, 30 to 45 DTE, targeting 12% to 18% AROC. No bid, ask, open interest, or implied volatility surface is stored. [calculate_pricing.py](../../scripts/calculate_pricing.py) accepts implied volatility as a hand-passed `--iv` argument defaulting to 0.30 for every underlying. Delta-targeted strike selection is not currently possible, which means the entire derivatives overlay is unpriced.
2. **Realized volatility and cross-position correlation.** No ATR, beta, or correlation matrix. Concentration risk across a roughly 25-name portfolio cannot be quantified, and position sizing has no volatility input.
3. **Consensus earnings estimates and surprise history.** `sec_filing_calendar.json` carries filing dates but no consensus EPS or revenue estimates, so the variant-perception scoring contemplated in [OQI-2026-08-001](open_questions_and_issues.md) has no consensus baseline to diverge from.
4. **Insider transactions (Forms 3, 4, 5) and institutional 13F flow.** Both are free Tier 1 EDGAR sources and bear directly on the forensic scrutiny the thesis protocol demands.
5. **Short interest and borrow cost.** [track_short_sellers.py](../../scripts/track_short_sellers.py) covers activist campaigns but not exchange-reported short interest, which is the quantitative complement to campaign narrative.

**Tier 3: Integrity enforcement (highest urgency).**
1. Add a validation pass asserting `previous_close == nominal_previous_close` whenever `cumulative_split_factor == 1.0`, and requiring any `|day_change_percent|` above a threshold (25% is a reasonable starting point) to be corroborated by a volume anomaly or an explicit recorded override.
2. Establish a single authoritative universe record schema, and make both `build_universe_json.py` and `quality_control.py` validate their output against it before writing, so that no repair path can silently narrow the record.
3. Determine whether schema conformance validation should be strengthened to assert substantive content. `validate_thesis.py` passed a HOFT dossier that described a residential furniture manufacturer as an Information Technology company pursuing software subscription monetization. Structural validation confirmed every required section was present while the content was categorically wrong.

### OQI-2026-08-007: Close-Only Orders for Held ETFs Outside the Equity Universe

- **Item ID**: OQI-2026-08-007
- **Date Opened**: 2026-08-28
- **Status**: OPEN
- **Related Files**: [render_plan.py](../../scripts/render_plan.py), [trading_plan_orders_schema.json](../schemas/trading_plan_orders_schema.json)

#### Question

How should the renderer permit a close-only sale of a verified held ETF that is intentionally excluded from the individual-equity research universe without weakening the prohibition on opening trades in unresearched symbols?

#### Current Conflict

`render_plan.py` rejects every order whose symbol is absent from the public equity universe before considering whether the order reduces an existing position. That is appropriate for opening purchases and option sales, but it also blocks `SELL TO CLOSE` orders for verified held ETFs. A narrow resolution should allow only a quantity-bounded close of a symbol present in the parsed account, while continuing to reject purchases, short sales, and option openings for non-universe symbols. This issue is recorded only; it is not resolved in the 2026-08-28 snapshot task.
