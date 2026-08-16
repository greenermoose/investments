# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.8.0] - 2026-08-16

### Portfolio Concentration Policy Relaxation & Conviction-Driven Sizing
- **Position Limit Clarification & Relaxation (`AGENTS.md`, `context/strategy/portfolio_constraints.md`):** Updated portfolio concentration rules to clarify that 25 positions is a soft target guideline rather than a rigid hard ceiling. Sizing is governed by conviction: with sufficiently high conviction, a trading plan can recommend concentrating down to a single position (up to 100% allocation), or expanding to 26+ holdings when multiple high-conviction ideas are present.
- **Weekly Deliberation Prompt & Plan Template Updated (`context/prompts/weekly_deliberation.md`, `examples/sample_trading_plan.txt`):** Updated agent system prompts, core constraint checklists, and standard plan headers to display `Active Holdings: [COUNT] equities (Target: ~25 or fewer)` instead of a rigid cap.
- **Documentation & UI Companion Synchronized (`README.md`, `ROADMAP.md`, `http/index.html`, `http/theses.html`, `http/docs/strategies.html`, `http/docs/architecture.html`, `http/docs/workflow.html`):** Aligned risk tables, agent cards, roadmap goals, and live web companion stats to communicate the flexible ~25 holdings soft guideline and high-conviction allocation model.

## [2.7.0] - 2026-08-16

### Strict One-Way Privacy Firewall & Equal-Footing Public Intelligence
- **Strict Privacy Firewall Codification (`AGENTS.md`):** Added Section 7 mandating an absolute one-way information flow from public intelligence (`context/`, `http/`, `scripts/`) to private execution (`private/snapshots/`, `private/plans/`). Personal portfolio states, share counts, and private cost bases are forbidden from leaking into public dossiers.
- **Equal Footing for All 144 Universe Equities (`http/index.html`, `http/universe.html`, `context/sources/investment_data_sources.md`):** Corrected legacy holdover references ("41 US equities tracked in our memory") across public portal cards, static fallback headers, and documentation to reflect the full 144-equity public universe on completely equal footing.
- **Standardized Benchmark Entry Price Across Public Theses (`context/theses/*.md`, `http/theses.html`, `http/universe.html`):** Replaced personalized terms like `Cost Basis` and `Current Shares Owned` with objective public metrics (`Benchmark Entry Price`, `Target Exit Price`, `Conviction Score`), and generalized option strategy guidance to remove assumed portfolio lot sizes.

## [2.6.0] - 2026-08-16

### Dow Jones Industrial Average (DJIA) Universe Expansion & Holdings Extraction
- **DJIA Holdings Extraction (`scripts/fetch_etf_holdings.py`, `scripts/data/dia_holdings.json`):** Configured Tier 1 SEC EDGAR Form NPORT-P extraction for SPDR Dow Jones Industrial Average ETF Trust (DIA, CIK `0001041130`), pulling all 30 constituent holdings, CUSIPs, share balances, and portfolio percentage weights.
- **ETF Holdings Discovery Skill (`.agents/skills/etf-holdings/SKILL.md`):** Updated Major Fund Trust CIK Directory with the authoritative DIA CIK `0001041130`.
- **Universe Expanded to 144 Equities:** Ingested 16 newly added blue-chip equities from the DJIA (`GS`, `CAT`, `V`, `HD`, `AXP`, `SHW`, `TRV`, `MCD`, `IBM`, `BA`, `CVX`, `PG`, `MMM`, `MRK`, `VZ`, `NKE`), merging them with the existing 128 equities (101 QQQ constituents, compounders, and watchlists).
- **SEC EDGAR XBRL Financial Pipeline Updated (`scripts/fetch_sec.py`, `scripts/build_sec_data.js`):** Ingested official 10-K and 10-Q XBRL company facts for all new DJIA constituents, computing standardized shares outstanding and TTM revenues.
- **Master Universe Catalog & Sector Classifications (`scripts/build_universe_json.py`, `http/data/universe.json`):** Enhanced sector heuristics and company descriptions across Financials, Industrials, Materials, Energy, Consumer Discretionary, Consumer Staples, Health Care, and IT, rebuilding the 144-company master universe catalog.
- **Live Web Companion Synchronized (`http/universe.html`):** Updated the public equities explorer interface to display 144 companies with complete SEC filing counts, financial metrics, and provenance deep dives.

## [2.5.0] - 2026-08-16

### Equity Universe Expansion via QQQ ETF Holdings & ETF Discovery Skill
- **ETF Holdings Discovery Skill (`.agents/skills/etf-holdings/SKILL.md`):** Recorded an authoritative workflow and skill for AI agents to discover, extract, and normalize constituents from Tier 1 SEC EDGAR Form NPORT-P filings (e.g., Invesco QQQ Trust CIK `0001067839`), fund sponsor feeds, and exchange listings.
- **ETF Holdings CLI Engine (`scripts/fetch_etf_holdings.py`):** Implemented a deterministic Python CLI tool querying SEC EDGAR submissions to parse raw portfolio XML, map CUSIPs/names to primary exchange tickers, filter non-equities, and export structured constituent manifests (`scripts/data/qqq_holdings.json`).
- **Universe Expansion to 128 Equities:** Expanded the tracked public company universe from 41 to 128 equities by ingesting all 101 Invesco QQQ Trust constituents and merging them with existing tracked compounders and watchlists.
- **Automated SEC EDGAR XBRL Pipeline (`scripts/fetch_sec.py`, `scripts/build_sec_data.js`):** Extended automated XBRL extraction across US GAAP and IFRS taxonomies, populating 511+ verified 10-K/10-Q/20-F filings, shares outstanding, balance sheet items, and TTM revenues.
- **Master Universe Catalog (`scripts/build_universe_json.py`, `http/data/universe.json`):** Synthesized qualitative moat profiles, valuation metrics, and SEC metrics across all 128 equities into `http/data/universe.json`.
- **Enhanced Public Web Explorer (`http/universe.html`):** Updated the live web interface with dynamic counter statistics (128 equities, 511+ filings indexed), real-time search, extended sector dropdown filters (Utilities, Energy, Materials, Real Estate), and SEC provenance deep-dive drawers.
- **Authoritative Sources Catalog Updated (`context/sources/catalog.md`, `context/sources/investment_data_sources.md`):** Added Form NPORT-P and ETF discovery architectures to official data provenance documentation.

## [2.4.0] - 2026-08-16

### Plain-Text Weekly Trading Plan Standardization & Purge of Misleading Examples
- **Purged Misleading Markdown Plan Examples:** Removed `examples/sample_trading_plan.md` and legacy markdown table examples from `http/docs/workflow.html` that previously showed hard-to-read markdown pipe tables for weekly trading plans.
- **Enforced Plain ASCII Text Standard:** Standardized all weekly trading plan outputs to human-centric plain ASCII text (`YYYY-MM-DD-plan.txt`) across the repository, embedding structured ASCII section dividers, sequential multi-portfolio isolation, single-session set-and-forget Monday 9:30 AM ET order blocks, deterministic order-entry branching contingencies, and Friday automated expiration expectations.
- **Web Workflow Guide Updated (`http/docs/workflow.html`):** Updated the live web documentation to display the canonical plain-text trading plan example and articulate execution principles clearly.
- **Agent Prompts & Canonical Template (`context/prompts/weekly_deliberation.md`):** Embedded the full plain-text trading plan template directly into the Lead Portfolio Manager deliberation prompt, with explicit prohibitions against markdown tables and ambiguous options.
- **Formal Trading Plan Schema (`context/schemas/trading_plan_schema.json`):** Created a JSON schema defining the required structural fields, portfolio snapshot properties, order entry attributes, and settlement expectations.
- **Repository Guidelines & Roadmap Synchronized (`AGENTS.md`, `ROADMAP.md`, `README.md`, `examples/README.md`):** Updated repository rules, phase milestone 5.3, and onboarding docs to ensure complete alignment across human and AI agent workflows.

## [2.3.0] - 2026-08-16

### Data Sources Catalog, Provenance Framework & Errata Protocols
- **Authoritative Data Sources Hierarchy (`context/sources/catalog.md`):** Codified a strict 5-tier source hierarchy spanning Tier 1 Primary Regulatory/Exchanges (SEC EDGAR, CBOE, NYSE), Tier 2 Institutional Aggregators & Macro (FRED, US Treasury, Yahoo Finance), Tier 3 Quantitative Literature, Tier 4 AI Agent Parametric Knowledge, and Tier 5 Private Brokerage Snapshots.
- **Access Methodologies & Execution Protocols (`context/sources/access_methodologies.md`):** Documented deterministic retrieval scripts (`scripts/fetch_sec.py`), web/URL research workflows, rate-limiting rules, and SEC compliance.
- **AI Agent Parametric Knowledge & Self-Description Standard:** Established standard runtime context signatures allowing AI agents to source information from internal weights (pre-training, SFT, RL) transparently by recording system clock timestamps, active role personas, and prompt context when base model metadata is not directly exposed.
- **JSON Schemas (`context/schemas/`):** Created `data_provenance.json` for granular fact/metric provenance tracking and `errata_schema.json` for structured error invalidation and corrections.
- **Data Verification & Errata Log (`context/research/errata_log.md`):** Established an audited verification lifecycle with primary source reconciliation and errata tracking.
- **Web Documentation (`http/docs/sources.html`):** Added a dedicated interactive documentation page for data sources, provenance, agent self-description, and verification protocols, updating navigation across the entire web suite.
- **Repository Guidelines (`AGENTS.md`):** Added Section 6 enforcing data source tiers, agent parametric knowledge documentation, and errata correction workflows.

## [2.2.0] - 2026-08-15

### Audience-First Repository Restructuring & Web Companion
- **Audience Segmentation:** Restructured the entire repository hierarchy by primary consumer:
  - `context/` for AI Agents (prompts, markdown thesis memory in `context/theses/`, schemas, and strategy rules).
  - `http/` for Humans (responsive web companion with rich documentation in `http/docs/`, public company metrics in `http/data/`, and options visualizers).
  - `scripts/` for CLI Deterministic Tools (Python/Node data engines with local caches in `scripts/data/`).
  - `private/` for Confidential User Data (snapshots and simple plain text/Markdown trading plans).
  - `scratch/` for Local Sandbox (git-ignored exploratory workspace).
- **Human-Facing Web Documentation (`http/docs/`):** Created responsive HTML documentation hub and dedicated guides covering system architecture, investment strategies, options modeling, valuation frameworks, and weekly deliberation workflows.
- **Decommissioned Legacy Servers & Test Scripts:** Removed `server.py` and `test.py`; web assets are now served directly using standard static servers (`python -m http.server -d http 8080`).
- **Purged Legacy Directories:** Migrated top-level `docs/` into `http/docs/` and `context/`, and migrated `data/` into `context/theses/` and `http/data/`.

## [2.1.0] - 2026-08-15

### Privacy & Open-Source Collective Intelligence Restructuring
- **Private Data Layer (`private/`):** Created dedicated top-level `private/` directory with `private/snapshots/` for real user screenshots/brokerage CSVs and `private/plans/` for personalized weekly trading plans and Monday limit order sheets. Listed `private/` permanently in `.gitignore`.
- **Public Workflow Templates (`examples/`):** Converted `examples/` from gitignored storage into tracked public onboarding templates with `sample_portfolio.csv`, `sample_trading_plan.md`, and `README.md`.
- **Legal & Risk Disclosure (`DISCLAIMER.md`):** Added comprehensive "Use at Your Own Risk", educational use only, and not financial advice disclaimer.
- **Documentation Updates:** Updated `README.md`, `ROADMAP.md`, and guides to reflect the privacy architecture and dual-path execution flow.

## [2.0.0] - 2026-08-15

### Major Strategic Pivot: Agentic Investment Advisor & Context Provider
Completely overhauled repository architecture, documentation, and focus from general research/scraping into an intelligent multi-agent investment context engine.

### Added
- **Multi-Agent Architecture:** Specialized agent roles including Portfolio Ingestion Agent, Thesis & Memory Agent, Universe Screener, Derivatives & Limit Pricing Specialist, and Lead Portfolio Manager.
- **Portfolio Rules & Constraints:** Strict, codified guidelines—US exchange public equities only, `SGOV` as the sole cash-equivalent ETF, 100% Cash-Secured Puts (CSPs) and Covered Calls (CCs) on >= 100 shares, max 25 concentrated holdings, and weekly trade execution.
- **Persistent Thesis Memory System:** Markdown dossiers tracking initial thesis, catalyst timelines, price targets, expected annualized ROI, and explicit invalidation triggers across weekly runs.
- **Theoretical Options Modeling & Weekend Limits:** Black-Scholes and volatility modeling framework for generating accurate Monday morning limit orders for CSPs, CCs, and position rolls when markets are closed over the weekend.

## [1.0.0] - 2026-08-01

### Added
- Initial repository setup with preliminary investment research and basic documentation.
