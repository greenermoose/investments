"""
Track Short Sellers & Activist Campaigns CLI Tool
Surveils activist short seller reports, assesses allegation severity, computes market price reactions,
and coordinates thesis invalidation or buy-the-dip rebuttal evaluations.
"""

import argparse
from datetime import datetime, timezone
import json
import os
import sys

def get_base_dirs():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return {
        "root": root_dir,
        "sources": os.path.join(root_dir, "context", "sources"),
        "scripts_data": os.path.join(root_dir, "scripts", "data"),
        "http_data": os.path.join(root_dir, "http", "data"),
        "context_data": os.path.join(root_dir, "context", "data"),
    }

def load_short_sellers_directory():
    dirs = get_base_dirs()
    path = os.path.join(dirs["sources"], "short_sellers_directory.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f).get("short_sellers", [])
    return []

def load_short_seller_campaigns():
    dirs = get_base_dirs()
    path = os.path.join(dirs["context_data"], "short_seller_campaigns.json")
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("campaigns", [])
        except Exception:
            return []
    return []

def seed_initial_campaigns():
    """
    Seed initial documented short seller campaigns across public equities to provide
    rich adversarial research context for the agent team.
    """
    return [
        {
          "campaign_id": "SSC-2024-SMCI-HINDENBURG",
          "symbol": "SMCI",
          "company_name": "Super Micro Computer, Inc.",
          "short_seller_firm": "Hindenburg Research",
          "publication_date": "2024-08-27",
          "report_title": "Super Micro Computer: Fresh Evidence of Accounting Manipulation, Sibling Self-Dealing and Sanctions Evasion",
          "report_url": "https://hindenburgresearch.com/smci/",
          "primary_allegations": [
            "Undisclosed related-party transactions with CEO family entities Ablecom and Compuware",
            "Improper revenue recognition and premature shipment booking",
            "Rehiring of executives previously implicated in SEC accounting restatement"
          ],
          "allegation_severity": "CRITICAL_FRAUD",
          "stock_price_before_report": 548.00,
          "stock_price_day1_close": 443.50,
          "day1_reaction_pct": -19.07,
          "status": "REGULATORY_ACTION_CONFIRMED",
          "company_rebuttal_summary": "Company delayed 10-K filing, appointed special board committee, and later auditor Ernst & Young resigned.",
          "agent_thesis_verdict": "AVOID_LIST_CONFIRMED",
          "thesis_action_rationale": "High forensic accounting risk and auditor resignation mandate strict Avoid status until audited financial restatements are filed."
        },
        {
          "campaign_id": "SSC-2024-ENVX-SCORPION",
          "symbol": "ENVX",
          "company_name": "Enovix Corporation",
          "short_seller_firm": "Scorpion Capital",
          "publication_date": "2023-01-20",
          "report_title": "A Toxic Silicon Mirage: Enovix's Manufacturing Impossibility and Battery Yield Collapse",
          "report_url": "https://scorpioncapital.com/research",
          "primary_allegations": [
            "Exaggerated silicon battery energy density and unviable commercial yields",
            "Delays in Fab-1 automated manufacturing line in Fremont",
            "Excessive cash burn relative to commercialization timeline"
          ],
          "allegation_severity": "HIGH_GOVERNANCE_RISK",
          "stock_price_before_report": 12.10,
          "stock_price_day1_close": 7.15,
          "day1_reaction_pct": -40.91,
          "status": "SETTLED_PRICED_IN",
          "company_rebuttal_summary": "Enovix restructured executive team, appointed TJ Rodgers as Executive Chairman, pivoted manufacturing to Fab-2 in Malaysia, and validated Route 1 high-volume samples.",
          "agent_thesis_verdict": "MONITOR_RUNWAY_COVENANTS",
          "thesis_action_rationale": "Commercial pivot to Malaysia Fab-2 derisked production, but quarterly cash burn and customer qualification milestones require close quarterly monitoring."
        },
        {
          "campaign_id": "SSC-2023-SLDP-JCAPITAL",
          "symbol": "SLDP",
          "company_name": "Solid Power, Inc.",
          "short_seller_firm": "J Capital Research",
          "publication_date": "2023-04-12",
          "report_title": "Solid Power: Solid State Science Project Running on Empty",
          "report_url": "https://www.jcapitalresearch.com/reports",
          "primary_allegations": [
            "All-solid-state electrolyte degradation and low cycle life under real automotive conditions",
            "Commercial automotive deployment timeline pushed beyond 2028",
            "Over-reliance on joint development partners BMW and Ford"
          ],
          "allegation_severity": "MODERATE_OVERVALUATION",
          "stock_price_before_report": 2.45,
          "stock_price_day1_close": 2.18,
          "day1_reaction_pct": -11.02,
          "status": "SETTLED_PRICED_IN",
          "company_rebuttal_summary": "Solid Power delivered A-sample cells to BMW for parallel testing, expanded Korean pilot facility, and maintained $350M+ liquid balance sheet runway.",
          "agent_thesis_verdict": "MONITOR_RUNWAY_COVENANTS",
          "thesis_action_rationale": "High cash balance provides >3 years runway, but long commercialization horizon caps allocation size."
        },
        {
          "campaign_id": "SSC-2024-MSTR-KERRISDALE",
          "symbol": "MSTR",
          "company_name": "MicroStrategy Incorporated",
          "short_seller_firm": "Kerrisdale Capital",
          "publication_date": "2024-03-28",
          "report_title": "Long Bitcoin, Short MicroStrategy: Unjustifiable 2.3x Net Asset Value Premium",
          "report_url": "https://www.kerrisdalecap.com/blog/",
          "primary_allegations": [
            "MicroStrategy trading at an unsustainable 100%+ premium to underlying Bitcoin holdings",
            "Core enterprise analytics software revenue stagnant and declining",
            "Debt-financed Bitcoin accumulation creating extreme dilution risk if NAV premium compresses"
          ],
          "allegation_severity": "MODERATE_OVERVALUATION",
          "stock_price_before_report": 170.50,
          "stock_price_day1_close": 151.40,
          "day1_reaction_pct": -11.20,
          "status": "MONITORING",
          "company_rebuttal_summary": "Management continued executing convertible bond offerings with 0% coupons and buying Bitcoin accretively on per-share BTC Yield basis.",
          "agent_thesis_verdict": "THESIS_INTACT_BUY_THE_DIP",
          "thesis_action_rationale": "Software revenue is secondary; MSTR acts as an active capital markets vehicle. However, valuation must be disciplined to avoid buying above peak NAV multiple bands."
        },
        {
          "campaign_id": "SSC-2024-PDD-GRIZZLY",
          "symbol": "PDD",
          "company_name": "PDD Holdings Inc.",
          "short_seller_firm": "Grizzly Research",
          "publication_date": "2023-09-07",
          "report_title": "We Believe PDD Is a Dying Fraud and Temu Is Cleverly Concealed Malware",
          "report_url": "https://grizzlyreports.com/feed/",
          "primary_allegations": [
            "Temu mobile application allegedly incorporates unauthorized spyware and data exfiltration",
            "Fabrication of domestic China GMV and merchant take-rates",
            "Unreconciled cash balances in Chinese domestic subsidiaries"
          ],
          "allegation_severity": "HIGH_GOVERNANCE_RISK",
          "stock_price_before_report": 98.40,
          "stock_price_day1_close": 96.60,
          "day1_reaction_pct": -1.83,
          "status": "REFUTED_BY_COMPANY",
          "company_rebuttal_summary": "Subsequent quarterly earnings demonstrated massive international revenue and operating profit growth; app security certifications updated.",
          "agent_thesis_verdict": "THESIS_INTACT_BUY_THE_DIP",
          "thesis_action_rationale": "Market price reacted minimally, and massive free cash flow conversion ($20B+ TTM) confirmed operating leverage."
        }
    ]

def save_campaigns(campaigns):
    dirs = get_base_dirs()
    output_doc = {
        "schema_version": "1.0",
        "description": "Registry of activist short seller reports and campaigns tracked across public equities.",
        "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "provenance": "TIER_4_AGENT_PARAMETRIC_KNOWLEDGE",
        "campaigns": campaigns
    }

    for out_dir in [dirs["scripts_data"], dirs["http_data"], dirs["context_data"]]:
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, "short_seller_campaigns.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(output_doc, f, indent=2)

def main():
    parser = argparse.ArgumentParser(description="Track and audit activist short seller reports against universe public equities.")
    parser.add_argument("--symbol", type=str, help="Check short campaign records and search queries for a specific ticker")
    parser.add_argument("--firm", type=str, help="Filter campaigns by short seller firm name")
    parser.add_argument("--severity", type=str, choices=["CRITICAL_FRAUD", "HIGH_GOVERNANCE_RISK", "MODERATE_OVERVALUATION", "LOW_CONCERN"])
    parser.add_argument("--list-firms", action="store_true", help="List all 20 influential short seller firms")
    parser.add_argument("--json", action="store_true", help="Output raw JSON")
    parser.add_argument("--seed", action="store_true", help="Seed/reset documented short seller campaigns")
    args = parser.parse_args()

    short_sellers = load_short_sellers_directory()
    campaigns = load_short_seller_campaigns()

    if not campaigns or args.seed:
        campaigns = seed_initial_campaigns()
        save_campaigns(campaigns)

    if args.list_firms:
        if args.json:
            print(json.dumps(short_sellers, indent=2))
            return
        print("================================================================================")
        print(f"DIRECTORY OF INFLUENTIAL ACTIVIST SHORT SELLERS ({len(short_sellers)} FIRMS)")
        print("================================================================================")
        print(f"{'RANK':<5} {'FIRM NAME':<32} {'FOUNDER / PRINCIPALS':<25} {'IMPACT':<10} {'DAY 1 AVG'}")
        print("-" * 84)
        for f in short_sellers:
            print(f"{f.get('rank', 0):<5} {f.get('firm_name', ''):<32} {f.get('founder_or_key_figures', ''):<25} {f.get('market_impact_rating', ''):<10} {f.get('estimated_avg_day1_drop_pct', 0.0):.1f}%")
        print("================================================================================")
        return

    if args.symbol:
        sym = args.symbol.upper()
        matched = [c for c in campaigns if c.get("symbol", "").upper() == sym]
        
        print("================================================================================")
        print(f"SHORT SELLER INTELLIGENCE FOR SYMBOL: {sym}")
        print("================================================================================")
        
        if matched:
            print(f"Found {len(matched)} tracked short campaign(s):")
            for c in matched:
                print(f"\n- Report: {c.get('report_title')}")
                print(f"  Firm:   {c.get('short_seller_firm')} (Date: {c.get('publication_date')})")
                print(f"  Impact: {c.get('day1_reaction_pct', 0.0):+.2f}% Day 1 Move (Price: ${c.get('stock_price_before_report', 0):.2f} -> ${c.get('stock_price_day1_close', 0):.2f})")
                print(f"  Status: {c.get('status')} | Verdict: {c.get('agent_thesis_verdict')}")
                print(f"  Key Allegations:")
                for a in c.get("primary_allegations", []):
                    print(f"    * {a}")
                print(f"  Thesis Rationale: {c.get('thesis_action_rationale')}")
        else:
            print(f"Zero active short reports currently tracked for {sym}.")

        print("\nAdversarial Search Query Templates to verify potential emerging reports:")
        for s in short_sellers[:5]:
            q = s.get("search_query_template", "").replace("{SYMBOL}", sym)
            print(f"  [{s.get('firm_name')}]: {q}")
        print("================================================================================")
        return

    # Filtered list
    display_campaigns = campaigns
    if args.firm:
        display_campaigns = [c for c in display_campaigns if args.firm.lower() in c.get("short_seller_firm", "").lower()]
    if args.severity:
        display_campaigns = [c for c in display_campaigns if c.get("allegation_severity") == args.severity]

    if args.json:
        print(json.dumps(display_campaigns, indent=2))
        return

    print("================================================================================")
    print(f"TRACKED ACTIVIST SHORT SELLER CAMPAIGNS ({len(display_campaigns)} Records)")
    print("================================================================================")
    print(f"{'SYMBOL':<7} {'FIRM':<24} {'DATE':<12} {'DAY 1':<8} {'SEVERITY':<22} {'STATUS'}")
    print("-" * 88)
    for c in display_campaigns:
        day1_str = f"{c.get('day1_reaction_pct', 0.0):+.1f}%"
        print(f"{c.get('symbol', ''):<7} {c.get('short_seller_firm', '')[:23]:<24} {c.get('publication_date', ''):<12} {day1_str:<8} {c.get('allegation_severity', ''):<22} {c.get('status', '')}")
    print("================================================================================")
    print("Execute 'python scripts/track_short_sellers.py --symbol <TICKER>' for deep report breakdown.")

if __name__ == "__main__":
    main()
