# Agent Guidelines & Repository Rules

## 1. No Emojis Policy
- **CRITICAL**: Never include emojis (pictographs, smileys, symbols, or colored glyphs) in any file in this repository.
- This applies to all file types including source code (`.js`, `.py`, `.html`, `.css`), configuration files (`.json`, `.yaml`), markdown documentation (`README.md`, `ROADMAP.md`, `CHANGELOG.md`, `context/**/*.md`), comments, and commit messages.
- Use clean, standard ASCII text and symbols only for headings, bullet points, summaries, and descriptions.

## 2. Markdown Formatting Standards
- Do not use standalone horizontal rule dividers (`---`) between sections in Markdown documents.
- Rely on structured header levels (`#`, `##`, `###`, `####`) and clean paragraph spacing for visual organization.
- Keep table syntax standard (e.g. `| :--- |`) and frontmatter delimiters only where strictly required by configuration parsers.

## 3. Directory & Audience Structure
- `context/`: Primary store for AI agents:
  - `context/data/`: Complete structured datasets for AI agents (`universe.json`, `market_prices.json`, `sec_reports.json`, and `context/data/equities/<TICKER>.json`).
  - `context/theses/`: Persistent markdown thesis dossiers (`context/theses/<TICKER>.md`) for all universe equities.
  - `context/prompts/`, `context/schemas/`, `context/sources/`, `context/strategy/`, `context/research/`: Multi-agent protocols, schemas, and research logs.
- `scripts/`: Deterministic Python and Node.js CLI tools, caching local databases in `scripts/data/`.
- `http/`: Public human web interface with documentation in `http/docs/` and public metrics in `http/data/`.
- `private/`: User confidential data (brokerage snapshots in `private/snapshots/`, simple plain text/Markdown trading plans in `private/plans/`). Never commit files in `private/`.
- `scratch/`: Local git-ignored sandbox for temporary test scripts.

## 4. Multi-Portfolio Handling & Trading Plan Formatting Rules
- **Multi-Portfolio Isolation**: When multiple portfolio snapshots exist in `private/snapshots/` (e.g. separate accounts across CSV and image files), agents must parse and analyze each portfolio separately. Never merge distinct portfolios into a single blended action table.
- **Sequential Execution Layout**: The trading plan must present each portfolio as a completely self-contained section so the human trader can execute all trades for Portfolio 1, then proceed to Portfolio 2.
- **Human-Centric Plain-Text Formatting**: Weekly trading plans written to `private/plans/` (`YYYY-MM-DD-plan.txt`) must strictly use plain ASCII text formatting conforming to `context/schemas/trading_plan_schema.json`. Never output Markdown pipe tables, bulleted markdown summaries, or markdown formatting for trading plans. Use clear ASCII section headers, indentation, and step-by-step numbered order blocks.
- **Standard Per-Portfolio Plan Structure**:
  1. Account Snapshot: Total Value, Cash Balance, SGOV proxy, Dry Powder, Position Count.
  2. Monday 9:30 AM ET Orders: Numbered list specifying Action, Symbol, Quantity, Order Type (Limit), Limit Price, Est. Cash Impact, and Rationale.
  3. Friday Expiration & Assignment Expectations: Explicit outcome expectations for open options expiring that week.

## 5. Investment Strategy Mandate & Execution Cadence Rules
- **Core Investment Objective & 20-Year Hurdle**: All recommendations across all accounts must maximize the probability of achieving an annualized return on investment of 20% or higher over a 20-year horizon. We consider it a definitive failure of our investment strategy if total annualized return is less than 20% after 20 years of placing trades.
- **Active US Public Equities Focus vs. Passive Indexing**: While acknowledging the academic and market literature regarding passive index funds and mutual funds, we do not buy and hold index funds or mutual funds. Instead, we actively buy and sell individual common stocks of public companies listed on US exchanges (NYSE, NASDAQ, AMEX) to generate alpha.
- **Empirical Strategy Grounding**: Recommendations must be grounded in extensive empirical research identifying credible investment strategies that have demonstrated the ability to generate 20% or greater annualized returns across multiple years and market cycles.
- **Dual Indicator Entry & Exit Determination**: Determination of entry prices and exit prices must synthesize both fundamental analysis (e.g. ROIC, FCF conversion, 13-quarter revenue trajectory, earnings power, margin of safety) and technical indicators (e.g. key support/resistance levels, trend structures, momentum, and volatility channels).
- **Derivatives for Yield Enhancement & Downside Mitigation**: To increase overall return on investment and mitigate downside risk, the strategy systematically sells options:
  - Cash-Secured Puts (CSPs): Sold on high-conviction BUY candidates at conservative valuation strikes to collect upfront premium and establish discounted entry basis.
  - Covered Calls (CCs): Sold against existing 100-share blocks approaching fair value exit targets to harvest incremental yield and structure disciplined exits.
- **Strict Derivatives Risk Controls & Prohibitions**:
  - NO Option Buying: Never buy long call or long put options (no speculative premium outlays or debit spreads).
  - NO Naked Option Selling: Never sell naked puts or naked calls.
  - 100% Collateralization: Every put sold must be 100% secured by cash or SGOV cash proxy. Every call sold must be 100% secured by underlying shares.
- **Portfolio Concentration & Position Guideline**: Aim for approximately 25 or fewer active equity holdings per portfolio. This is a soft target guideline rather than a rigid hard limit. Sizing is conviction-driven: with high enough conviction, a trading plan may recommend holding only a single position (up to 100% allocation), or expanding to 26+ holdings if high-conviction opportunities warrant it.
- **Zero Ambiguity / No "You Decide" Policy**: Agents must never present open-ended choices, conditional "if you want" dilemmas, or multiple optional paths (e.g. "do X or Y depending on your risk tolerance"). Every position must have a single, definitive, high-conviction recommendation.
- **Single-Session "Set-and-Forget" Cadence**: The human trader has a demanding full-time job and executes all recommendations in one single session (Monday 9:30 AM ET or as soon as they can access the account). There is zero mid-week monitoring or babysitting. Never output "mid-week watchlists" or instructions like "wait until price hits X mid-week and then place order Y."
- **Execution-Time Contingencies & Broker Conditions**: If market conditions may differ when the trader places orders, provide deterministic execution-time branching (e.g. "If ticker >= $X at order entry, submit Limit Order A; if ticker < $X, submit Limit Order B instead") or broker-native contingent / GTC limit orders entered during the same single session.
- **Hands-Off Expiration & Settlement**: Friday option expirations, cash assignments, and call-aways settle automatically with the broker at 4:00 PM ET with zero mid-week intervention. The weekend snapshot records execution outcomes and updates the state for the following week.

## 6. Data Provenance, Parametric Knowledge & Verification Rules
- **Source Authority Hierarchy**: Adhere strictly to the 5-tier source hierarchy defined in `context/sources/catalog.md`. Tier 1 Primary Regulatory Filings (SEC EDGAR) and Direct Exchange Feeds always supersede secondary aggregators (Tier 2) and agent parametric memory (Tier 4).
- **Agent Parametric Knowledge & Self-Description**: It is fully acceptable for AI agents to source information from pre-training, supervised fine-tuning (SFT), and reinforcement learning (RL) without external tools. However, this provenance must be explicitly marked (`TIER_4_AGENT_PARAMETRIC_KNOWLEDGE`). When an agent does not have access to telemetry revealing its base model name or cutoff date, it must provide a transparent runtime context signature (recording system clock timestamp, active role persona, and user prompt context).
- **Verification & Errata Workflow**: When any stored claim, financial figure, or assumption is identified as erroneous, stale, or hallucinated, agents must follow the reconciliation workflow: verify against Tier 1 SEC data, update the affected dossier or data file in place, and record the entry in `context/research/errata_log.md` conforming to `context/schemas/errata_schema.json`.

## 7. Strict One-Way Privacy Firewall & Equal-Footing Public Intelligence
- **Strict One-Way Information Flow**: Information flows strictly from the public intelligence layer (`context/`, `http/`, `scripts/`) to the private execution layer (`private/snapshots/` and `private/plans/`). Public market research and SEC filings are personalized with private user portfolios to generate weekly trading plans. Private data (account holdings, share quantities, personal cost bases, cash balances) must NEVER bleed back into public dossiers, public data files, or web pages.
- **Equal Footing for All Universe Equities**: All equities in the tracked public universe (e.g. 144 US exchange-listed constituents across QQQ, DIA, and SMH) exist on completely equal footing in public intelligence. Agents must never treat equities differently or assign preferential status simply because an equity happens to be held in a private portfolio snapshot.
- **Standardized Public Thesis Nomenclature**: Public thesis dossiers (`context/theses/*.md`) and public UI components must use objective market terminology such as `Benchmark Entry Price` (replacing personalized terms like `Cost Basis` or `Current Shares Owned`). Objective option strategies (e.g. target Delta bands and strike selection criteria) are recorded generically without assuming private share quantities.

## 8. Web Interface & Grid Card Layout Design Constraints
- **Locked 2x2 Grid Card Financial Metrics Matrix**: The financial metrics display on all public equity grid cards (`http/js/components/stocks/GridCard.js`) is permanently locked down. Agents must NEVER alter, replace, or redesign this 2x2 layout:
  - Top-Left: `Target ROI` - Single annualized percentage only (e.g. `20%` or `22.0%`). Never display total ROI or both annualized and total ROI on grid cards. Grounded in the deterministic Return Engine using parameters established by the Investment Thesis Agent synthesized from Equity Research and Memory Agent context.
  - Top-Right: `Shares Out. (B)` - Diluted shares outstanding scaled in billions (e.g. `0.595` or `14.69`).
  - Bottom-Left: `TTM Revenue (B)` - Trailing twelve months revenue in billions (e.g. `$32.67`).
  - Bottom-Right: `Enterprise Value (B)` - Enterprise value in billions (e.g. `$120.5` or `$715.17`).
