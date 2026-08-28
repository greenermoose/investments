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

REQUIRED_CAMPAIGN_FIELDS = [
    "campaign_id",
    "symbol",
    "short_seller_firm",
    "publication_date",
    "report_title",
    "report_url",
    "primary_allegations",
    "allegation_severity",
    "status",
]

ALLEGATION_SEVERITIES = {
    "CRITICAL_FRAUD",
    "HIGH_GOVERNANCE_RISK",
    "MODERATE_OVERVALUATION",
    "LOW_CONCERN",
}


def validate_campaigns(campaigns):
    """Structural validation against short_seller_campaign_schema.json.

    Campaign records are research: an agent read the short seller report, judged
    the severity of its allegations, and recorded the company rebuttal and the
    thesis verdict. This function checks the shape of what was recorded. It does
    not originate a campaign, and the removed seed_initial_campaigns() that used
    to hardcode five of them no longer exists.
    """
    errors = []
    seen = set()
    for idx, campaign in enumerate(campaigns):
        if not isinstance(campaign, dict):
            errors.append(f"campaign[{idx}] is not an object")
            continue
        cid = campaign.get("campaign_id", f"<campaign {idx}>")
        for field in REQUIRED_CAMPAIGN_FIELDS:
            if not campaign.get(field):
                errors.append(f"[{cid}] missing required field '{field}'")
        if cid in seen:
            errors.append(f"[{cid}] duplicate campaign_id")
        seen.add(cid)
        severity = campaign.get("allegation_severity")
        if severity and severity not in ALLEGATION_SEVERITIES:
            errors.append(f"[{cid}] allegation_severity '{severity}' is not recognized")
        url = campaign.get("report_url", "")
        if url and not str(url).startswith("http"):
            errors.append(f"[{cid}] report_url '{url}' is not a resolvable locator")
        allegations = campaign.get("primary_allegations")
        if allegations is not None and not isinstance(allegations, list):
            errors.append(f"[{cid}] primary_allegations must be an array")
    return errors


def save_campaigns(campaigns):
    errors = validate_campaigns(campaigns)
    if errors:
        raise ValueError(
            "Refusing to write invalid short seller campaigns:\n  " + "\n  ".join(errors))

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
    parser.add_argument("--audit", action="store_true", help="Validate recorded campaigns against the campaign schema")
    args = parser.parse_args()

    short_sellers = load_short_sellers_directory()
    campaigns = load_short_seller_campaigns()

    if args.audit:
        errors = validate_campaigns(campaigns)
        print(f"Validating {len(campaigns)} recorded short seller campaign(s)...")
        if errors:
            for err in errors:
                print(f"  FAIL: {err}")
            print(f"\n{len(errors)} validation error(s).")
            return 1
        print("All recorded campaigns conform to "
              "context/schemas/short_seller_campaign_schema.json.")
        return 0

    if args.list_firms:
        if args.json:
            print(json.dumps(short_sellers, indent=2))
            return 0
        print("================================================================================")
        print(f"DIRECTORY OF INFLUENTIAL ACTIVIST SHORT SELLERS ({len(short_sellers)} FIRMS)")
        print("================================================================================")
        print(f"{'RANK':<5} {'FIRM NAME':<32} {'FOUNDER / PRINCIPALS':<25} {'IMPACT':<10} {'DAY 1 AVG'}")
        print("-" * 84)
        for f in short_sellers:
            print(f"{f.get('rank', 0):<5} {f.get('firm_name', ''):<32} {f.get('founder_or_key_figures', ''):<25} {f.get('market_impact_rating', ''):<10} {f.get('estimated_avg_day1_drop_pct', 0.0):.1f}%")
        print("================================================================================")
        return 0

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
        return 0

    # Filtered list
    display_campaigns = campaigns
    if args.firm:
        display_campaigns = [c for c in display_campaigns if args.firm.lower() in c.get("short_seller_firm", "").lower()]
    if args.severity:
        display_campaigns = [c for c in display_campaigns if c.get("allegation_severity") == args.severity]

    if args.json:
        print(json.dumps(display_campaigns, indent=2))
        return 0

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
    return 0


if __name__ == "__main__":
    sys.exit(main())
