# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
