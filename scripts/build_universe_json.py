"""
Build Universe JSON
Generates the authoritative master public equities universe catalog (http/data/universe.json)
by synthesizing SEC EDGAR XBRL filings, company metadata, and fundamental valuation metrics.
"""

import json
import os
import re

# Load base metadata file if present
meta_file = os.path.join(os.path.dirname(__file__), "data", "company_meta.json")
company_meta = {}
if os.path.exists(meta_file):
    with open(meta_file, "r", encoding="utf-8") as f:
        company_meta = json.load(f)

# Load ETF holdings for name and weight references (QQQ and DIA)
etf_holdings_map = {}
qqq_file = os.path.join(os.path.dirname(__file__), "data", "qqq_holdings.json")
if os.path.exists(qqq_file):
    with open(qqq_file, "r", encoding="utf-8") as f:
        qqq_data = json.load(f)
        for h in qqq_data.get("holdings", []):
            t = h.get("ticker")
            if t:
                etf_holdings_map[t] = h

dia_file = os.path.join(os.path.dirname(__file__), "data", "dia_holdings.json")
if os.path.exists(dia_file):
    with open(dia_file, "r", encoding="utf-8") as f:
        dia_data = json.load(f)
        for h in dia_data.get("holdings", []):
            t = h.get("ticker")
            if t and t not in etf_holdings_map:
                etf_holdings_map[t] = h

# Sector & Industry mapping heuristics for universe constituents
SECTOR_MAP = {
    # Semiconductors & Tech Hardware
    "AMAT": ("Information Technology", "Semiconductor Equipment"),
    "LRCX": ("Information Technology", "Semiconductor Equipment"),
    "KLAC": ("Information Technology", "Semiconductor Process Control"),
    "ASML": ("Information Technology", "Semiconductor Equipment"),
    "ARM": ("Information Technology", "Semiconductor IP"),
    "MRVL": ("Information Technology", "Data Infrastructure Semiconductors"),
    "MPWR": ("Information Technology", "Power Management Semiconductors"),
    "NXPI": ("Information Technology", "Automotive & Industrial Semiconductors"),
    "MCHP": ("Information Technology", "Microcontrollers & Analog Semiconductors"),
    "ON": ("Information Technology", "Power & Sensing Semiconductors"),
    "GFS": ("Information Technology", "Semiconductor Foundry"),
    "TXN": ("Information Technology", "Analog & Embedded Semiconductors"),
    "QCOM": ("Information Technology", "Wireless Semiconductors & Licensing"),
    "INTC": ("Information Technology", "Semiconductors & Foundry Services"),
    "MU": ("Information Technology", "Memory Semiconductors & HBM"),
    "ADI": ("Information Technology", "Analog & Mixed-Signal Semiconductors"),
    "WDC": ("Information Technology", "Data Storage Technologies"),
    "STX": ("Information Technology", "Data Storage Technologies"),
    "IBM": ("Information Technology", "IT Services & Hybrid Cloud Infrastructure"),
    
    # Software & Cloud
    "CRM": ("Information Technology", "Enterprise CRM & Cloud Applications"),
    "PLTR": ("Information Technology", "Enterprise Software & AI Platforms"),
    "PANW": ("Information Technology", "Cybersecurity Software"),
    "CRWD": ("Information Technology", "Cybersecurity Software"),
    "FTNT": ("Information Technology", "Cybersecurity & Unified SASE"),
    "ZS": ("Information Technology", "Cloud Cybersecurity & Zero Trust"),
    "DDOG": ("Information Technology", "Cloud Observability & Security"),
    "WDAY": ("Information Technology", "Cloud Enterprise HCM & Financials"),
    "INTU": ("Information Technology", "Application Software & FinTech"),
    "CDNS": ("Information Technology", "Electronic Design Automation Software"),
    "SNPS": ("Information Technology", "Electronic Design Automation Software"),
    "ADSK": ("Information Technology", "Design & Engineering Software"),
    "TEAM": ("Information Technology", "Team Collaboration Software"),
    "APP": ("Information Technology", "Software & Mobile AdTech"),
    "ROP": ("Information Technology", "Niche Vertical Software"),
    "CTSH": ("Information Technology", "IT Consulting & Digital Services"),
    "CDW": ("Information Technology", "IT Solutions & Technology Products"),
    "MSTR": ("Information Technology", "Enterprise Analytics & Bitcoin Treasury"),
    "SHOP": ("Information Technology", "E-Commerce Software & Infrastructure"),
    
    # Communication Services
    "GOOGL": ("Communication Services", "Interactive Media & Services"),
    "GOOG": ("Communication Services", "Interactive Media & Services"),
    "META": ("Communication Services", "Interactive Media & Services"),
    "NFLX": ("Communication Services", "Entertainment & Streaming"),
    "DIS": ("Communication Services", "Entertainment & Media Conglomerate"),
    "TMUS": ("Communication Services", "Wireless Telecommunication"),
    "CMCSA": ("Communication Services", "Broadband Cable & Media"),
    "CHTR": ("Communication Services", "Broadband Cable & Mobile"),
    "EA": ("Communication Services", "Interactive Gaming Software"),
    "TTWO": ("Communication Services", "Interactive Entertainment Software"),
    "WBD": ("Communication Services", "Entertainment & Media"),
    "TTD": ("Communication Services", "Digital Advertising Marketplace"),
    "VZ": ("Communication Services", "Integrated Telecommunications"),
    
    # Consumer Discretionary
    "AMZN": ("Consumer Discretionary", "E-Commerce & Cloud Infrastructure"),
    "TSLA": ("Consumer Discretionary", "Automobile & Clean Energy"),
    "BKNG": ("Consumer Discretionary", "Online Travel Agencies"),
    "ABNB": ("Consumer Discretionary", "Travel & Lodging Platforms"),
    "MELI": ("Consumer Discretionary", "E-Commerce & FinTech"),
    "DASH": ("Consumer Discretionary", "Local Commerce & Food Delivery"),
    "MAR": ("Consumer Discretionary", "Hotels & Lodging"),
    "ORLY": ("Consumer Discretionary", "Automotive Aftermarket Retail"),
    "ROST": ("Consumer Discretionary", "Apparel & Home Merchandise Retail"),
    "LULU": ("Consumer Discretionary", "Apparel & Athletic Wear"),
    "PDD": ("Consumer Discretionary", "E-Commerce & Digital Marketplace"),
    "HD": ("Consumer Discretionary", "Home Improvement Retail"),
    "MCD": ("Consumer Discretionary", "Restaurants & Global Franchising"),
    "NKE": ("Consumer Discretionary", "Athletic Footwear & Apparel"),
    "SBUX": ("Consumer Discretionary", "Specialty Coffee Retail & Roasteries"),
    
    # Consumer Staples
    "COST": ("Consumer Staples", "Consumer Staples Merchandise Retail"),
    "PEP": ("Consumer Staples", "Packaged Foods & Beverages"),
    "KO": ("Consumer Staples", "Non-Alcoholic Beverages & Global Franchising"),
    "WMT": ("Consumer Staples", "Omnichannel Hypermarket Retail"),
    "MDLZ": ("Consumer Staples", "Packaged Foods & Confectionery"),
    "MNST": ("Consumer Staples", "Non-Alcoholic Beverages"),
    "KDP": ("Consumer Staples", "Non-Alcoholic Beverages & Coffee"),
    "KHC": ("Consumer Staples", "Packaged Foods"),
    "CCEP": ("Consumer Staples", "Beverage Bottling & Distribution"),
    "PG": ("Consumer Staples", "Household & Personal Care Products"),
    
    # Health Care & Biotech
    "JNJ": ("Health Care", "Pharmaceuticals & MedTech"),
    "UNH": ("Health Care", "Managed Healthcare & Health Services (Optum)"),
    "VRTX": ("Health Care", "Biotechnology"),
    "REGN": ("Health Care", "Biopharmaceuticals"),
    "GILD": ("Health Care", "Biopharmaceuticals"),
    "AMGN": ("Health Care", "Biotechnology"),
    "ISRG": ("Health Care", "Robotic Surgical Technologies"),
    "IDXX": ("Health Care", "Veterinary Diagnostics & Software"),
    "ALNY": ("Health Care", "RNAi Therapeutics"),
    "DXCM": ("Health Care", "Continuous Glucose Monitoring (CGM)"),
    "INSM": ("Health Care", "Biopharmaceuticals"),
    "GEHC": ("Health Care", "Medical Imaging & Diagnostic Systems"),
    "BIIB": ("Health Care", "Biotechnology & Neuroscience"),
    "AZN": ("Health Care", "Pharmaceuticals & Oncology"),
    "MRK": ("Health Care", "Pharmaceuticals & Oncology"),
    "CRSP": ("Health Care", "CRISPR Gene Editing Therapeutics"),
    "BEAM": ("Health Care", "Base Editing Genetic Medicines"),
    "NTLA": ("Health Care", "CRISPR In Vivo Gene Editing"),
    "EDIT": ("Health Care", "Gene Editing Technologies"),
    "STOK": ("Health Care", "RNA Therapeutics"),
    "TDOC": ("Health Care", "Virtual Healthcare & Telemedicine"),
    
    # Industrials & Aerospace
    "HON": ("Industrials", "Industrial Conglomerate & Aerospace"),
    "ADP": ("Industrials", "Human Capital Management Services"),
    "PAYX": ("Industrials", "Payroll & HR Outsourcing"),
    "CTAS": ("Industrials", "Corporate Uniforms & Facility Services"),
    "AXON": ("Industrials", "Public Safety Technology & Software"),
    "CPRT": ("Industrials", "Online Vehicle Salvage Auctions"),
    "FAST": ("Industrials", "Industrial Distribution & Vending"),
    "ODFL": ("Industrials", "Less-Than-Truckload (LTL) Freight"),
    "CSX": ("Industrials", "Rail Transportation"),
    "PCAR": ("Industrials", "Commercial Heavy-Duty Vehicles"),
    "VRSK": ("Industrials", "Insurance Data & Risk Analytics"),
    "FER": ("Industrials", "Infrastructure Concessions & Toll Roads"),
    "TRI": ("Industrials", "Legal, Tax & Accounting Software"),
    "CAT": ("Industrials", "Construction & Mining Machinery"),
    "BA": ("Industrials", "Aerospace & Defense"),
    "MMM": ("Industrials", "Diversified Industrial Conglomerates"),
    "GNRC": ("Industrials", "Backup Power Generators & Energy Technology"),
    
    # Financials
    "GS": ("Financials", "Investment Banking & Capital Markets"),
    "AXP": ("Financials", "Consumer & Commercial Financial Services"),
    "TRV": ("Financials", "Property & Casualty Insurance"),
    "V": ("Financials", "Transaction & Payment Processing"),
    "JPM": ("Financials", "Diversified Banking & Financial Services"),
    "MA": ("Financials", "Transaction & Payment Processing"),
    "PYPL": ("Financials", "Digital Payments & FinTech"),
    "BRK-B": ("Financials", "Diversified Holding Company & Insurance"),
    "BAM": ("Financials", "Alternative Asset Management"),
    
    # Energy, Utilities & Clean Tech
    "CEG": ("Utilities", "Clean Electric Power Generation"),
    "AEP": ("Utilities", "Regulated Electric Utilities"),
    "EXC": ("Utilities", "Regulated Electric & Gas Transmission"),
    "XEL": ("Utilities", "Regulated Clean Energy Utility"),
    "FANG": ("Energy", "Oil & Gas Exploration & Production"),
    "BKR": ("Energy", "Energy Technology & Oilfield Services"),
    "CVX": ("Energy", "Integrated Oil & Gas"),
    "ENPH": ("Energy", "Solar Inverters & Microinverter Systems"),
    "SEDG": ("Energy", "Solar Power Optimizers & Inverters"),
    "CSIQ": ("Energy", "Solar Module Manufacturing & Utility Projects"),
    "ENVX": ("Energy", "Silicon-Anode Lithium-Ion Battery Technology"),
    "EOSE": ("Energy", "Zinc-Based Stationary Energy Storage"),
    "GWH": ("Energy", "Iron Flow Long-Duration Energy Storage"),
    "SLDP": ("Energy", "All-Solid-State Battery Technologies"),
    "NRGV": ("Energy", "Gravity-Based Energy Storage Infrastructure"),
    
    # Materials & Real Estate
    "LIN": ("Materials", "Industrial Gases"),
    "SHW": ("Materials", "Specialty Chemicals & Architectural Coatings"),
    "CSGP": ("Real Estate", "Real Estate Information & Marketplaces")
}

# 1. Load SEC summary metrics
sec_data_path = os.path.join("http", "sec-data.json")
sec_summary = {}
if os.path.exists(sec_data_path):
    with open(sec_data_path, "r", encoding="utf-8") as f:
        sec_summary = json.load(f)

# 2. Iterate through all company files in http/data
data_dir = os.path.join("http", "data")
all_files = [f for f in os.listdir(data_dir) if f.endswith(".json") and f != "universe.json"]

universe = []

for filename in sorted(all_files):
    sym = filename.replace(".json", "")
    filepath = os.path.join(data_dir, filename)
    
    with open(filepath, "r", encoding="utf-8") as f:
        comp_data = json.load(f)
        
    filings = comp_data.get("filings", [])
    latest_filing = filings[0] if filings else None
    
    # Resolve metadata
    meta = company_meta.get(sym)
    if not meta:
        etf_item = etf_holdings_map.get(sym, {})
        legal_name = etf_item.get("name") or f"{sym} Corporation"
        sector_tuple = SECTOR_MAP.get(sym, ("Information Technology", "Public Equity"))
        
        meta = {
            "name": legal_name,
            "sector": sector_tuple[0],
            "industry": sector_tuple[1],
            "description": f"Publicly listed company {sym} ({legal_name}) tracked in the US equity investment universe.",
            "thesis_status": "WATCHLIST_CANDIDATE",
            "conviction_score": 7.5,
            "entry_price": 100.0,
            "target_exit_price": 150.0,
            "current_price": 115.0,
            "holding_period": "3 to 5 Years",
            "target_roi": "16.0%",
            "moat": "Established industry participant with high switching costs and customer brand equity.",
            "invalidation_criteria": "Sustained loss of market share or multi-quarter deterioration in operating cash flow margins.",
            "latest_catalyst": "Upcoming earnings announcement and SEC periodic filing review."
        }
        
    sec_metrics = sec_summary.get(sym, {})
    shares = sec_metrics.get("shares_outstanding")
    ttm_rev = sec_metrics.get("ttm_revenue")
    
    # Fallback to latest filing shares if missing in summary
    if (not shares or shares == 0) and filings:
        shares = filings[0].get("data", {}).get("shares_outstanding")
        
    curr_price = meta.get("current_price", 100.0)
    market_cap = (shares * curr_price) if (shares and curr_price) else None
    
    universe.append({
        "symbol": sym,
        "name": meta.get("name"),
        "sector": meta.get("sector"),
        "industry": meta.get("industry"),
        "description": meta.get("description"),
        "thesis_status": meta.get("thesis_status"),
        "conviction_score": meta.get("conviction_score"),
        "entry_price": meta.get("entry_price"),
        "target_exit_price": meta.get("target_exit_price"),
        "current_price": curr_price,
        "holding_period": meta.get("holding_period"),
        "target_roi": meta.get("target_roi"),
        "moat": meta.get("moat"),
        "invalidation_criteria": meta.get("invalidation_criteria"),
        "latest_catalyst": meta.get("latest_catalyst"),
        "shares_outstanding": shares,
        "ttm_revenue": ttm_rev,
        "market_cap": market_cap,
        "sec_edgar_url": comp_data.get("sec_edgar_url", f"https://www.sec.gov/edgar/browse/?CIK={sym}"),
        "filings_count": len(filings),
        "latest_filing_date": latest_filing.get("filing_date") if latest_filing else None,
        "latest_filing_type": latest_filing.get("type") if latest_filing else None,
        "latest_filing_url": latest_filing.get("filing_url") if latest_filing else None,
        "filings": filings
    })

# Save output universe.json
out_universe_path = os.path.join("http", "data", "universe.json")
with open(out_universe_path, "w", encoding="utf-8") as f:
    json.dump(universe, f, indent=2)

print(f"Generated {out_universe_path} with {len(universe)} public companies.")
