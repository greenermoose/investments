---
name: etf-holdings
description: Workflows, data sources, and Python CLI tooling for discovering and extracting portfolio holdings and constituents for any US-listed ETF (e.g. QQQ, SPY, IWM, DIA, SMH, XLK) from Tier 1 SEC EDGAR Form NPORT-P filings and fund sponsor feeds.
---

# ETF Holdings Discovery & Constituent Extraction Skill

## Overview
This skill equips AI agent teams with systematic procedures and deterministic tools to discover, extract, and normalize equity constituents and portfolio holdings for any US-listed Exchange-Traded Fund (ETF).

## Authoritative Data Sources for ETF Holdings

### 1. SEC EDGAR Monthly Portfolio Filings (Tier 1 Ground Truth)
Every registered management investment company and unit investment trust is legally mandated to report complete monthly portfolio holdings to the SEC on Form NPORT-P (or quarterly Form N-CSR / N-Q).
- **Form Type:** `NPORT-P` (Monthly Portfolio Investments Report)
- **Reporting Entity:** Fund Trust CIK (Central Index Key)
- **Primary XML Structure:**
  - Root element: `<edgarSubmission>` with namespace `http://www.sec.gov/edgar/nport`
  - Portfolio items container: `<invstOrSecs>`
  - Distinct holding element: `<invstOrSec>`
  - Key tags:
    - `<name>`: Legal corporate name of the held issuer.
    - `<title>`: Description of security class.
    - `<cusip>`: 9-character CUSIP identifier.
    - `<identifiers><isin value="..."/></identifiers>`: International Securities Identification Number.
    - `<balance>`: Quantity of shares/units held.
    - `<units>`: Unit type (e.g., `NS` for number of shares).
    - `<curCd>`: Denominated currency (typically `USD`).
    - `<valUSD>`: Total fair market value in US Dollars.
    - `<pctVal>`: Percentage weight in the fund portfolio.

### Major Fund Trust CIK Directory
- **Invesco QQQ Trust, Series 1 (QQQ):** CIK `0001067839`
- **SPDR S&P 500 ETF Trust (SPY):** CIK `0000888702`
- **iShares Trust (IWM, IVV, IJH, IJR, SOXX):** CIK `0001100663`
- **Vanguard Index Funds (VTI, VOO, VUG):** CIK `0000036405`
- **The Select Sector SPDR Trust (XLK, XLF, XLE, XLV, XLI):** CIK `0001064642`
- **SPDR Dow Jones Industrial Average ETF Trust (DIA):** CIK `0001054659`

### 2. Fund Sponsor Direct Daily CSV/JSON Feeds
For real-time intraday or daily rebalance constituent extracts, fund sponsors publish downloadable files:
- **Invesco:** `https://www.invesco.com/us/financial-products/etfs/holdings?audienceType=Investor&ticker=QQQ`
- **BlackRock iShares:** `https://www.ishares.com/us/products/{productId}/fund/1467271812596.ajax?fileType=csv&fileName={ticker}_holdings&dataType=fund`
- **State Street Global Advisors:** `https://www.ssga.com/us/en/intermediary/etfs/library-content/products/fund-data/etfs/us/holdings-daily-us-en-{ticker}.xlsx`

## CLI Tooling: `scripts/fetch_etf_holdings.py`

The repository provides a deterministic CLI tool to query SEC EDGAR submissions and extract holdings:

```bash
# Extract QQQ constituents and save to scripts/data/qqq_holdings.json
python scripts/fetch_etf_holdings.py --ticker QQQ

# Extract SPY constituents
python scripts/fetch_etf_holdings.py --ticker SPY --cik 0000888702

# Export directly to CSV format
python scripts/fetch_etf_holdings.py --ticker QQQ --format csv --output scripts/data/qqq_constituents.csv
```

## Agent Extraction & Normalization Workflow

1. **Resolve Fund CIK:** Look up the Fund Trust CIK in the Directory or via `https://data.sec.gov/submissions/CIK{fund_cik}.json`.
2. **Fetch Latest NPORT-P Filing:** Identify the most recent `NPORT-P` accession number from the submissions metadata and download `primary_doc.xml`.
3. **Parse Holdings XML:** Iterate through `<invstOrSec>` elements, capturing security name, CUSIP, shares balance, USD value, and portfolio percentage weight.
4. **Reconcile with Master Ticker Directory:** Match holdings against SEC EDGAR `company_tickers.json` and NASDAQ Trader directories to map each issuer to its primary US equity trading ticker.
5. **Filter Non-Equities:** Exclude cash collateral (`isCashCollateral`), currency forward contracts, and repurchase agreements, retaining public common stocks and ADRs.
6. **Ingest into Universe:** Pipe the discovered tickers into `scripts/fetch_sec.py` to retrieve verified 10-K/10-Q XBRL financials, compute shares outstanding and TTM revenues, and register the companies in `http/data/universe.json`.
