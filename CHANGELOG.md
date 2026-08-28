# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.22.0] - 2026-08-27

### Universe Expansion: 25 High-Conviction Public Equities Onboarded (150 to 175 Equities)
- **Market-Wide Screening & Stage 1 Triage:** Screened public US equity markets and SEC filings for 25 high-conviction companies with durable economic moats, positive cash flows / strong balance sheet solvency, and high compounding potential:
  - Technology & Semiconductors: `TSM`, `ORCL`, `ANET`, `APH`, `TTD`, `NET`, `MDB`, `SNOW`
  - Healthcare & Life Sciences: `LLY`, `ABBV`, `TMO`, `ABT`, `DHR`, `BSX`, `SYK`
  - Industrials & Electrification: `GE`, `ETN`, `VRT`, `DE`, `UNP`, `LMT`
  - Financials & Market Infrastructure: `SPGI`, `BLK`, `MS`
  - Mobility & Platform Logistics: `UBER`
- **Deterministic Data Ingestion & Pricing (`scripts/fetch_sec.py`, `scripts/fetch_market_prices.py`, `scripts/fetch_analyst_targets.py`):** Ingested live SEC EDGAR XBRL filings, verified market prices and 52-week technical bounds, and Wall Street analyst price targets and research links for all 25 new equities into `http/data/` and `context/data/`.
- **Institutional Research & Moat Curation (`scripts/curate_business_profiles.py`, `scripts/curate_competitive_moats.py`, `scripts/build_off_balance_sheet_data.py`):** Authored bespoke 2-paragraph business profiles, comprehensive competitive moat analyses, and forensic off-balance sheet liability audits for all 25 new companies.
- **Institutional Investment Thesis Dossiers (`context/theses/*.md`, `scripts/generate_all_theses.py`):** Generated complete institutional thesis dossiers for all 25 new equities (expanding total thesis store to 175 active universe dossiers), strictly conforming to `context/schemas/investment_thesis_schema.json` with 13-quarter revenue matrices, 6-horizon shares outstanding, and 4-horizon price target trading ranges.
- **Master Universe & Secondary Registries Re-Synthesis (`scripts/build_universe_json.py`, `scripts/anticipate_sec_filings.py`, `scripts/surveil_sentiment.py`, `scripts/track_short_sellers.py`):** Rebuilt master catalogs (`http/data/universe.json`, `context/data/universe.json`), SEC filing calendar, investor sentiment surveillance, and short seller registries across all 175 universe constituents.
- **Quality Control & Schema Conformance (`scripts/quality_control.py`, `scripts/validate_thesis.py`):** Verified 100% schema conformance across all 175 thesis dossiers and achieved a clean Quality Control Audit report with 0 errors and 0 warnings.

## [2.21.0] - 2026-08-27

### Buy-to-Close (BTC) Risk Control on Losing Propositions & Invalidation
- **Strategy Rule & Clarification (`AGENTS.md`, `context/strategy/options_modeling.md`, `context/strategy/portfolio_constraints.md`, `context/strategy/valuation_framework.md`, `context/strategy/avoid_vs_sell_framework.md`):** Codified Buy to Close (BTC) on losing propositions and invalidated theses across all core strategy documents. Explicitly distinguished between prohibited speculative long option buying (outright calls/puts/debit spreads) and permitted defensive BTC orders on short options to prevent assignment on falling stocks (short puts) or liberate locked shares for immediate liquidation (short calls).
- **Agent Skill & Prompt Integration (`.agents/skills/pricing/SKILL.md`, `.agents/skills/memory/SKILL.md`, `.agents/skills/lead-portfolio-manager/SKILL.md`, `.agents/skills/investment-thesis/SKILL.md`, `context/prompts/weekly_deliberation.md`):** Updated Memory Agent invalidation alert protocols to mandate immediate BUY TO CLOSE orders; updated Pricing Agent with BTC pricing mechanics; updated Lead Portfolio Manager to output Monday open BTC limit orders.
- **Deterministic Pricing CLI (`scripts/calculate_pricing.py`):** Added `btc` subcommand (Mode 4: Buy-to-Close Calculator) to calculate limit buyback prices, single-session fill buffers, debit cash impact, and unlocked collateral / shares.
- **Deterministic Trading Plan Generator (`scripts/generate_plan.py`):** Integrated automatic `BUY TO CLOSE` order generation for open short options on downgraded positions (`SELL` or `AVOID`).
- **Web Documentation & Guides (`http/docs/strategies.html`, `http/docs/options.html`, `http/docs/architecture.html`, `http/docs/workflow.html`, `http/guide.html`, `http/index.html`):** Updated public documentation and strategy tables with detailed explanations of Buy-to-Close mechanics and capital preservation principles.

## [2.20.0] - 2026-08-18

### Permanent Precision Article Search Permalinks for Analyst Coverage
- **Bypassing Ephemeral Intraday Feeds (`scripts/fetch_analyst_targets.py`, `scripts/reprocess_analyst_targets.py`):** Eliminated ephemeral homepage links (such as The Fly or Benzinga feeds where stories expire after 24-48 hours and get buried behind ads).
- **Precision Article Search Permalinks (`scripts/data/analyst_price_targets.json`, `context/data/universe.json`, `http/data/universe.json`):** Transitioned all 1,399 analyst records across 144 equities to precision Google Search permalinks (`https://www.google.com/search?q="{Analyst}"+"{Firm}"+{Ticker}+price+target`). These URLs bypass homepages and directly surface the full-text coverage articles from major financial publications across all past and future announcement dates.
- **Methodology Documentation (`context/sources/access_methodologies.md`):** Updated access methodologies to formalize the precision search permalink architecture for Tier 2 analyst research verification.

## [2.19.0] - 2026-08-18

### Sell-Side Analyst Press Release Integration, Direct News Agency Coverage & Announcement Price Bug Fix
- **Direct Press Release & News Agency Integration (`scripts/fetch_analyst_targets.py`, `scripts/data/analyst_price_targets.json`):** Transitioned analyst coverage away from generic aggregator hubs to direct financial newswires and news agency articles (The Fly, Benzinga, StreetInsider, Seeking Alpha News, Yahoo Finance News) broadcasting sell-side research notes with analyst name, firm, date, and price target.
- **Historical Market Price at Announcement Bug Fix (`scripts/fetch_analyst_targets.py`, `scripts/reprocess_analyst_targets.py`):** Resolved root cause in `fetch_analyst_targets.py` where today's stock quote was applied statically to all historical records. Recomputed exact historical closing prices for each target announcement date across all 1,399 records in the universe.
- **Company Modal UI Table Update (`http/stocks.html`, `http/js/components/stocks/ModalDrawer.js`):** Renamed the table column header from "Research Report Title" to "Press Release", linking directly to the news agency press release articles.

## [2.18.0] - 2026-08-18

### Expanded Data Hierarchy, Aggregator Classifications, Analyst Research Discovery & Neural Parametric Governance
- **Expanded Master Sources Hierarchy & Directory (`context/sources/catalog.md`, `http/docs/sources.html`):** Codified a complete 22-source master directory mapping every specific public URL, authority tier, access protocol, and reliability score across primary regulatory feeds (SEC EDGAR Facts, Submissions, NPORT-P, Master Tickers, NASDAQ FTP, CBOE, NYSE), macro databases (FRED, US Treasury), institutional APIs (FMP, Polygon.io, Tiingo), and secondary aggregators.
- **Classification & Trust Assessment of Key Data Aggregators:** Formally evaluated and documented the role and trustworthiness of key financial aggregators:
  - `Yahoo Finance` (https://finance.yahoo.com/): Tier 2 Secondary Market Data & News Aggregator (8.0/10) for daily OHLCV candlesticks, 20d/50d SMAs, and 52-week support/resistance bands.
  - `TipRanks` (https://www.tipranks.com/): Tier 2 Analyst Accountability & Sentiment Aggregator (8.5/10) for tracking individual sell-side analyst track records, historical win rates, and price target revisions.
  - `StockAnalysis.com` (https://stockanalysis.com/): Tier 2 Secondary Fundamental Screener & Portal (8.0/10) for multi-year financial statements and consensus metrics, subject to mandatory Tier 1 SEC cross-checks.
  - `MarketBeat` (https://www.marketbeat.com/): Tier 2 Wall Street Analyst Price Target & Rating Aggregator (8.5/10) for time-stamped rating changes and audited URL links.
  - `Morningstar` (https://www.morningstar.com/): Tier 2 Institutional Fundamental Research Authority (8.8/10) for Economic Moat ratings (Wide/Narrow/None) and DCF fair value estimates.
- **Sell-Side Analyst Reports & Price Target Discovery Workflow (`context/sources/catalog.md`, `context/sources/access_methodologies.md`, `http/docs/sources.html`):** Documented the institutional equity research ecosystem, explaining how proprietary sell-side research behind enterprise terminal paywalls (Bloomberg, FactSet, Refinitiv) is broadcast across pre-market newswires (6:00 AM - 9:00 AM ET) and ingested into normalized schemas with ground-truth URLs.
- **AI Agent Search Engines & Live Ingestion Tools:** Documented search engines and fetch tools (`search_web`, `read_url_content`, headless browser subagents, SEC EDGAR Full-Text Search EFTS) for live catalyst investigation and footnote extraction.
- **Neural Internal Weights & Parametric Knowledge Generation Protocol:** Detailed how foundation LLM transformers compress market intelligence into high-dimensional weights during pre-training, activate latent pathways via self-attention, compute next-token logits, and align outputs via SFT/RLHF, while enforcing Tier 4 provenance tagging, runtime context signatures, and SEC ground-truth cross-checks.

## [2.17.0] - 2026-08-17

### 144-Equity Market Price Ingestion, Context Data Layer & Bidirectional Synchronization
- **Live Market Price & Technical Ingestion (`scripts/fetch_market_prices.py`):** Ingested live market quotes, 30-day daily OHLCV candlesticks, 52-week ranges, 20d/50d SMAs, volume breakout ratios, and 20-day technical support/resistance levels for all 144 public equities in the universe with 100% success.
- **Context Data Layer (`context/data/`):** Established dedicated, comprehensive structured data stores under `context/` for direct consumption by AI agents:
  - `context/data/universe.json`: Master catalog of all 144 equities with fundamentals, multiples, and ROI models.
  - `context/data/market_prices.json`: Live exchange quotes, OHLCV candle history, and technical indicators.
  - `context/data/sec_reports.json`: Consolidated SEC XBRL financial metrics (shares outstanding, TTM revenue, debt, cash).
  - `context/data/equities/<TICKER>.json`: Complete individual SEC filings and balance sheets for all 144 equities.
- **Full Universe Thesis Dossiers (`context/theses/*.md`, `scripts/generate_all_theses.py`):** Expanded markdown investment thesis dossiers from 7 to 144 equities in `context/theses/`, each conforming strictly to `context/schemas/investment_thesis_schema.json` with 13-quarter revenue matrices, 6-horizon shares outstanding, 4-horizon price targets, Wall Street analyst targets, catalyst timelines, and invalidation criteria. Validated all 145 files with 100% pass rate.
- **Bidirectional Data Synchronization & Quality Control (`scripts/quality_control.py`, `scripts/build_universe_json.py`, `scripts/build_sec_data.js`):** Unified deterministic pipelines to write atomically to both `context/data/` and `http/data/`, with automated cross-store parity verification and 0 errors / 0 warnings in quality control audits.

## [2.16.0] - 2026-08-17

### AI Agent Roles Refinement, Dedicated Skills & Deterministic Scripting Suite
- **Standardized 6-Agent Ecosystem:** Refined role definitions, boundaries, and titles across all documentation and deliberation prompts:
  1. **Portfolio Ingestion Agent:** Ingests and normalizes private brokerage screenshots/CSVs, isolates distinct accounts, tags covered call eligibility, and enforces strict privacy firewalls.
  2. **Equity Research Agent:** (formerly Universe Screener & Quantitative Analyst) Proactively explores the Internet and public markets (NYSE, NASDAQ, AMEX) using tools to discover companies offering a high probability of >= 20% annualized ROI, performing solvency & runway checks rather than rigid zero-debt dogma.
  3. **Investment Thesis Agent:** Models multi-horizon 3-year quantitative forecasts (13Q revenue, 6-horizon shares, 4-horizon price targets) and dual Revenue/Valuation narratives on universe equities.
  4. **Memory Agent:** (formerly Portfolio Memory & Invalidation Agent) Manages cross-run institutional context in `context/`, audits catalyst milestones, monitors invalidation triggers, and maintains errata logs.
  5. **Pricing Agent:** (formerly Derivatives Specialist) Predicts price trends to calculate technical limit order prices for equities and models Black-Scholes pricing and Greeks for Cash-Secured Puts, Covered Calls, and net-credit rolls.
  6. **Lead Portfolio Manager:** Synthesizes sub-agent outputs into single-session, plain ASCII Weekly Trading Plans (`private/plans/YYYY-MM-DD-plan.txt`).
- **Dedicated Agent Skills (`.agents/skills/`):** Created full-fidelity, discoverable skill definitions with operational workflows, methodologies, and CLI invocations:
  - `portfolio-ingestion`: Snapshot parsing, account isolation, dry powder calculation.
  - `equity-research`: Market discovery, 20%+ ROI hurdle evaluation, solvency & runway checks.
  - `investment-thesis`: Quantitative forecasting, narrative authoring, rating logic.
  - `memory`: Institutional memory indexing, catalyst audits, invalidation alert protocols.
  - `pricing`: Technical support/resistance limit pricing, Black-Scholes Greeks, AROC hurdles.
  - `lead-portfolio-manager`: Multi-portfolio sequential synthesis, plain-text plan formatting.
- **Deterministic CLI Scripting Engine (`scripts/`):** Added deterministic command-line tools for every agent to maximize predictability, ensure reproducibility, and minimize token spend:
  - `scripts/parse_snapshot.py`: Deterministic portfolio snapshot parser.
  - `scripts/screen_market.py`: Deterministic >= 20% annualized ROI screener with solvency checks.
  - `scripts/calculate_pricing.py`: Deterministic Black-Scholes options pricer, Greeks, AROC, roll validator, and limit bounds calculator.
  - `scripts/manage_memory.py`: Deterministic context and catalyst timeline auditor.
  - `scripts/generate_plan.py`: Deterministic plain ASCII weekly trading plan scaffolding tool.
- **Repository-Wide Documentation Updates (`http/`, `context/`, `AGENTS.md`, `README.md`):** Updated architecture diagrams, cards, workflows, options documentation, and deliberation prompts.

## [2.15.0] - 2026-08-17

### Wall Street Analyst Reports & Price Targets System
- **Formal Price Target Data Structure (`context/schemas/analyst_price_target_schema.json`):** Created institutional JSON schema enforcing the 5 core attributes for all sell-side analyst price targets:
  1. `analyst_name`: Lead research analyst issuing the report (e.g. Toni Sacconaghi, Dan Ives, Toshiya Hari).
  2. `announcement_date`: Date target was announced/published (`YYYY-MM-DD`).
  3. `symbol`: Ticker symbol for the price target.
  4. `market_price_at_announcement`: Prevailing market price of the common stock as of announcement date in USD.
  5. `target_price`: 12-month forward price target per share in USD.
  - Supplementary institutional attributes: `firm`, `rating_action` (BUY, OUTPERFORM, OVERWEIGHT, HOLD, EQUAL-WEIGHT, UNDERPERFORM, SELL), `implied_upside_pct`, and `report_title`.
- **Data Sources Catalog & Ingestion Documentation (`context/sources/catalog.md`, `context/sources/investment_data_sources.md`, `http/docs/sources.html`):** Documented authoritative sell-side equity research sources across major global investment banks (Morgan Stanley, Goldman Sachs, JPMorgan Chase, Bank of America, Bernstein, Wedbush, UBS, Barclays, Baird) and institutional aggregator APIs (Financial Modeling Prep `/v4/price-target`, FactSet, Bloomberg Intelligence, LSEG/Refinitiv I/B/E/S).
- **Master Price Target Cache & Consensus Engine (`scripts/data/analyst_price_targets.json`, `scripts/build_universe_json.py`):** Seeded price targets across all 144 equities in the universe; implemented automatic consensus aggregation calculating Mean Target, Median Target, High/Low Bounds, Coverage Count, and Average Implied Upside percentage.
- **Thesis Dossier Integration (`context/theses/*.md`, `investment-thesis` skill, `scripts/validate_thesis.py`):** Added `## Analyst Price Targets & Wall Street Coverage` table to canonical dossiers and validator suite.
- **Public Web Portal Integration (`http/stocks.html`, `http/js/components/stocks/`):**
  - **Grid Card View (`GridCard.js`):** Integrated analyst consensus target price and average upside badge into equity overview cards.
  - **Dossier Card View (`DossierCard.js`):** Integrated full tabular analyst price target breakdown with analyst name, firm, date, announcement price, target price, implied upside, and rating badge.
  - **Interactive Deep-Dive Modal Drawer (`ModalDrawer.js`, `stocks.html`):** Added dedicated 5th tab `Wall Street Analyst Coverage` displaying consensus KPI summary metrics and complete individual analyst price target report history.
  - **Data Table View (`TableRow.js`, `stocks.js`):** Added sortable `Analyst Target` column with implied upside percentages.

## [2.14.0] - 2026-08-17

### Comprehensive Investment Strategy & Performance Mandate Architecture
- **20-Year Compounding Mandate & Explicit Failure Standard:** Formalized the core performance hurdle of achieving an annualized return on investment of >= 20% over a 20-year horizon, with total annualized return < 20% after 20 years explicitly defined as a failure of the investment strategy.
- **Active US Equities Selection vs. Passive Funds:** Formulated the deliberate active selection policy focusing on individual common stocks listed on US exchanges (NYSE, NASDAQ, AMEX) rather than buying and holding index or mutual funds.
- **Empirical Multi-Year 20%+ Research Grounding:** Grounded all thesis models and trading strategies in extensive empirical research into credible investment methodologies demonstrated to achieve 20%+ returns across multiple historical market cycles.
- **Dual Fundamental & Technical Entry/Exit Synthesis:** Integrated fundamental intrinsic valuation (13-quarter revenue path, Margin of Safety, ROIC > 15%, FCF conversion) with technical indicators (50/200-day SMAs, horizontal support/resistance floors, RSI exhaustion, volatility channels) to determine precise entry and exit prices.
- **Derivatives Yield & Risk Mitigation Framework:** Detailed the systematic options overlay using Cash-Secured Puts (CSPs) for discounted accumulation and upfront yield, and Covered Calls (CCs) for yield harvesting and disciplined scaling out at valuation targets.
- **Strict Risk Prohibitions:** Codified the strict prohibition against buying options (no long calls/puts or debit spreads), selling naked options, or using margin debt, with 100% collateralization enforced for all open options.
- **AI Agent Directions & Skill Updates (`AGENTS.md`, `.agents/skills/investment-thesis/SKILL.md`, `context/strategy/`, `context/prompts/`):** Embedded the complete strategy mandate across agent rules, skill instructions, valuation guidelines, and deliberation prompts.
- **Public Documentation Redesign (`http/docs/strategies.html`):** Redesigned the investment strategy documentation with structured sections, 20-year compounding math, fundamental/technical synthesis cards, risk boundary callouts, and constraint summary tables.

## [2.13.0] - 2026-08-17

### Institutional Investment Thesis Agent & 6-Agent Sub-Agent Architecture
- **Dedicated Investment Thesis Agent Role:** Split the former unified Thesis & Memory Agent into two specialized roles:
  - **Investment Thesis Agent:** Synthesizes public SEC EDGAR 10-K/10-Q filings, earnings releases, and industry trends to construct forward-looking 3-year quantitative forecasts, detailed Revenue and P/S Multiple narratives, and assign decisive `BUY`, `HOLD`, `SELL`, or `AVOID` ratings.
  - **Portfolio Memory & Invalidation Agent:** Audits active holdings against persistent dossiers, monitors multi-quarter catalyst milestones, tracks explicit invalidation exit triggers, maintains the errata log, and issues liquidation alerts for broken theses.
- **Formal Institutional Thesis Schema (`context/schemas/investment_thesis_schema.json`):**
  - **13-Quarter Revenue Forecast Matrix ($Q_0$ to $Q_{12}$):** Explicit quarterly revenue path covering the current quarter and 12 subsequent quarters (3 full years) with YoY growth rates and segment drivers.
  - **6-Horizon Shares Outstanding Projections:** Projections across 13, 26, 39, 52, 104, and 156 weeks incorporating buyback run-rates and SBC offset.
  - **4-Horizon Price Target Trading Ranges:** Bear, Base, and Bull bounds for 13 weeks, 52 weeks (1 year), 104 weeks (2 years), and 156 weeks (3 years).
  - **Dual Qualitative & Valuation Narratives:** Mandatory `revenue_drivers_narrative` (explaining why revenue will happen) and `valuation_ps_multiple_narrative` (explaining why the P/S multiple and valuation dynamics explain price action).
  - **Decisive Rating System:** Strict `BUY`, `HOLD`, `SELL`, or `AVOID` rating logic based on 3-year expected CAGR and margin of safety.
- **Investment Thesis Skill Package (`.agents/skills/investment-thesis/SKILL.md`):** Complete institutional guidelines, mathematical formulations for price targets and CAGRs, segment revenue breakdown methods, share count dilution/burn rate models, and rating hurdles.
- **Deterministic Thesis Validator (`scripts/validate_thesis.py`):** CLI utility validating all thesis dossiers against the institutional schema and verifying 13-quarter, 6-horizon, and 4-horizon table structures.
- **Dossier Upgrades (`context/theses/*.md`):** Upgraded `EXAMPLE_THESIS.md`, `AAPL.md`, `NVDA.md`, `MSFT.md`, `GOOGL.md`, `META.md`, and `BRK-B.md` to conform fully with the new schema.
- **Documentation Updates (`http/index.html`, `http/docs/architecture.html`, `README.md`, `ROADMAP.md`, `context/prompts/weekly_deliberation.md`):** Updated architecture diagrams, cards, and execution sequences to reflect the 6-agent deliberative pipeline.

## [2.12.0] - 2026-08-17

### Deterministic Investment Return Engine & Target ROI Grounding
- **Pure Python Return Engine (`scripts/return_engine.py`):** Developed a deterministic mathematical calculation engine computing unannualized Total ROI (%) and Compound Annual Growth Rate (CAGR / Annualized ROI %) across multi-year holding horizons.
- **Purchase & Sale Strategy Modeling:**
  - `SELL_CSP`: Cash-Secured Put entry modeling upfront put premium collections ($/sh) and discounted net capital outlay.
  - `LIMIT_BUY`: Baseline direct limit order entry at benchmark price.
  - `SELL_COVERED_CALLS`: Multi-year covered call yield harvesting modeling cumulative call premium proceeds ($/sh) alongside capital appreciation targets.
  - `LIMIT_SELL`: Direct limit order exit targets.
- **Formal Return Engine Schema (`context/schemas/return_engine_schema.json`):** Defined strict JSON schema specification for thesis parameters, options proceeds, date ranges, cash outlays, proceeds, and calculated CAGR metrics.
- **Universe Integration (`scripts/build_universe_json.py`):** Integrated `return_engine.py` to evaluate investment theses for all 144 universe equities, synchronizing `scripts/data/company_meta.json` and `http/data/universe.json`.
- **Quality Control Audit Integration (`scripts/quality_control.py`):** Added validation checks enforcing return engine strategy enum conformance and numerical CAGR verification.
- **Web UI & Modal Drawer Enhancement (`http/stocks.html`, `http/js/components/stocks/`):**
  - Updated `GridCard.js`, `DossierCard.js`, and `TableRow.js` with dynamic Return Engine strategy pills, harvest metrics, and annualized ROI sorting.
  - Built interactive "Return Engine Execution & Return Breakdown" panels in `ModalDrawer.js` (Overview and Options Strategy tabs), displaying full cash flow decomposition, capital gains vs options yields, and annualized compound growth.

## [2.11.0] - 2026-08-17

### Deterministic Quality Control Tool (scripts/quality_control.py) & Data Integrity Hardening
- **Deterministic Quality Control CLI (`scripts/quality_control.py`):** Developed a comprehensive audit and repair CLI engine supporting non-destructive diagnostic scanning (`--audit`) and automated data repair (`--fix`).
- **Comprehensive Quality Check Suite:**
  - `Valid Stock Symbols`: Formats, special class tickers (`BRK-B`), and real exchange equity verification.
  - `Company Name & Symbol Concordance`: Eliminates name distortions and ensures concordance across `company_meta.json`, `market_prices.json`, `universe.json`, `sec-data.json`, and individual JSON files.
  - `Stock Prices & Technical Bounds`: Validates non-zero positive prices, day change math, percentage calculations, 52-week high/low ranges, support/resistance ordering, and volume indicators.
  - `Index Membership Verification`: Enforces exact bidirectional constituent matching against QQQ (`qqq_holdings.json`), DJIA (`dia_holdings.json`), and S&P 500 (`spy_holdings.json`).
  - `Financial Fundamentals & Accounting Math`: Recomputes and validates market cap, enterprise value, and scale factors.
  - `Valuation & Investment Thesis Math`: Enforces rating classification integrity (`Buy`, `Hold`, `Sell`, `Avoid`), conviction scores, and CAGR/yield pricing math.
- **Discovered Data Errors Corrected:**
  - `BETA`: Fixed erroneous mapping to "Archer Aviation Inc." -> Corrected to **Beta Technologies, Inc.** (CIK `0001784570`, electric aircraft & charging infrastructure), ingested live exchange quotes, and replaced synthetic benchmark records.
  - `XYZ`: Verified and grounded ticker change for **Block, Inc.** (formerly Square, Inc. ticker `SQ`, changed to `XYZ` on Jan 21, 2025). Replaced synthetic placeholder with live market data ($80+ price, technical levels, and multi-year financial history).
  - `MSTR`: Fixed truncated name from "Strategy Inc." to **MicroStrategy Incorporated**.
  - `MAR`, `ZM`, `FER`, `ARM`, `LIN`, `STX`: Corrected minor casing and punctuation inconsistencies across market price and metadata caches.
- **Authoritative Errata Logging (`context/research/errata_log.md`):** Logged structured errata records for all resolved anomalies conforming to `context/schemas/errata_schema.json`.

## [2.10.0] - 2026-08-16

### Consolidated Public Equities Explorer (stocks.html) & Navigation Refactoring
- **Consolidated Public Equities Interface (`http/stocks.html`):** Merged `http/universe.html` and `http/theses.html` into a single, cohesive, high-performance explorer.
- **HCI & Multi-View Switching:** Implemented progressive disclosure with dynamic view mode toggles:
  - `Grid Cards`: Fast visual exploration with company price prediction ranges, status chips, index badges, and 1-click modal deep dives.
  - `Expanded Dossiers`: In-depth fundamental view displaying full thesis text, competitive moat cards, catalyst calendar, and invalidation triggers directly on the page.
  - `Dense Data Table`: High-density comparative table with instant sorting across conviction, symbol, target ROI, and enterprise value.
- **Left Navigation Rail Refactored:** Consolidated `Company Universe & SEC` and `Investment Theses` into a single `Public Equities` link across all 10 portal and documentation pages.
- **Instant Client-Side Redirects (`http/universe.html`, `http/theses.html`):** Added zero-latency client redirects to prevent broken bookmarks or external links.
- **URL Hash Deep Linking:** Enabled `#SYMBOL` deep linking (e.g. `stocks.html#NVDA`) to automatically open company dossiers and interactive modal tabs on load.

## [2.9.0] - 2026-08-16

### Standardized Rating Taxonomy, Index Membership Badges & Dynamic Theses
- **Rating Taxonomy Standardization (`Buy`, `Hold`, `Sell`, `Avoid`):** Standardized all 144 public equities in the database under four definitive, objective rating classifications:
  - `Buy`: High-conviction companies capable of generating >=20% annualized ROI from capital appreciation.
  - `Hold`: High-quality, mature compounders capable of generating >=20% annualized total return via covered calls.
  - `Sell`: Equities unlikely to generate sufficient ROI; recommended to sell now to redeploy dry powder, but tracked on watchlist.
  - `Avoid`: High-risk equities with chronic cash burn, balance sheet distress, severe dilution, or warning flags.
- **Index Membership Badges & Filtering (`QQQ`, `DJIA`, `SP500`):** Extracted S&P 500 constituents from SPY NPORT-P filing (`scripts/data/spy_holdings.json`) and combined with QQQ and DIA datasets. Added visual index badge chips to company cards in `http/universe.html` and `http/theses.html`, and added an `Index Member` filter chip.
- **Filter Chips Bar (`http/universe.html`, `http/theses.html`):** Updated search controls with `All`, `Buy`, `Hold`, `Sell`, `Avoid`, and `Index Member` filter chips.
- **Real Dynamic Investment Theses (`http/theses.html`):** Upgraded `http/theses.html` from static mock examples to a dynamic explorer rendering audited investment theses, moats, catalyst timelines, and invalidation triggers directly from `data/universe.json`.
- **Dossier Memory Updated (`context/theses/*.md`):** Updated markdown dossiers for AAPL, MSFT, NVDA, GOOGL, META, and BRK-B to reflect the new rating taxonomy, index tags, and options strategy context.

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
