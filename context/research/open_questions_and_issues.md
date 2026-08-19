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
