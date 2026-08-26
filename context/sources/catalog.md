# Authoritative Data Sources Catalog & Trust Architecture

This catalog defines the official data sources used by the Agentic Investment Advisor system, their authority tiers, update cadences, primary URLs, trust hierarchy, analyst report discovery mechanisms, search engine capabilities, and LLM internal weight parametric token generation mechanics.

## Source Hierarchy & Trust Architecture

When evaluating factual data, financial metrics, valuation variables, or investment theses, the system adheres to a strict five-tier authority hierarchy. Higher-tier sources supersede lower-tier sources in any reconciliation conflict.

```
+---------------------------------------------------------------------------------------+
| Tier 1: Primary Regulatory Filings & Direct Exchange Data                             |
| (SEC EDGAR 10-K/10-Q/8-K/Form 4/NPORT-P, CBOE, NYSE, NASDAQ Official Feeds)           |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
| Tier 2: Institutional Aggregators, Macro Databases & Market APIs                      |
| (FRED, US Treasury, FMP, Polygon.io, Tiingo, MarketBeat, TipRanks, Morningstar, YF)   |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
| Tier 3: Quantitative Literature, Academic Studies & Consensus Distributions           |
| (CBOE BuyWrite/PutWrite Indices, AQR/Fama-French, Academic Journals, Mean Consensus)  |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
| Tier 4: AI Agent Parametric Knowledge & Internal Weights                              |
| (Pre-training, SFT, RL Internal Weights with Context Signature & Runtime Audit)        |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
| Tier 5: Direct User Input & Private Brokerage Records                                 |
| (Private user snapshots in private/snapshots/, manual trade execution receipts)        |
+---------------------------------------------------------------------------------------+
```

## Comprehensive Master Sources Directory

The following master directory catalogues every specific data source, public URL, authority classification, access method, and trust assessment utilized during equity due diligence:

| Source Name | Primary URL | Tier Classification | Access Method | Trustworthiness & Reliability Assessment | Primary Purpose & Extracted Data |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SEC EDGAR Company Facts API | https://data.sec.gov/api/xbrl/companyfacts/ | Tier 1 (Primary Regulatory) | Programmatic REST JSON | Absolute Ground Truth (10/10). Official regulatory filings under US Federal Securities Law. | Audited 10-K/10-Q XBRL statements, revenue, net income, cash flow, diluted shares, long-term debt. |
| SEC EDGAR Submissions API | https://data.sec.gov/submissions/ | Tier 1 (Primary Regulatory) | Programmatic REST JSON | Absolute Ground Truth (10/10). Official filing history and accession numbers. | Form 8-K material events, Form 4 insider transactions, Form DEF 14A proxy disclosures. |
| SEC EDGAR Form NPORT-P / XML | https://data.sec.gov/submissions/ | Tier 1 (Primary Regulatory) | Programmatic REST XML/JSON | Absolute Ground Truth (10/10). Mandatory monthly portfolio holdings of US registered funds. | Authoritative constituent holdings, share counts, fair market values, and weightings for QQQ, SPY, DIA, SMH. |
| SEC Master Ticker Directory | https://www.sec.gov/files/company_tickers_exchange.json | Tier 1 (Primary Regulatory) | Programmatic REST JSON | Absolute Ground Truth (10/10). Authoritative registry of all SEC reporting entities. | CIK-to-ticker mapping, legal corporate entity names, and primary exchange listing designations. |
| NASDAQ Trader Symbol Directory | ftp://ftp.nasdaqtrader.com/SymbolDirectory/ | Tier 1 (Primary Exchange) | Open Public FTP | Absolute Ground Truth (10/10). Direct national market exchange operations directory. | Daily master listing of NASDAQ/NYSE/AMEX symbols, ETF indicators, test issue flags, financial status. |
| CBOE Global Markets Data | https://www.cboe.com/ | Tier 1 (Primary Exchange) | Official Feeds / Web | Absolute Ground Truth (10/10). World's premier options exchange operator. | Options chain definitions, strike listings, expiration cycles, open interest, and historical VIX/VXN series. |
| Consolidated Tape Association (CTA / CQS Plan) | https://www.ctaplan.com/ | Tier 1 (Primary SIP) | Institutional SIP / SIAC | Absolute Ground Truth (10/10). Official NMS Consolidated Tape for NYSE & regional listings. | Consolidated quotes (CQS/NBBO), trades (CTS), official closing prices, auction prints, and volume for Tape A (NYSE) and Tape B (NYSE American, Arca, Cboe). |
| UTP Plan (OTC/UTP Plan) | https://www.utpplan.com/ | Tier 1 (Primary SIP) | Institutional SIP / Nasdaq SIP | Absolute Ground Truth (10/10). Official NMS Consolidated Tape for NASDAQ-listed equities. | Consolidated quotes (UQDF/NBBO), trades (UTDF), official closing crosses, IPO prints, and consolidated volume for Tape C (NASDAQ). |
| Nasdaq Data Link & Market Data (Nasdaq Basic / NLS) | https://data.nasdaq.com/ | Tier 2 (Proprietary Exchange API) | Developer REST API / Web | High Reliability (9.5/10). Proprietary Nasdaq execution venue market data. | Nasdaq Last Sale (NLS) trade prints and Nasdaq Basic top-of-book quotes for Nasdaq venues & FINRA/Nasdaq TRF. Excludes non-Nasdaq exchange executions; distinct from consolidated SIP. |
| FRED (Federal Reserve Economic Data) | https://fred.stlouisfed.org/ | Tier 2 (Macro Database) | Official REST API / Web | Highly Authoritative (9.5/10). St. Louis Fed official repository for national economic statistics. | 3-Month Treasury Constant Maturity (DGS3MO), Fed Funds Effective Rate, CPI inflation, GDP growth. |
| US Department of the Treasury | https://home.treasury.gov/ | Tier 2 (Macro Database) | Official Web / CSV Feeds | Highly Authoritative (9.5/10). Official sovereign fiscal authority of the United States. | Daily Treasury Par Yield Curve Rates, benchmark discount rates, and sovereign debt yield structure. |
| Financial Modeling Prep (FMP) | https://financialmodelingprep.com/ | Tier 2 (Institutional API) | Developer REST API | High Reliability (9.0/10). Structured developer API with verified XBRL normalization. | Automated stock screening, price target history, historical financial ratios, DCF models, earnings calendar. |
| Polygon.io | https://polygon.io/ | Tier 2 (Institutional API) | REST API & WebSockets | High Reliability (9.0/10). Direct SIP-connected institutional market data feed. | Real-time quotes, OHLCV candlestick series, historical tick/bar data, reference ticker master directory. |
| Tiingo Financial Data | https://www.tiingo.com/ | Tier 2 (Institutional API) | REST API & Bulk Feeds | High Reliability (9.0/10). Institutional data clean-room with split/dividend adjustment algorithms. | End-of-day prices, corporate actions, adjusted price series, curated financial news feeds with sentiment. |
| MarketBeat Analyst Coverage | https://www.marketbeat.com/ | Tier 2 (Analyst Aggregator) | Web Page Audit / RSS | High Reliability (8.5/10). Structured aggregator ground-truthing individual Wall Street rating revisions. | Individual analyst names, research firms, announcement dates, price targets, rating actions, and news URLs. |
| TipRanks | https://www.tipranks.com/ | Tier 2 (Analyst Aggregator) | Web Interface / Data Feed | High Reliability (8.5/10). Specializes in tracking and ranking individual Wall Street analysts. | Analyst accuracy rankings, historical win rates, average returns per analyst, price target consensus. |
| Morningstar | https://www.morningstar.com/ | Tier 2 (Institutional Research) | Research Reports / Web | High Reliability (8.8/10). Premier institutional fundamental analysis and fund research house. | Economic Moat ratings (Wide, Narrow, None), DCF Fair Value estimates, Capital Allocation / Stewardship grades. |
| Corporate Investor Relations (IR) Portals | Configured Per-Equity (e.g. https://investor.apple.com/) | Tier 1 / 2 (Primary Corporate Disclosures) | Web / HTTP / Headless Browser | High Reliability (9.2/10). Official corporate presentations and primary disclosures. | Earnings slide decks, webcasts, Q&A transcripts, investor day roadmaps, non-GAAP segment KPIs, catalyst calendars. |
| Yahoo Finance | https://finance.yahoo.com/ | Tier 2 (Secondary Aggregator) | Web / yfinance Engine | Moderate to High (8.0/10). Broad public aggregator; high utility but subject to scraper rate limits. | Rapid multi-month OHLCV candlestick extraction, 20-day/50-day moving averages, 52-week ranges, trading volume. |
| StockAnalysis.com | https://stockanalysis.com/ | Tier 2 (Secondary Aggregator) | Web Interface | Moderate to High (8.0/10). Clean secondary presentation of financial statements and metrics. | Rapid visual overview of financial trends, balance sheet summaries, dividend histories, consensus targets. |
| FactSet & LSEG / Refinitiv I/B/E/S | https://www.factset.com/ | Tier 2 / 3 (Institutional) | Institutional Terminals | Highly Authoritative (9.5/10). Industry standard for institutional sell-side consensus estimates. | Institutional earnings estimates, revenue consensus forecasts, target price standard deviation/dispersion. |
| CBOE Benchmark Indices (PUT/BXM) | https://www.cboe.com/indices/ | Tier 3 (Quantitative Literature) | Academic / Empirical Feeds | Highly Authoritative (9.0/10). Standard empirical benchmarks for cash-secured put and buy-write returns. | Multi-decade quantitative risk/return data on option volatility risk premium (VRP) and option harvesting. |
| AQR Capital Management & Fama-French | https://www.aqr.com/Insights/Research | Tier 3 (Quantitative Literature) | Peer-Reviewed Research | Highly Authoritative (9.0/10). Foundational quantitative literature on asset pricing anomalies. | Empirical evidence on Quality, Value, Momentum, and Low-Beta factor premiums across multi-decade cycles. |
| AI Agent Parametric Knowledge | Internal Neural Weights | Tier 4 (Parametric Inference) | Autoregressive Next-Token Sampling | Conceptual Grounding (7.0/10). Outstanding qualitative synthesis; unverified for exact historical digits. | Qualitative thesis formulation, moat assessment, competitive dynamic evaluation, conceptual framework mapping. |
| Private User Brokerage Snapshots | Local private/snapshots/ | Tier 5 (Private User Data) | Secure Local Ingestion | Absolute Ground Truth for Account State (10/10). Isolated strictly behind private firewall. | Settled cash, SGOV proxy balance, exact share quantities, cost bases, and open option contract positions. |

## Detailed Classification & Assessment of Key Data Aggregators

### 1. Yahoo Finance (`https://finance.yahoo.com/`)
- **Classification:** Tier 2 Secondary Market Data & News Aggregator.
- **Trustworthiness Assessment:** High for historical market prices, trading volume, and split/dividend adjustments. Moderate for analyst consensus and balance sheet extracts.
- **Role in Due Diligence:** Serves as a rapid, zero-friction engine for pulling daily and multi-month OHLCV candlestick series, calculating 20-day and 50-day simple moving averages, identifying 52-week high/low support and resistance levels, and reviewing recent company news releases.
- **Technical Considerations:** While widely used via open-source tools (e.g. `yfinance`), Yahoo Finance does not provide a supported public developer REST API. Its internal endpoints frequently rotate cookie tokens and crumb headers, making it ideal for quick ad-hoc queries but unsuitable as the sole production data backbone.

### 2. TipRanks (`https://www.tipranks.com/`)
- **Classification:** Tier 2 Institutional & Retail Analyst Accountability Aggregator.
- **Trustworthiness Assessment:** High for tracking individual sell-side analyst credentials, historical accuracy rankings, and price target announcements.
- **Role in Due Diligence:** TipRanks provides a unique analytical dimension by measuring the historical success rate and average return generated by individual Wall Street analysts (e.g. ranking Dan Ives at Wedbush, Toni Sacconaghi at Bernstein, or Toshiya Hari at Goldman Sachs). This allows AI agents to weight sell-side price targets based on the specific analyst's proven track record on that specific stock rather than treating all broker opinions equally.

### 3. StockAnalysis.com (`https://stockanalysis.com/`)
- **Classification:** Tier 2 Secondary Fundamental Screener & Financial Data Portal.
- **Trustworthiness Assessment:** Moderate to High. Offers exceptionally clean, modern, and structured web layouts of financial statements, valuation multiples, and dividend histories.
- **Role in Due Diligence:** Serves as a fast visual and tabular cross-check for multi-year revenue trajectories, gross margin expansion, free cash flow generation, and forward consensus estimates.
- **Caveat & Verification Rule:** Because StockAnalysis.com aggregates and standardizes raw financial data from intermediate third-party providers, all critical figures (such as exact quarterly revenue or diluted shares outstanding) must be verified against Tier 1 SEC EDGAR XBRL filings before locking investment theses.

### 4. Financial Newswires & Live Desks (The Fly, Benzinga, StreetInsider, Seeking Alpha, Yahoo Finance)
- **Classification:** Tier 2 Financial Newswires & Press Release Broadcasters.
- **Trustworthiness Assessment:** High for real-time sell-side analyst research releases, rating actions, price target revisions, and link-level auditability.
- **Role in Due Diligence:** Authoritative financial newswires capture pre-market sell-side research notes from Wall Street investment banks. For each tracked equity, our system catalogs individual press release articles detailing the lead analyst name, brokerage firm, publication date, historical market price on announcement date, and revised price target. Every record links directly to an accessible news agency press release article (`source_url`) enabling unambiguous verification.

### 5. Morningstar (`https://www.morningstar.com/`)
- **Classification:** Tier 2 Institutional Fundamental Research & Economic Moat Authority.
- **Trustworthiness Assessment:** Very High for qualitative competitive advantage evaluation, stewardship assessment, and multi-stage discounted cash flow (DCF) fair value modeling.
- **Role in Due Diligence:** Morningstar's Economic Moat methodology (Wide, Narrow, None) and Moat Trend assessments (Positive, Stable, Negative) provide a gold-standard framework for evaluating structural competitive advantages (network effects, switching costs, cost advantages, intangible assets, and efficient scale). Its forward-looking DCF Fair Value Estimates serve as a valuable independent fundamental benchmark against which market prices can be compared.

### 6. Corporate Investor Relations (IR) Portals & Direct Issuer Disclosures
- **Classification:** Tier 1 / Tier 2 Primary Corporate Disclosures & Executive Communications.
- **Trustworthiness Assessment:** High (9.2/10) for official earnings slide decks, earnings conference call transcripts, webcasts, Capital Markets Day roadmaps, annual shareholder letters, and catalyst schedules. Non-GAAP operational metrics (Adjusted EBITDA, Annual Recurring Revenue, Backlog) must be verified against Tier 1 SEC EDGAR GAAP reconciliations.
- **Role in Due Diligence:** IR portals provide high-conviction context that complements regulatory SEC filings. While SEC 10-K/10-Q filings supply standardized audited numbers, IR portals supply management commentary on demand drivers, segment-level unit economics (e.g. AWS/Azure/GCP growth rates, ARPU, active listings, net retention rates), multi-year TAM expansion forecasts, and forward-looking guidance.
- **Governance & Non-GAAP Verification Rule:** Because IR presentations are crafted by management and PR teams, agents must treat non-GAAP performance metrics as unaudited management claims. Any critical assumptions regarding margins, cash generation, or dilution must be audited against GAAP disclosures in Form 10-K/10-Q before locking investment theses.
- **Repository Data Structure Integration:** The primary Investor Relations URL for every equity in the universe is tracked systematically across the codebase in `context/data/universe.json`, `context/data/equities/<TICKER>.json`, `scripts/data/company_meta.json`, and rendered as direct clickable links in the web application.

### 7. US Equity Market Data Architecture: Consolidated Tape (SIP) vs. Proprietary Top-of-Book Feeds
- **Classification:** Tier 1 Official Consolidated SIP vs. Tier 2 Proprietary Top-of-Book Feeds.
- **National Market System (NMS) SIPs:** Under SEC Regulation NMS, consolidated real-time trade and quotation data is aggregated across all registered US exchanges by designated Securities Information Processors (SIPs):
  - **CTA / CQS Plan (`https://www.ctaplan.com/`):** Administered by SIAC (Securities Industry Automation Corporation, an affiliate of NYSE). Processes **Tape A** (NYSE-listed equities) and **Tape B** (NYSE American, NYSE Arca, Cboe, and regional exchange listings).
  - **UTP Plan (`https://www.utpplan.com/`):** Administered and processed by Nasdaq. Processes **Tape C** (NASDAQ-listed equities).
  - **CT Plan Transition (`https://www.thectplanllc.com/`):** The SEC-approved unified Consolidated Tape Plan (DataCT) transitioning governance of CTA and UTP into a single operating entity by April 2027.
- **Why `nasdaq.com` is NOT a Consolidated Feed:** Real-time equity quotes on the public `nasdaq.com` website and its developer API (`https://data.nasdaq.com/`) are powered by **Nasdaq Last Sale (NLS)** and **Nasdaq Basic**. While these feeds provide quotes and trades for NYSE- and Nasdaq-listed tickers, they **only reflect executions that take place on Nasdaq's own venues** (The Nasdaq Stock Market, Nasdaq BX, PSX) and off-exchange trades reported to the **FINRA/Nasdaq TRF**. They do **not** capture trades or quotes occurring on the NYSE floor, NYSE Arca, Cboe, IEX, or other exchanges. Consolidated Level 1 feeds for public web visitors are 15-minute delayed. True real-time consolidated market data requires direct SIP connectivity (via SIAC and Nasdaq SIP) or an authorized SIP-connected data vendor (e.g. Polygon.io, Alpaca SIP, Bloomberg, FactSet).

## How Sell-Side Analyst Reports & Price Targets Are Tracked and Discovered

### The Institutional Research Ecosystem & Access Dynamics
Primary sell-side equity research reports are extensive, 10-to-50 page proprietary dossiers written by chartered financial analysts (CFAs) and research teams at major global investment banks and institutional brokerages:
- **Major Issuing Firms:** Goldman Sachs, Morgan Stanley, JPMorgan Chase, Bank of America Global Research, Bernstein Research, Wedbush Securities, Barclays Capital, UBS Global Research, Citigroup, Jefferies, Evercore ISI, Baird, Mizuho, Wells Fargo Securities, and Piper Sandler.
- **The Paywall Model:** Primary research reports are commercial intellectual property distributed exclusively to paying institutional clients (hedge funds, mutual funds, sovereign wealth funds, family offices) via enterprise terminals:
  - **Bloomberg Professional Terminal** (`BBSA` / Research Portal)
  - **FactSet Research Systems**
  - **LSEG Workspace / Refinitiv I/B/E/S**
  - **S&P Capital IQ**
  - **Proprietary Bank Client Portals** (e.g., Goldman Sachs Marquee, Morgan Stanley Matrix)

### How Rating Changes & Price Targets Become Public
Although full PDF research reports are protected by copyright and client paywalls, the core findings and headline metrics are disseminated immediately into the public domain through several channels:
1. **Institutional Wire Feeds & Press Releases:** When an investment bank upgrades a stock, downgrades a stock, or initiates coverage, the firm issues an executive wire release before the market opens (typically between 6:00 AM and 9:00 AM ET).
2. **Financial Newswires & Live Desks:** Real-time financial news desks (The Fly on the Wall, Benzinga, StreetInsider, Seeking Alpha News, Yahoo Finance News, Reuters) capture these releases and publish immediate dispatches containing:
   - Lead Analyst Name
   - Investment Bank / Brokerage Firm
   - Rating Action (Initiation, Upgrade, Downgrade, Reiteration)
   - New Price Target vs. Previous Price Target
   - Key Thesis Drivers & Earnings Estimate Adjustments
3. **Structured Ingestion & Historical Price Reconciliation:** Dispatches are captured into structured datasets where each target price is matched with its true historical market price on the announcement date.
4. **SEC Disclosures & Corporate Investor Relations:** Public corporations frequently mention consensus analyst price targets and coverage rosters in Form 8-K presentations, annual shareholder letters, or Investor Relations (IR) fact sheets.

### Ingestion & Verification Methodology for AI Agents
To track and incorporate analyst price targets into our system without paying tens of thousands of dollars for institutional terminal licenses, our AI agents execute a deterministic four-step discovery protocol:
1. **Press Release Ingestion:** Ingest pre-market sell-side research dispatches broadcast across financial newswires. The ranked directory of press release sources (`context/sources/analyst_press_release_sources.json`) prioritizes sites by trust score and search reliability (TheFly, Benzinga, StreetInsider, MarketBeat, Yahoo Finance, TipRanks, Seeking Alpha, Investing.com, Barron's, StockAnalysis.com).
2. **Schema Normalization & Historical Price Reconciliation:** Normalize every target into `context/schemas/analyst_price_target_schema.json`, recording `analyst_name`, `firm`, `announcement_date`, accurate historical `market_price_at_announcement`, `target_price`, `implied_upside_pct`, `rating_action`, `press_release_title`, and `source_url`. The `market_price_at_announcement` is resolved from the persistent historical OHLCV price archive (`scripts/data/historical_price_archive.json`, schema: `context/schemas/historical_price_archive_schema.json`) which stores 18+ months of daily closing prices for all universe equities.
3. **Direct Press Release Verification:** Ensure every recorded entry contains a targeted search URL scoped to top-ranked press release source sites (using `site:` operators) where human traders and AI agents can verify the announcement details.
4. **Coverage Registry & Firm Cross-Reference:** Aggregate individual price targets into a per-company analyst coverage registry (`scripts/data/analyst_coverage_registry.json`, schema: `context/schemas/analyst_coverage_registry_schema.json`), cross-referencing against the curated sell-side firms directory (`context/sources/sell_side_firms_directory.json`) which catalogs ~40 major research firms with research portal URLs, sector specializations, and access models.


## Search Engines & Tools Accessible to AI Agents

AI agents in our system have access to specialized external search and retrieval tools to conduct real-time market research and catalyst investigation:

### 1. `search_web` Engine
- **Mechanism:** Programmatic interface to real-time global web search indexes (Google / Bing indexes).
- **Primary Capabilities:** Executes targeted queries across corporate investor relations portals, regulatory agency releases (FDA approvals, FAA certifications, FTC antitrust rulings), industry news wires, and macroeconomic press briefings.
- **Best Practice Querying:** Agents formulate concise, disambiguated query strings (e.g. `"NVIDIA Corporation" "10-Q" "data center revenue" 2026` or `site:investor.apple.com "earnings release"`).

### 2. `read_url_content` & `browser_subagent`
- **Mechanism:** HTTP fetch engines and headless browser subagents capable of rendering static markdown, parsing HTML DOMs, and interacting with dynamic JavaScript applications.
- **Primary Capabilities:** Extracts complete, verbatim transcripts of quarterly earnings conference calls, CEO interviews, detailed 8-K exhibits, and technical whitepapers.

### 3. SEC EDGAR Full-Text Search (EFTS) API
- **Endpoint:** `https://efts.sec.gov/LATEST/search-index`
- **Mechanism:** SEC's native full-text search engine indexing every word across millions of regulatory filings since 2001.
- **Primary Capabilities:** Enables agents to search for specific litigation disclosures, customer concentration percentages, patent licenses, or supply chain supplier dependencies directly inside official 10-K and 10-Q footnotes.

## How AI Agents Generate Knowledge from Internal Weights (Parametric Knowledge)

A central capability of modern foundation Large Language Models (LLMs) is their ability to synthesize sophisticated qualitative analyses, competitive dynamics, financial theories, and business moat assessments directly from their internal neural network weights without executing external tool calls. Understanding how this occurs demystifies the process of generating knowledge "from thin air."

### 1. Pre-Training: Compressing Market Intelligence into High-Dimensional Weights
During pre-training on supercomputing clusters, the foundation neural network processes trillions of tokens of text spanning:
- Decades of SEC 10-K and 10-Q filings, annual shareholder letters, and proxy statements.
- Global financial news, earnings call transcripts, equity research notes, and economic textbooks.
- Academic finance literature (Fama-French factor models, Black-Scholes derivations, modern portfolio theory).
- Corporate histories, technological architectures, competitive supply chain mappings, and legal cases.

Through self-supervised autoregressive learning, the model adjusts billions of neural weight parameters across hundreds of transformer layers. In doing so, it does not simply memorize raw text strings; it constructs a rich, continuous, high-dimensional latent representation of corporate strategy, accounting relationships, industry structures, and competitive moats.

### 2. Autoregressive Next-Token Generation: From Weights to Actionable Intelligence
When an agent is prompted to analyze a company (e.g. evaluating Microsoft's enterprise software lock-in or TSMC's manufacturing scale advantage), the generation process unfolds through deterministic mathematical operations:
1. **Context Encoding:** The user prompt, system instructions, active workspace guidelines, and conversation history are converted into a sequence of input token embeddings.
2. **Multi-Head Self-Attention:** Transformer attention layers compute dynamic relationship weights between all concepts in context, activating latent neural pathways associated with software switching costs, ROIC calculations, operating leverage, or option pricing mathematics.
3. **Feed-Forward Knowledge Projection:** Dense feed-forward layers project internal hidden states through learned weight matrices, encoding deep statistical regularities about how businesses operate, grow, and defend market share.
4. **Logit Computation & Vocabulary Sampling:** The final output projection layer produces a vector of unnormalized scores (logits) across the model's vocabulary (~32,000 to 256,000 tokens). A softmax function converts logits into probability distributions, from which the next token is generated.
5. **Autoregressive Loop:** Each newly generated token is appended to the context sequence, and the process repeats hundreds of times per second, yielding structured, coherent, institutional-grade financial analysis.

### 3. Post-Training: SFT and Reinforcement Learning (RL)
Following pre-training, models undergo Supervised Fine-Tuning (SFT) and Reinforcement Learning from Human Feedback (RLHF) / Direct Preference Optimization (DPO). This aligns the model's token distribution toward:
- Rigorous step-by-step mathematical reasoning.
- Professional institutional financial terminology.
- Strict adherence to JSON schemas, markdown formats, and analytical rules.
- Objective, balanced risk assessment rather than speculative hype.

### 4. Epistemic Limitations & The Tier 4 Governance Rules
While internal weights provide extraordinary conceptual reasoning, they possess distinct structural limitations:
- **Static Knowledge Cutoff:** The model's weights reflect the state of the world as of its training cutoff date. It cannot know real-time market prices, today's breaking news, or earnings released this morning without external tools.
- **Digit Hallucination Risk:** High-dimensional neural representations excel at structural relationships (e.g. "Company A's gross margin expanded due to cloud mix shift") but can probabilistically drift on precise decimal numbers (e.g. reporting Q3 revenue as $14.32B instead of $14.28B).

To harness the cognitive power of internal weights while eliminating hallucination risk, our system enforces three mandatory governance rules for Tier 4 Parametric Knowledge:
## Influential Short Seller Research Firms & Campaign Tracking

Activistic short seller research firms conduct forensic accounting, whistleblower interviews, and investigative due diligence to expose corporate fraud, undisclosed liabilities, and structural impairments. When top-tier short sellers release reports, immediate and severe market volatility frequently follows.

Our system systematically monitors the ranked directory of influential short sellers (`context/sources/short_sellers_directory.json`, schema: `context/schemas/short_sellers_directory_schema.json`):
- **Tier 1 Impact Firms:** Hindenburg Research, Muddy Waters Research, Citron Research, Kerrisdale Capital, Gotham City Research, Scorpion Capital, and Quintessential Capital Management.
- **Surveillance Methodology:** The `scripts/track_short_sellers.py` CLI tool scans new publications and queries search templates (e.g. `site:hindenburgresearch.com OR "Hindenburg Research" {SYMBOL}`) to determine if any portfolio holding or universe candidate is under an active short campaign.
- **Deliberation Integration:** When a short report is published, the agent team dissects the primary attack vectors (accounting fraud, related party transactions, unviable technology, customer fabrication) to determine whether the thesis is invalidated (mandating immediate position liquidation) or if the allegation is spurious/priced-in (creating an attractive, high-margin-of-safety entry).

## Investor Sentiment, Press Releases & Social Chatter Surveillance

Market sentiment and retail/institutional investor chatter provide early warning signals for thesis friction, narrative shifts, and emerging operational concerns before they appear in quarterly financial statements.

Our system catalogs and surveils investor sentiment sources (`context/sources/investor_sentiment_sources.json`, schema: `context/schemas/investor_sentiment_schema.json`):
- **Corporate Press Distribution:** PR Newswire, Business Wire, GlobeNewswire, and SEC Form 8-K unscheduled event filings.
- **Investor Chatter Communities:** Reddit communities (r/stocks, r/wallstreetbets, r/investing, r/ValueInvesting), StockTwits, and Seeking Alpha earnings transcripts and commentary.
- **Surveillance Engine:** The `scripts/surveil_sentiment.py` CLI tool aggregates headline themes, sentiment polarity (-100 to +100), discussion velocity, and specific investor concern themes (such as margin compression, executive turnover, competitive displacement, and supply chain friction).

## SEC Filing Anticipation & Statutory Schedule Calendar

While market prices fluctuate continuously, official regulatory disclosures follow statutory calendar cycles governed by SEC filing deadlines:
- **Large Accelerated Filers (Public Float >= $700M):** Form 10-K due within 60 days of fiscal year-end; Form 10-Q due within 40 days of fiscal quarter-end.
- **Accelerated Filers (Public Float $75M - $700M):** Form 10-K due within 75 days; Form 10-Q due within 40 days.
- **Non-Accelerated Filers:** Form 10-K due within 90 days; Form 10-Q due within 45 days.
- **Foreign Private Issuers:** Form 20-F due within 4 months of fiscal year-end.

The `scripts/anticipate_sec_filings.py` tool computes historical filing patterns for all universe equities, projecting estimated 10-Q and 10-K filing windows into `context/data/sec_filing_calendar.json` (schema: `context/schemas/sec_filing_calendar_schema.json`). This enables the system to schedule targeted XBRL ingestions (`scripts/fetch_sec.py --live`) immediately as new quarterly data is released.


