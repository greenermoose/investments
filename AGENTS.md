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
- `context/`: Primary store for AI agent prompts, markdown thesis dossiers (`context/theses/`), schemas, and strategy rules.
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

## 5. Decisive Recommendations & Execution Cadence Rules
- **Core Investment Objective**: All recommendations across all accounts must maximize the probability of achieving an annualized return of 20% or higher over a 20-year horizon.
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




