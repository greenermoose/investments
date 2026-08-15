# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-08-15

### Privacy & Open-Source Collective Intelligence Restructuring
- **Private Data Layer (`private/`):** Created dedicated top-level `private/` directory with `private/snapshots/` for real user screenshots/brokerage CSVs and `private/plans/` for personalized weekly trading plans and Monday limit order sheets. Listed `private/` permanently in `.gitignore`.
- **Public Workflow Templates (`examples/`):** Converted `examples/` from gitignored storage into tracked public onboarding templates with `sample_portfolio.csv`, `sample_trading_plan.md`, and `README.md`.
- **Legal & Risk Disclosure (`DISCLAIMER.md`):** Added comprehensive "Use at Your Own Risk", educational use only, and not financial advice disclaimer.
- **Documentation Updates:** Updated `README.md`, `ROADMAP.md`, `docs/architecture.md`, and `docs/weekly-workflow-and-prompting.md` to reflect the new privacy architecture and dual-path execution flow.

## [2.0.0] - 2026-08-15

### Major Strategic Pivot: Agentic Investment Advisor & Context Provider
Completely overhauled repository architecture, documentation, and focus from general research/scraping into an intelligent multi-agent investment context engine.

### Added
- **Multi-Agent Architecture (`docs/architecture.md`):** Specialized agent roles including Portfolio Ingestion Agent, Thesis & Memory Agent, Universe Screener, Derivatives & Limit Pricing Specialist, and Lead Portfolio Manager.
- **Portfolio Rules & Constraints (`docs/portfolio-constraints.md`):** Strict, codified guidelines—US exchange public equities only, `SGOV` as the sole cash-equivalent ETF, 100% Cash-Secured Puts (CSPs) and Covered Calls (CCs) on $\ge 100$ shares, max ~25 concentrated holdings, and weekly trade execution.
- **Persistent Thesis Memory System (`docs/investment-thesis-and-memory.md`):** Markdown dossiers (`data/theses/*.md`) tracking initial thesis, catalyst timelines, price targets, expected annualized ROI, and explicit invalidation triggers across weekly runs.
- **Theoretical Options Modeling & Weekend Limits (`docs/option-pricing-and-strategies.md`):** Black-Scholes and volatility modeling framework for generating accurate Monday morning limit orders for CSPs, CCs, and position rolls when markets are closed over the weekend.
- **US Equity Universe & Data Strategy (`docs/data-sources-and-universe.md`):** Architecture for maintaining the full US public company universe via free public APIs (SEC EDGAR, Yahoo Finance, FRED) and local SQLite/Parquet caching.
- **Weekly Runbook & Prompting Suite (`docs/weekly-workflow-and-prompting.md`):** End-to-end operational guide with master agent prompt templates, executive report formats, and interactive Q&A deliberation protocols.
- **Empirical Research & Execution Tracker (`docs/empirical-research-and-calibration.md`):** Strategy for synthesizing published institutional/academic options research and a lightweight Monday limit order fill & price target tracker.
- **Starter Thesis Template (`data/theses/EXAMPLE_THESIS.md`):** Production-ready reference dossier demonstrating complete catalyst and invalidation tracking.

### Changed
- **README.md:** Rewritten from scratch to detail the multi-agent system vision, overcoming chatbot evasiveness and universe blindness, core safety rules, and weekly workflows.
- **ROADMAP.md:** Restructured into 6 concrete development phases prioritizing portfolio ingestion, thesis memory, US equity universe caching, weekend options modeling, agent prompt orchestration, and empirical research calibration.

## [1.0.0] - 2026-08-01

### Added
- Initial repository setup with preliminary investment research, web server, and basic documentation.
