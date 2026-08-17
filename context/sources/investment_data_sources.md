# Master Guide to Investment Data Sources, Screeners & Agent Usability

This document provides a comprehensive evaluation of financial data providers, screening services, regulatory feeds, pricing models, and AI agent programmatic accessibility. It also details the technical architecture for constructing an authoritative master database of the approximately 4,000 active, investable US public operating companies.

## Executive Landscape Summary

Investment data sources fall into four distinct operational categories:

1. Primary Regulatory & Exchange Feeds: Absolute Tier 1 ground truth (SEC EDGAR, NASDAQ Trader FTP, CBOE). Free, open, authoritative, and fully accessible to AI agents adhering to standard rate limits.
2. Developer-First Financial Data APIs: High-reliability structured REST/WebSocket services (Financial Modeling Prep, Polygon.io, Tiingo, Alpaca, Finnhub, EODHD). Purpose-built for programmatic integration, algorithmic trading, and AI agent execution.
3. Modular Open-Source Frameworks: Data abstraction engines (OpenBB Platform) that unify multi-provider access into standardized Python and CLI interfaces.
4. Human-Centric Web Screeners & Portals: Interactive web dashboards (Finviz, Koyfin, TradingView, StockRover, GuruFocus). Rich visual interfaces for manual human browsing, but actively hostile to automated AI agents via Cloudflare, CAPTCHAs, and strict anti-scraping policies.

## Comprehensive Provider Matrix

| Provider | Core Offerings | Pricing Tiers | Agent / API Accessibility | Anti-Bot / Scraping Policy | Primary Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SEC EDGAR Master Feeds | Complete CIK-ticker-exchange directory, full XBRL financial statements (10-K, 10-Q), insider trades (Form 4), 8-K filings | Free ($0) | High. Direct REST JSON endpoints and daily bulk ZIP files | Strict 10 req/sec limit. Must provide declared User-Agent header | Primary Source of Truth for master company list and audited financials |
| NASDAQ Trader FTP | Authoritative daily directory of all NASDAQ, NYSE, and regional exchange listed symbols with ETF/Test Issue flags | Free ($0) | High. Open public FTP (`ftp.nasdaqtrader.com/SymbolDirectory/`) | Anonymous FTP. No rate limiting blockers on standard polling | Authoritative source for exchange listing status, ticker symbol hygiene, and ETF filtering |
| Financial Modeling Prep (FMP) | Pre-built stock screener API (`/company-screener`), parsed financial statements, ratios, enterprise value, DCF models | Free (250 req/day), Starter ($19-$29/mo), Premium ($59-$79/mo), Ultimate ($149+/mo) | Excellent. Official REST API with JSON responses, filtering parameters, and batching | Fully supported API. Allows programmatic scraping and bot queries within plan limits | Best all-in-one commercial API for multi-factor screening and financial statement ingestion |
| Polygon.io | Real-time and historical ticks, bars, quotes, reference ticker directory (`/v3/reference/tickers`), market snapshots | Free (5 req/min, EOD), Starter ($29/mo), Developer ($79/mo), Advanced ($199/mo) | Excellent. Official Python SDK (`polygon-api-client`), REST, and WebSockets | Built for developers and bots. No anti-bot friction on authorized API endpoints | Best for price action, reference ticker discovery, and building custom local screening engines |
| Tiingo | End-of-day prices, corporate actions (splits/dividends adjusted), master ticker file, financial news with sentiment | Free (500 symbols/mo), Power ($10/mo individual), Commercial ($30+/mo) | Excellent. Clean REST API and CSV/JSON downloads with high data integrity | Developer-first. Welcomes automated scripts and AI agent pipelines | Highly cost-effective for price history validation and corporate action adjustments |
| OpenBB Platform | Open-source unified Python interface connecting 100+ financial endpoints (SEC, FMP, Polygon, FRED, CBOE, yfinance) | Open-source core ($0). Underlying commercial provider API keys separate | Native. Built specifically for programmatic AI agents and quant research | Operates via official underlying APIs; avoids scraping issues | Recommended framework for Python agent workflows |
| Alpaca Market Data | Real-time and historical equity/options data, basic screener (most actives/gainers), direct brokerage execution | Free (IEX feed), Algo Trader Plus ($99/mo for full consolidated SIP feed) | Excellent. Native Python SDK designed specifically for automated trading bots | Whitelisted developer and algorithmic trading traffic | Ideal if expanding from market screening into direct programmatic execution |
| Finnhub.io | Real-time US equity quotes, fundamentals, earnings surprises, insider sentiment, SEC filing webhooks | Free (60 req/min), Pro ($50-$500/mo) | High. REST and WebSocket endpoints with generous free tier call limits | Fully supported for automated systems via API keys | Great for live price quotes, news sentiment, and earnings calendar webhooks |
| EODHD (EOD Historical Data) | Global and US ticker lists, fundamental data API, stock screener API, bulk historical data | Free (20 req/day), All-in-One ($20-$80/mo) | High. REST API with broad international and US exchange coverage | Supported via API token | Reliable secondary provider for bulk exchange data and screening |
| Alpha Vantage | Historical OHLCV, core financial metrics, technical indicators (RSI, MACD, SMA), news sentiment | Free (25 req/day), Premium ($24.99-$99.99/mo) | Moderate. REST API available, but free tier is tightly restricted (25 calls/day) | API-based access permitted, but strict request caps apply | Good secondary fallback for technical indicator calculations |
| Yahoo Finance (`yfinance`) | Quotes, historical prices, options chains, basic balance sheet metrics, key stats | Free (Community open-source library) | Unstable / Medium. No official API key required; relies on internal Yahoo endpoints | Semi-hostile. Frequently throttles cloud IPs, changes cookie/crumb tokens, and limits bursts | Useful for rapid ad-hoc tests, but unsuitable as a primary production backbone |
| Finviz / Finviz Elite | Visual web screener, technical chart filters, heatmaps, insider trade tracking, custom exports | Free (web-only with ads), Elite ($24.95-$39.50/mo) | Blocked / Hostile. No official developer REST API | Highly hostile. Actively deploys Cloudflare anti-bot checks and IP bans on scrapers | Not recommended for automated agent pipelines. Use only for manual human visual inspection |
| Koyfin | Institutional-style macro and equity dashboards, consensus estimates, financial model charting | Free limited, Plus ($39/mo), Pro ($79/mo) | Blocked. Web application only; no public developer API | Protected by Cloudflare and proprietary session authentication | Human-only research workstation |
| TradingView | Advanced charting, technical screeners, PineScript indicators, multi-asset scanning | Free, Essential ($14.95/mo), Plus ($29.95/mo), Premium ($59.95/mo) | Blocked for screening. No public screener REST API | Aggressive bot detection and rate limiting on web screener endpoints | Human charting interface; not suitable for AI agent automation |
| StockRover / GuruFocus / Zacks | Specialized fundamental metrics (Zacks Rank, GF Value, 10-year financial spreads, ROIC trees) | $20-$100+/mo | Blocked / Restricted. Web UI SaaS platforms without public developer APIs | Scraping violates ToS and triggers CAPTCHAs | Human fundamental research only |

## Detailed Breakdown of Primary Sources for Building the US Equities Master Database

To expand our coverage from our current 144 tracked universe equities to the full universe of approximately 4,000 investable US public companies, we do not need to rely on brittle third-party screeners or expensive commercial subscriptions. We can build our own authoritative, deterministic master database using Tier 1 exchange and regulatory feeds.

### 1. SEC EDGAR Master Exchange Mapping (`company_tickers_exchange.json`)

The Securities and Exchange Commission maintains a real-time, public JSON directory containing every registered entity filing with the SEC:

- Primary URL: `https://www.sec.gov/files/company_tickers_exchange.json`
- Access Method: HTTP GET with custom `User-Agent: SampleApp admin@domain.com`
- Payload Schema:
  - `fields`: `["cik", "name", "ticker", "exchange"]`
  - `data`: Array of arrays containing Central Index Key (integer), legal company name (string), ticker symbol (string), and primary exchange (string).
- Dataset Scale: Approximately 10,400 total entries across all registration tiers.
- Exchange Distribution:
  - Nasdaq: ~4,347
  - NYSE: ~3,312
  - CBOE: ~28
  - OTC / Pink Sheets: ~2,514
  - Other / Unassigned: ~197
- Primary Advantage: Provides the exact, authoritative CIK identifier required to fetch audited financial statements, 10-K/10-Q XBRL facts, and insider filings directly from SEC EDGAR.

### 2. NASDAQ Trader Symbol Directory (Public FTP)

The NASDAQ Trader system publishes daily authoritative text files for all securities traded on US public markets:

- Host: `ftp.nasdaqtrader.com`
- Directory: `/SymbolDirectory/`
- Files:
  - `nasdaqlisted.txt`: All securities with primary listing on NASDAQ (~5,596 total symbols including ETFs and share classes).
  - `otherlisted.txt`: All securities listed on NYSE, NYSE American, NYSE Arca, CBOE, and IEX (~7,552 total symbols).
- Data Fields:
  - Symbol / ACT Symbol
  - Security Name
  - Market Category (Global Select, Global Market, Capital Market)
  - Test Issue Indicator (`Y` / `N`)
  - Financial Status (Normal, Deficient, Delinquent, Bankrupt)
  - Round Lot Size
  - ETF Indicator (`Y` / `N`)
- Primary Advantage: Authoritative real-time metadata to instantly filter out test symbols (`Test Issue == 'Y'`) and exchange-traded funds (`ETF == 'Y'`).

### 3. SEC EDGAR XBRL Bulk Company Facts (`companyfacts.zip`)

For full-universe fundamental screening across all 4,000+ public companies:

- Primary URL: `https://www.sec.gov/Archives/edgar/daily-index/xbrl/companyfacts.zip`
- Update Cadence: Rebuilt nightly by the SEC.
- Archive Size: Approximately 1.1 GB compressed (~12 GB uncompressed JSON files).
- Contents: A distinct JSON file for every CIK (`CIK0000000000.json`) containing every reported GAAP/IFRS concept (Revenues, Net Income, Operating Cash Flow, Capex, Long-Term Debt, Diluted Shares) reported across all historical 10-K and 10-Q filings.
- Primary Advantage: Enables local, 100% offline, zero-cost fundamental screening and ratio calculation across the entire US public market without rate limits or commercial API fees.

### 4. SEC EDGAR Form NPORT-P ETF Holdings Extraction

To discover equity constituents and exact portfolio weightings of benchmark ETFs (e.g., Invesco QQQ Trust, SPDR SPY, iShares IWM):

- Primary Source: SEC EDGAR Submissions API (`https://data.sec.gov/submissions/CIK{fund_cik}.json`) and raw Form NPORT-P XML payloads (`primary_doc.xml`).
- Fund Identification:
  - Invesco QQQ Trust, Series 1: CIK `0001067839`
  - SPDR S&P 500 ETF Trust: CIK `0000888702`
  - iShares Trust: CIK `0001100663`
  - Vanguard Index Funds: CIK `0000036405`
- Extraction Tooling: `scripts/fetch_etf_holdings.py` and `.agents/skills/etf-holdings/`.
- Data Schema: Captures legal issuer name, CUSIP, ISIN, shares balance, fair USD market value, and exact portfolio weighting percentage.

## Investability Filtering Rules for US Public Equities

When processing raw ticker lists (~10,000+ total symbols), we apply systematic filtering rules to isolate the approximately 4,000 active, liquid, investable US public operating companies:

### Inclusion Criteria
1. Primary Listing Exchange: Listed on a registered major US national exchange (`NASDAQ`, `NYSE`, `CBOE`, or `NYSE American`). Excludes OTC Bulletin Board, Pink Sheets, and Grey Market securities.
2. Asset Classification: Primary Common Stock / Operating Equity / Active Ordinary Shares.
3. Reporting Compliance: Active SEC filer with up-to-date 10-K and 10-Q submissions.

### Exclusion Criteria
1. Exchange-Traded Funds & Products: Exclude all ETFs, ETNs, and closed-end funds (`ETF == 'Y'`).
2. Test Issues: Exclude all exchange test symbols (`Test Issue == 'Y'`).
3. Derivative & Structured Share Classes:
   - Preferred Shares (symbols containing `-P`, `/PR`, ` PR`, `PRA`, `PRB`, etc.).
   - Warrants (symbols containing `-WT`, `-WS`, `/WS`, or ending in `W`/`WS`/`WT`).
   - Rights (symbols containing `-RT`, `/RT`, or ending in `R`/`RT`).
   - Units (symbols containing `-UN`, `/UN`, or ending in `U`/`UN`).
4. Inactive / Liquidating Vehicles: Exclude pre-merger SPACs and blank-check trusts without operating businesses.

Applying these filters yields a clean universe of approximately 4,000 to 4,500 investable operating companies.

## Technical Architecture for Universe Database Construction

```
+-----------------------------------------------------------------------------+
| Step 1: Ingestion & Reconciliation Pipeline                                |
| Pull SEC company_tickers_exchange.json + NASDAQ Symbol Directory FTP        |
+-----------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------+
| Step 2: Deterministic Normalization & Cleansing                             |
| Apply Investability Filters (Exclude ETFs, Warrants, Preferreds, OTC)       |
| Match Ticker <-> CIK <-> Exchange <-> Legal Company Name                    |
+-----------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------+
| Step 3: Local Universe Storage & Indexing                                   |
| Generate scripts/data/master_universe.json and SQLite database               |
| Cache metadata: Ticker, Name, CIK, Exchange, Sector, Industry, Market Cap   |
+-----------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------+
| Step 4: System Integration & Screener Engine                                |
| 1. Expose full searchable directory in http/universe.html                   |
| 2. Connect scripts/fetch_sec.py for automated XBRL fundamental extraction    |
| 3. Feed candidate pipelines into Agentic Investment Deliberation Models     |
+-----------------------------------------------------------------------------+
```

## Sell-Side Analyst Reports & Price Target Data Sources

For tracking individual analyst recommendations, price targets, announcement market prices, and consensus distributions, the system leverages structured institutional feeds:

### 1. Financial Modeling Prep (FMP) Analyst Price Target API
- **Endpoint:** `GET /v4/price-target?symbol={TICKER}` & `GET /v4/price-target-consensus?symbol={TICKER}`
- **Fields Provided:** `symbol`, `publishedDate`, `analystName`, `analystCompany`, `priceTarget`, `adjPriceTarget`, `priceWhenPosted`, `newsTitle`, `newsURL`.
- **Data Tier:** Tier 2 Institutional Aggregator.
- **Coverage:** 6,000+ US equities with up to 10 years of historical analyst price target revisions.

### 2. FactSet & LSEG / Refinitiv I/B/E/S Feeds
- **Domain:** Global sell-side consensus estimates, mean/median target prices, high/low target dispersion, standard deviation of estimates, and broker revisions.
- **Data Tier:** Tier 2 / Tier 3 Consensus Grounding.

### 3. Sell-Side Brokerage Direct Research Releases
- **Institutions:** Morgan Stanley, Goldman Sachs, JPMorgan Chase, Bernstein, Wedbush, Bank of America, UBS, Barclays, Citigroup, Jefferies, Evercore ISI, Baird.
- **Core Attributes Extracted:**
  1. Analyst Name (e.g. Toni Sacconaghi, Dan Ives, Toshiya Hari)
  2. Announcement / Publication Date (`YYYY-MM-DD`)
  3. Stock Symbol (e.g. `AAPL`, `NVDA`, `MSFT`)
  4. Market Price as of Announcement
  5. Target Price ($/share)
  6. Implied Upside Percentage and Recommendation Action

## AI Agent Compatibility & Integration Guidelines

When integrating market data into autonomous AI agents, adhere to the following operational standards:

1. Never build production agent dependencies on scraped web portals (Finviz, Koyfin, Yahoo web scrapers). These break unpredictably and introduce unvetted data risks.
2. Rely on Tier 1 primary sources (SEC EDGAR, NASDAQ FTP) for universe indexing and ground-truth financial statements.
3. When real-time intraday quotes, technical indicators, or analyst consensus feeds are required, connect structured APIs with explicit agent support (Polygon.io, Financial Modeling Prep, FactSet, Alpaca, or Tiingo).
4. Maintain a local SQLite/JSON caching layer (`scripts/data/`) to eliminate redundant external calls, enforce SEC rate limits (max 10 req/sec), and enable fast multi-criteria queries for agent deliberations.

