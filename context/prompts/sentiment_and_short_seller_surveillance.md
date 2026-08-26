# Investor Sentiment, Press & Short-Seller Surveillance Protocol

This prompt protocol defines the event-driven workflow for surveilling corporate press release distribution wires, online investor chatter (Reddit communities, financial newswires), and adversarial campaigns published by top activist short sellers.

## Operational Context & Objective

Market sentiment shifts, social chatter velocity, and activist short seller campaigns often precede earnings misses and major price dislocations. By actively surveilling these sources, the agent team can:
- Surface emerging investor concerns (e.g. margin squeeze, customer concentration, executive turnover, product delays) before they manifest in GAAP financials.
- Rapidly evaluate short seller attack reports to determine if an allegation invalidates our thesis or creates a high-margin-of-safety buying opportunity.
- Track sentiment polarity to gauge retail vs. institutional positioning.

## Multi-Channel Surveillance Execution

### Step 1: Surveil Investor Sentiment & Press Releases

Run the sentiment surveillance tool to scan press releases and investor chatter:

```bash
# Check top investor concerns across the universe
python scripts/surveil_sentiment.py --concerns-only

# Deep dive into sentiment on specific candidate symbols
python scripts/surveil_sentiment.py --symbols NVDA TSLA ENPH PLTR --json
```

### Step 2: Query Short Seller Research Directory & Active Reports

Check whether any universe constituent is targeted by one of the 20 influential short seller firms (Hindenburg, Muddy Waters, Citron, Kerrisdale, Culper, Scorpion, etc.):

```bash
# Check short seller intelligence and adversarial search query templates for a symbol
python scripts/track_short_sellers.py --symbol <TICKER>

# Review all active tracked short campaigns
python scripts/track_short_sellers.py
```

### Step 3: Agent Adversarial Evaluation & Verdict

When an active short report or elevated investor concern is identified, the agent team conducts a structured adversarial inquiry:

1. **Allegation Classification:**
   - *CRITICAL_FRAUD* (e.g. fabricated revenue, fake customers, forged bank statements) -> Immediate assignment to Avoid List or urgent liquidation alert.
   - *HIGH_GOVERNANCE_RISK* (e.g. undisclosed related party transactions, CFO turnover) -> Freeze new purchases, monitor debt covenants.
   - *MODERATE_OVERVALUATION / VALUATION HYPE* -> Evaluate whether intrinsic DCF and 13Q revenue trajectory provide adequate margin of safety.
   - *PRODUCT / COMMERCIAL TIMELINE DELAY* -> Audit catalyst timeline in `context/theses/<TICKER>.md` and adjust revenue inflection timing.

2. **Company Rebuttal Assessment:**
   - Audit official press releases via PR Newswire / Business Wire and SEC Form 8-K filings to evaluate management's detailed rebuttal.
   - Check whether independent audit committee reviews or special board investigations have been initiated.

3. **Thesis Verdict Assignment:**
   - `THESIS_INVALIDATED_LIQUIDATE`: Severe accounting/solvency failure.
   - `THESIS_INTACT_BUY_THE_DIP`: False or exaggerated claim creating a deep discount below fundamental value.
   - `MONITOR_RUNWAY_COVENANTS`: Maintain position but tighten stop triggers.
   - `AVOID_LIST_CONFIRMED`: Affirm avoid gating.

## Data Provenance & Output Stores

- **Primary Sources:**
  - Press Releases: PR Newswire, Business Wire, GlobeNewswire (Tier 2 Financial Newswire).
  - Short Reports: Official short seller research portals and feeds (`context/sources/short_sellers_directory.json`).
  - Investor Chatter: Reddit (r/stocks, r/wallstreetbets, r/investing, r/ValueInvesting), StockTwits, Seeking Alpha (Tier 4 Investor Sentiment).
- **Synchronized Files:**
  - `context/data/sentiment_surveillance.json`
  - `context/data/short_seller_campaigns.json`
  - `http/data/sentiment_surveillance.json`
  - `http/data/short_seller_campaigns.json`
