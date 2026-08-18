# Authoritative Data Sources Catalog

This catalog defines the official data sources used by the Agentic Investment Advisor system, their authority tiers, update cadences, primary domains, and trust hierarchy.

## Source Hierarchy & Trust Architecture

When evaluating factual data, financial metrics, or valuation variables, the system adheres to a strict five-tier authority hierarchy. Higher-tier sources supersede lower-tier sources in any reconciliation conflict.

```
+-------------------------------------------------------------------------+
| Tier 1: Primary Regulatory Filings & Direct Exchange Data              |
| (SEC EDGAR, 10-K/10-Q/8-K/Form 4, CBOE, NYSE/NASDAQ Official Feeds)      |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| Tier 2: Institutional Aggregators & Official Macro Databases           |
| (FRED / Federal Reserve, US Treasury Yield Curve, Yahoo Finance, Finviz)|
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| Tier 3: Quantitative Literature & Empirical Benchmark Studies           |
| (CBOE BuyWrite/PutWrite Indices, AQR/Fama-French Factors, SSRN Papers)  |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| Tier 4: AI Agent Parametric Knowledge (Self-Described Runtime Context)  |
| (Pre-training, SFT, RL Internal Weights with Context Signature)         |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| Tier 5: Direct Human Override & Explicit Brokerage Snapshots            |
| (Private user snapshots in private/snapshots/, manual trade receipts)   |
+-------------------------------------------------------------------------+
```

## Tier 1: Primary Regulatory Filings & Direct Exchange Feeds

### SEC EDGAR System
- **Provider:** US Securities and Exchange Commission (SEC).
- **Domain:** Primary company disclosures, financial statements, insider transactions, and major material events.
- **Key Document Types:**
  - `Form 10-K`: Annual audited comprehensive financial statements, business segment breakdowns, risk factors, and notes.
  - `Form 10-Q`: Quarterly unaudited financial statements, interim balance sheet updates, and management discussion.
  - `Form 8-K`: Unscheduled material events (CEO changes, M&A announcements, major litigation, credit defaults).
  - `Form 4`: Insider equity transactions (officer/director stock purchases, sales, and option exercises).
  - `Form DEF 14A`: Definitive proxy statements, executive compensation structures, and corporate governance details.
  - `Form NPORT-P`: Monthly portfolio investment disclosures for ETFs and mutual funds, reporting complete constituent holdings, share balances, fair market values, and portfolio weights.
- **Authority Rating:** Absolute Ground Truth for historical financials, share counts, ETF constituents, and regulatory disclosures.
- **Access Protocol:** RESTful programmatic access via SEC EDGAR Company Facts API (`https://data.sec.gov/api/xbrl/companyfacts/`), submissions directory (`https://data.sec.gov/submissions/`), and Python CLI tools (`scripts/fetch_sec.py`, `scripts/fetch_etf_holdings.py`).
- **Rate Limit & Policy:** SEC enforces a strict limit of 10 requests per second. User-Agent header must specify a declared identity format: `User-Agent: Sample Company Name AdminContact@domain.com`.

### CBOE (Chicago Board Options Exchange) & Primary Equity Exchanges
- **Provider:** CBOE Global Markets, NYSE, NASDAQ.
- **Domain:** Official equity settlement prices, options chain definitions, strike listings, expiration schedules, open interest, and historical implied volatility indices (VIX, VXN).
- **Authority Rating:** Absolute Ground Truth for options contracts, expirations, strike availability, and official exchange closing prices.

### NASDAQ Trader Symbol Directory
- **Provider:** NASDAQ Market Operations / Trader Services.
- **Domain:** Authoritative daily master listings of all NASDAQ and other-exchange listed securities (`nasdaqlisted.txt`, `otherlisted.txt`), security categories, test issues, and ETF indicators.
- **Authority Rating:** Absolute Ground Truth for exchange listing status, active trading symbols, and security classification.
- **Access Protocol:** Public anonymous FTP (`ftp://ftp.nasdaqtrader.com/SymbolDirectory/`).

## Tier 2: Institutional Aggregators & Macro Databases

### Developer Financial Data & Screener APIs (FMP, Polygon.io, Tiingo)
- **Providers:** Financial Modeling Prep, Polygon.io, Tiingo, Alpaca, Finnhub, EODHD.
- **Domain:** Programmatic stock screening endpoints, real-time/delayed OHLCV market feeds, adjusted historical price series, corporate actions, and structured XBRL financial statement extracts.
- **Authority Rating:** High-reliability institutional aggregators. Built specifically for automated AI agent orchestration, programmatic querying, and algorithmic screening.
- **Comprehensive Guide:** See [Master Guide to Investment Data Sources](file:///c:/Users/fyhor/Documents/GitHub/investments/context/sources/investment_data_sources.md) for full pricing, endpoint schemas, and bot policies.

### FRED (Federal Reserve Economic Data)
- **Provider:** Federal Reserve Bank of St. Louis.
- **Domain:** Macroeconomic indicators, Fed Funds target rate, Treasury constant maturity yields (1-month, 3-month, 2-year, 10-year), CPI, GDP growth, and monetary base metrics.
- **Authority Rating:** Authoritative for macroeconomic context and risk-free hurdle rates.
- **Usage in System:** Calibrating risk-free interest rates (RFR) in Black-Scholes options pricing and discount rates for DCF valuation models.

### SGOV (iShares 0-3 Month Treasury Bond ETF) Official Data
- **Provider:** BlackRock iShares / US Treasury Department.
- **Domain:** Net Asset Value (NAV), distribution yields, 30-day SEC yield, and asset duration.
- **Authority Rating:** Authoritative benchmark for cash proxy allocation and dry powder collateral yields.

### Yahoo Finance & Aggregated Market Feeds
- **Provider:** Yahoo Finance / Direct Equity Exchanges.
- **Domain:** Daily and multi-month OHLCV candlestick series, trading volume, 20-day / 50-day moving averages, 52-week high/low ranges, volume ratios, day changes, and technical support/resistance bands.
- **Authority Rating:** High-reliability secondary data source (Tier 2). Essential for real-time and end-of-day price discovery, volume analysis, technical trend modeling, and market capitalization computation.
- **Implementation & Schema:** Full ingestion protocol, schema specifications, and mathematical grounding models are documented in [Market Price Research & Technical Analysis Methodology](file:///c:/Users/fyhor/Documents/GitHub/investments/context/sources/market_price_methodology.md) and [market_prices_schema.json](file:///c:/Users/fyhor/Documents/GitHub/investments/context/schemas/market_prices_schema.json).

### Wall Street Analyst Coverage & Price Target Aggregators
- **Providers:** MarketBeat, FactSet Research Systems, LSEG Workspace / Refinitiv I/B/E/S, Bloomberg Professional, Financial Modeling Prep, TipRanks, and Benzinga.
- **Primary Research Issuers:** Sell-side equity research departments of major global investment banks and institutional brokerages including Morgan Stanley, Goldman Sachs, JPMorgan Chase, Bank of America Global Research, Bernstein Research, Wedbush Securities, Barclays Capital, UBS Global Research, Citigroup, Jefferies, Evercore ISI, and Baird.
- **Data Access & Paywall Nature:** Primary sell-side research dossiers published by investment banks are proprietary documents distributed to institutional clients behind paywalls (Bloomberg / FactSet / institutional portals). Public secondary aggregators (Tier 2) capture and publish verified rating announcements and price target revisions.
- **Aggregator Quality & Ground-Truth Verification:** To eliminate stale or synthetic records, all analyst coverage records are ground-truthed against verified Tier 2 sources (e.g. MarketBeat dedicated forecast feeds). Every recorded entry must link to an accessible URL (`source_url`) where the analyst name, firm, announcement date, and target price are directly verifiable on the page. Generic aggregators of unknown quality or ungrounded data (such as StockAnalysis.com) are excluded or audited strictly against live pages.
- **Domain:** Analyst names, issuing research firms, publication/announcement dates, market prices as of announcement, forward target prices, recommendation ratings (Buy/Outperform, Hold/Equal-Weight, Sell/Underperform), report headlines, and aggregated consensus targets (mean, median, high, low, upside percentage).
- **Authority Rating:** Tier 2 Institutional Aggregator (individual analyst reports) & Tier 3 Consensus Estimates (aggregated consensus distributions).
- **Implementation & Schema:** Conforms strictly to `context/schemas/analyst_price_target_schema.json`. Recorded in `scripts/data/analyst_price_targets.json` and integrated into thesis dossiers (`context/theses/*.md`) and public web intelligence (`http/stocks.html`).


## Tier 3: Quantitative Literature & Empirical Benchmark Studies

### Empirical Options Strategy Benchmarks
- **Sources:**
  - CBOE S&P 500 PutWrite Index (`PUT`) and BuyWrite Index (`BXM`) benchmark performance data.
  - Multi-decade academic studies on option volatility risk premium (VRP).
  - AQR Capital Management and Fama-French factor research on quality, value, and momentum anomalies.
- **Domain:** Mathematical boundary parameters, optimal Delta selection (0.15 to 0.30), optimal contract duration (30 to 45 DTE), and systematic roll rules.
- **Authority Rating:** Institutional empirical standard for strategy rule formulation.

## Tier 4: AI Agent Parametric Knowledge

### Model Pre-Training, Supervised Fine-Tuning (SFT) & Reinforcement Learning (RL)
- **Provider:** Underlying Foundation LLMs and Agentic Frameworks.
- **Domain:** Conceptual reasoning, structural business analysis, competitive moat assessment, financial terminology, coding logic, and qualitative synthesis.
- **Provenance Rules:**
  - When an AI agent relies on pre-training or parametric memory without querying an external tool, it must document its data provenance as `TIER_4_AGENT_PARAMETRIC_KNOWLEDGE`.
  - When specific base model identity, version, or exact knowledge cutoff dates are inaccessible to the runtime agent, the agent records its **runtime context signature** (system clock timestamp, active deliberation role, user task instruction, and explicit acknowledgement that model metadata is context-inferred).
  - Parametric estimates of specific historical numbers (e.g. past quarter revenue or exact share count) must be marked as unverified until confirmed via Tier 1 SEC data or Tier 2 feeds.

## Tier 5: Direct User Input & Brokerage Snapshots

### Private Brokerage Data (`private/snapshots/`)
- **Provider:** Human user / Primary Brokerage Account Exports (Schwab, Fidelity, Interactive Brokers, Robinhood).
- **Domain:** Exact settled cash, share lots, option contract positions, cost basis, and executed fill prices.
- **Authority Rating:** Absolute Ground Truth for current account state and portfolio composition.
- **Data Boundary:** Strictly isolated in `private/` and never published or committed.
