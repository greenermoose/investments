"""
Fetch ETF Holdings CLI Tool
Authoritative Extraction of ETF Constituents via SEC EDGAR Form NPORT-P & Fund Feeds
"""

import argparse
import csv
from datetime import datetime, timezone
import json
import os
import re
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET

KNOWN_ETF_CIKS = {
    "QQQ": "0001067839",  # Invesco QQQ Trust, Series 1
    "SPY": "0000884394",  # SPDR S&P 500 ETF Trust
    "DIA": "0001041130",  # SPDR Dow Jones Industrial Average ETF Trust
    "IWM": "0001100663",  # iShares Trust (Russell 2000)
    "IVV": "0001100663",  # iShares Core S&P 500 ETF
    "VOO": "0000036405",  # Vanguard S&P 500 ETF
    "VTI": "0000036405",  # Vanguard Total Stock Market ETF
    "XLK": "0001064642",  # Technology Select Sector SPDR Fund
}

# CUSIP / Name exact mappings to primary equity tickers
KNOWN_TICKER_OVERRIDES = {
    # Alphabet classes
    "02079K305": "GOOGL",
    "02079K107": "GOOG",
    # Specific CUSIP mappings
    "872590104": "TMUS",
    "N07059210": "ASML",
    "20030N101": "CMCSA",
    "98389B100": "XEL",
    "884903808": "TRI",
    "594972408": "MSTR",
    "595017104": "MCHP",
    "025537101": "AEP",
    "38141G104": "GS",
    "46625H100": "JPM",
    "097023105": "BA",
    "89417E109": "TRV",
    "92826C839": "V",
    "149123101": "CAT",
    "025816109": "AXP",
    "824348106": "SHW",
    "580135101": "MCD",
    "459200101": "IBM",
    "166764100": "CVX",
    "742718109": "PG",
    "88579Y101": "MMM",
    "58933Y105": "MRK",
    "92343V104": "VZ",
    "654106103": "NKE",
    "FERROVIAL SE": "FER",
    "LINDE PLC": "LIN",
    "ASTRAZENECA PLC": "AZN",
    "ASML HOLDING NV": "ASML",
    "ARM HOLDINGS PLC": "ARM",
    "PDD HOLDINGS INC": "PDD",
    "MERCADOLIBRE INC": "MELI",
    "MONDELEZ INTERNATIONAL INC": "MDLZ",
    "CONSTELLATION ENERGY CORP": "CEG",
    "VERTEX PHARMACEUTICALS INC": "VRTX",
    "LULULEMON ATHLETICA INC": "LULU",
    "DIAMONDBACK ENERGY INC": "FANG",
    "COGNIZANT TECHNOLOGY SOLUTIONS CORP": "CTSH",
    "PAYCHEX INC": "PAYX",
    "KEURIG DR PEPPER INC": "KDP",
    "ON SEMICONDUCTOR CORP": "ON",
    "TRADE DESK INC": "TTD",
    "OLD DOMINION FREIGHT LINE INC": "ODFL",
    "GLOBALFOUNDRIES INC": "GFS",
    "ROPER TECHNOLOGIES INC": "ROP",
    "ANALOG DEVICES INC": "ADI",
    "MARVELL TECHNOLOGY INC": "MRVL",
    "DEXCOM INC": "DXCM",
    "COSTAR GROUP INC": "CSGP",
    "BAKER HUGHES CO": "BKR",
    "FASTENAL CO": "FAST",
    "VERISK ANALYTICS INC": "VRSK",
    "IDEXX LABORATORIES INC": "IDXX",
    "KLA CORP": "KLAC",
    "SYNOPSYS INC": "SNPS",
    "CADENCE DESIGN SYSTEMS INC": "CDNS",
    "LAM RESEARCH CORP": "LRCX",
    "MICROCHIP TECHNOLOGY INC": "MCHP",
    "INTEL CORP": "INTC",
    "MICRON TECHNOLOGY INC": "MU",
    "APPLIED MATERIALS INC": "AMAT",
    "BOOKING HOLDINGS INC": "BKNG",
    "AIRBNB INC": "ABNB",
    "CHARTER COMMUNICATIONS INC": "CHTR",
    "COMCAST CORP": "CMCSA",
    "CSX CORP": "CSX",
    "CINTAS CORP": "CTAS",
    "DOORDASH INC": "DASH",
    "ELECTRONIC ARTS INC": "EA",
    "EXELON CORP": "EXC",
    "FORTINET INC": "FTNT",
    "GE HEALTHCARE TECHNOLOGIES INC": "GEHC",
    "HONEYWELL INTERNATIONAL INC": "HON",
    "INTUIT INC": "INTU",
    "INTUITIVE SURGICAL INC": "ISRG",
    "KRAFT HEINZ CO": "KHC",
    "MARRIOTT INTERNATIONAL INC": "MAR",
    "MONSTER BEVERAGE CORP": "MNST",
    "NXP SEMICONDUCTORS NV": "NXPI",
    "OREILLY AUTOMOTIVE INC": "ORLY",
    "PALO ALTO NETWORKS INC": "PANW",
    "PEPSICO INC": "PEP",
    "QUALCOMM INC": "QCOM",
    "REGENERON PHARMACEUTICALS INC": "REGN",
    "ROSS STORES INC": "ROST",
    "AUTODESK INC": "ADSK",
    "AUTOMATIC DATA PROCESSING INC": "ADP",
    "APPLOVIN CORP": "APP",
    "AXON ENTERPRISE INC": "AXON",
    "BIOGEN INC": "BIIB",
    "CDW CORP": "CDW",
    "CROWDSTRIKE HOLDINGS INC": "CRWD",
    "DATADOG INC": "DDOG",
    "PALANTIR TECHNOLOGIES INC": "PLTR",
    "SERVICENOW INC": "NOW",
    "THE TRADE DESK INC": "TTD",
    "WORKDAY INC": "WDAY",
    "INSMED INC": "INSM",
    "TAKE-TWO INTERACTIVE SOFTWARE INC": "TTWO",
    "CISCO SYSTEMS INC": "CSCO",
    "COSTCO WHOLESALE CORP": "COST",
    "AMAZON COM INC": "AMZN",
    "AMAZON.COM INC": "AMZN",
    "ALNYLAM PHARMACEUTICALS INC": "ALNY",
    "PAYPAL HOLDINGS INC": "PYPL",
    "COCA-COLA EUROPACIFIC PARTNERS PLC": "CCEP",
    "COPART INC": "CPRT",
    "ZSCALER INC": "ZS",
    "ATLASSIAN CORP": "TEAM",
    "MONOLITHIC POWER SYSTEMS INC": "MPWR",
    "WARNER BROS DISCOVERY INC": "WBD",
    "PACCAR INC": "PCAR",
    "WESTERN DIGITAL CORP": "WDC",
    "SEAGATE TECHNOLOGY HOLDINGS PLC": "STX",
    "TEXAS INSTRUMENTS INC": "TXN",
    "GILEAD SCIENCES INC": "GILD",
    "AMGEN INC": "AMGN",
    "SHOPIFY INC": "SHOP",
    "TRAVELERS COMPANIES INC": "TRV",
    "TRAVELERS COS INC": "TRV",
    "TRAVELERS COS INC/THE": "TRV",
    "GOLDMAN SACHS GROUP INC": "GS",
    "GOLDMAN SACHS GROUP INC/THE": "GS",
    "JPMORGAN CHASE & CO": "JPM",
    "BOEING CO": "BA",
    "BOEING CO/THE": "BA",
    "CATERPILLAR INC": "CAT",
    "UNITEDHEALTH GROUP INC": "UNH",
    "VISA INC": "V",
    "HOME DEPOT INC": "HD",
    "HOME DEPOT INC/THE": "HD",
    "AMERICAN EXPRESS CO": "AXP",
    "SHERWIN-WILLIAMS CO": "SHW",
    "SHERWIN-WILLIAMS CO/THE": "SHW",
    "MCDONALDS CORP": "MCD",
    "MCDONALD'S CORP": "MCD",
    "INTERNATIONAL BUSINESS MACHINES CORP": "IBM",
    "JOHNSON & JOHNSON": "JNJ",
    "CHEVRON CORP": "CVX",
    "PROCTER & GAMBLE CO": "PG",
    "PROCTER & GAMBLE CO/THE": "PG",
    "3M CO": "MMM",
    "WALMART INC": "WMT",
    "MERCK & CO INC": "MRK",
    "WALT DISNEY CO": "DIS",
    "WALT DISNEY CO/THE": "DIS",
    "VERIZON COMMUNICATIONS INC": "VZ",
    "NIKE INC": "NKE"
}

def clean_str(s):
    if not s:
        return ""
    return re.sub(r"[^a-zA-Z0-9]", "", s).upper()

def get_sec_ticker_mapping(headers):
    url = "https://www.sec.gov/files/company_tickers.json"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    
    ticker_to_info = {}
    name_to_info = {}
    
    for entry in data.values():
        sym = entry["ticker"]
        cik = str(entry["cik_str"]).zfill(10)
        title = entry["title"]
        info = {"ticker": sym, "cik": cik, "name": title}
        ticker_to_info[sym] = info
        c_title = clean_str(title)
        
        # Prefer primary equity tickers without hyphens or dots over preferred share classes
        if c_title in name_to_info:
            existing_sym = name_to_info[c_title]["ticker"]
            if ("-" in existing_sym or "." in existing_sym) and ("-" not in sym and "." not in sym):
                name_to_info[c_title] = info
            elif len(sym) < len(existing_sym) and ("-" not in sym and "." not in sym):
                name_to_info[c_title] = info
        else:
            name_to_info[c_title] = info
        
    return ticker_to_info, name_to_info

def fetch_etf_holdings(ticker, cik=None, headers=None):
    if not headers:
        headers = {"User-Agent": "InvestmentApp FundHoldings (AdminContact@example.com)"}
        
    ticker = ticker.upper()
    resolved_cik = cik or KNOWN_ETF_CIKS.get(ticker)
    
    if not resolved_cik:
        raise ValueError(f"Could not resolve SEC CIK for ETF ticker '{ticker}'. Please provide --cik explicitly.")
        
    resolved_cik = resolved_cik.zfill(10)
    print(f"Querying SEC EDGAR for ETF '{ticker}' (CIK {resolved_cik})...")
    
    # 1. Fetch SEC submissions
    sub_url = f"https://data.sec.gov/submissions/CIK{resolved_cik}.json"
    req = urllib.request.Request(sub_url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        sub_data = json.loads(resp.read().decode("utf-8"))
        
    fund_name = sub_data.get("name", ticker)
    recent = sub_data.get("filings", {}).get("recent", {})
    
    forms = recent.get("form", [])
    accns = recent.get("accessionNumber", [])
    docs = recent.get("primaryDocument", [])
    dates = recent.get("filingDate", [])
    
    nport_idx = None
    for i, form in enumerate(forms):
        if "NPORT" in form:
            nport_idx = i
            break
            
    if nport_idx is None:
        raise RuntimeError(f"No Form NPORT filing found in recent submissions for CIK {resolved_cik}")
        
    accn = accns[nport_idx]
    doc = docs[nport_idx]
    filing_date = dates[nport_idx]
    
    # Remove xsl folder prefix if present in primaryDocument to get raw XML
    raw_doc = os.path.basename(doc)
    accn_no_hyphen = accn.replace("-", "")
    xml_url = f"https://www.sec.gov/Archives/edgar/data/{int(resolved_cik)}/{accn_no_hyphen}/{raw_doc}"
    
    print(f"Found NPORT filing {accn} dated {filing_date}.")
    print(f"Downloading raw portfolio XML from {xml_url}...")
    
    time.sleep(0.2)
    req_xml = urllib.request.Request(xml_url, headers=headers)
    with urllib.request.urlopen(req_xml) as resp_xml:
        xml_content = resp_xml.read().decode("utf-8")
        
    root = ET.fromstring(xml_content)
    ns = {"n": "http://www.sec.gov/edgar/nport"}
    
    # Fetch SEC ticker mapping for reconciliation
    ticker_map, name_map = get_sec_ticker_mapping(headers)
    
    holdings = []
    
    for inv in root.findall(".//n:invstOrSec", ns):
        name_elem = inv.find("n:name", ns)
        name = name_elem.text.strip() if name_elem is not None and name_elem.text else ""
        
        cusip_elem = inv.find("n:cusip", ns)
        cusip = cusip_elem.text.strip() if cusip_elem is not None and cusip_elem.text else ""
        
        val_elem = inv.find("n:valUSD", ns)
        val_usd = float(val_elem.text) if val_elem is not None and val_elem.text else 0.0
        
        pct_elem = inv.find("n:pctVal", ns)
        pct_val = float(pct_elem.text) if pct_elem is not None and pct_elem.text else 0.0
        
        bal_elem = inv.find("n:balance", ns)
        balance = float(bal_elem.text) if bal_elem is not None and bal_elem.text else 0.0
        
        # Skip cash collateral, liabilities, or negative-weight adjustment rows
        if pct_val <= 0 or not name or name.upper() in ["N/A", "CASH"]:
            continue

        
        # Check explicit otherId tickers
        other_ticker = None
        for other in inv.findall(".//n:otherId", ns):
            t_val = other.attrib.get("value")
            if t_val and len(t_val) <= 5:
                other_ticker = t_val.upper()
                
        # Resolve ticker symbol
        matched_ticker = None
        matched_cik = None
        
        # 1. Override table
        if cusip in KNOWN_TICKER_OVERRIDES:
            matched_ticker = KNOWN_TICKER_OVERRIDES[cusip]
        elif clean_str(name) in KNOWN_TICKER_OVERRIDES:
            matched_ticker = KNOWN_TICKER_OVERRIDES[clean_str(name)]
        elif name.upper() in KNOWN_TICKER_OVERRIDES:
            matched_ticker = KNOWN_TICKER_OVERRIDES[name.upper()]
            
        # 2. Other ID ticker
        if not matched_ticker and other_ticker and other_ticker in ticker_map:
            matched_ticker = other_ticker
            matched_cik = ticker_map[other_ticker]["cik"]
            
        # 3. Clean string exact match in SEC mapping
        if not matched_ticker:
            c_name = clean_str(name)
            if c_name in name_map:
                matched_ticker = name_map[c_name]["ticker"]
                matched_cik = name_map[c_name]["cik"]
                
        # 4. Partial substring matching against SEC mapping
        if not matched_ticker:
            c_name = clean_str(name)
            for k, v in name_map.items():
                if len(k) > 5 and (k in c_name or c_name in k):
                    matched_ticker = v["ticker"]
                    matched_cik = v["cik"]
                    break
                    
        # 5. Direct ticker fallback if name looks like a ticker
        if not matched_ticker and name.upper() in ticker_map:
            matched_ticker = name.upper()
            matched_cik = ticker_map[name.upper()]["cik"]
            
        if matched_ticker and not matched_cik and matched_ticker in ticker_map:
            matched_cik = ticker_map[matched_ticker]["cik"]
            
        holdings.append({
            "ticker": matched_ticker or "UNKNOWN",
            "name": name,
            "cusip": cusip,
            "balance_shares": balance,
            "market_value_usd": val_usd,
            "weight_pct": round(pct_val, 4),
            "cik": matched_cik or ""
        })
        
    # Sort by weight descending
    holdings.sort(key=lambda x: x["weight_pct"], reverse=True)
    
    result = {
        "etf_ticker": ticker,
        "fund_name": fund_name,
        "fund_cik": resolved_cik,
        "report_date": filing_date,
        "accession_number": accn,
        "total_holdings_count": len(holdings),
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "holdings": holdings
    }
    
    return result

def main():
    parser = argparse.ArgumentParser(description="Extract ETF holdings and constituents from SEC EDGAR Form NPORT-P.")
    parser.add_argument("--ticker", default="QQQ", help="ETF ticker symbol (e.g. QQQ, SPY, DIA, IWM)")
    parser.add_argument("--cik", default=None, help="Fund Trust CIK number if not in known directory")
    parser.add_argument("--format", choices=["json", "csv"], default="json", help="Output format")
    parser.add_argument("--output", default=None, help="Output file path")
    args = parser.parse_args()
    
    headers = {"User-Agent": "InvestmentApp CLI (AdminContact@example.com)"}
    data = fetch_etf_holdings(args.ticker, cik=args.cik, headers=headers)
    
    out_path = args.output
    if not out_path:
        out_dir = os.path.join(os.path.dirname(__file__), "data")
        os.makedirs(out_dir, exist_ok=True)
        ext = "csv" if args.format == "csv" else "json"
        out_path = os.path.join(out_dir, f"{args.ticker.lower()}_holdings.{ext}")
        
    if args.format == "csv":
        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["Ticker", "Legal Name", "CUSIP", "Shares Balance", "Market Value USD", "Weight (%)", "CIK"])
            for h in data["holdings"]:
                writer.writerow([
                    h["ticker"], h["name"], h["cusip"], h["balance_shares"], h["market_value_usd"], h["weight_pct"], h["cik"]
                ])
    else:
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
            
    print(f"Successfully extracted {data['total_holdings_count']} holdings for {data['etf_ticker']}.")
    print(f"Output saved to: {out_path}")
    print("\nTop 15 Holdings by Portfolio Weight:")
    print("-" * 75)
    print(f"{'Ticker':<8} {'Weight':<8} {'CIK':<12} {'Issuer Legal Name':<42}")
    print("-" * 75)
    for h in data["holdings"][:15]:
        print(f"{h['ticker']:<8} {h['weight_pct']:<8.2f}% {h['cik']:<12} {h['name'][:40]:<42}")
    print("-" * 75)

if __name__ == "__main__":
    main()
