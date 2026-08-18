"""
Build Analyst Coverage Registry
Aggregates analyst price target data into a per-company coverage registry,
tracking which sell-side firms and individual analysts cover each equity.
Cross-references against the curated sell-side firms directory for research URLs.

Outputs:
  - scripts/data/analyst_coverage_registry.json
  - http/data/analyst_coverage_registry.json
  - context/data/analyst_coverage_registry.json
"""

import json
import os
from datetime import datetime, timezone

scripts_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(scripts_dir)
data_dir = os.path.join(scripts_dir, "data")
http_data_dir = os.path.join(root_dir, "http", "data")
context_data_dir = os.path.join(root_dir, "context", "data")
sources_dir = os.path.join(root_dir, "context", "sources")


def load_firms_directory():
    """Load the curated sell-side firms directory for research URL cross-referencing."""
    firms_path = os.path.join(sources_dir, "sell_side_firms_directory.json")
    if os.path.exists(firms_path):
        try:
            with open(firms_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Build a lookup by firm name and short name (case-insensitive)
                lookup = {}
                for firm in data.get("firms", []):
                    name_lower = firm["firm"].lower()
                    lookup[name_lower] = firm
                    if firm.get("short_name"):
                        lookup[firm["short_name"].lower()] = firm
                return lookup
        except Exception:
            pass
    return {}


def normalize_firm_name(firm_name):
    """Normalize firm name for matching against the directory."""
    name = firm_name.strip()
    # Remove common suffixes for matching
    for suffix in [" Securities", " Capital Markets", " Financial Group", " Global Research",
                   " Research", " Inc.", " LLC", " Group", " & Co."]:
        if name.endswith(suffix):
            name = name[:-len(suffix)].strip()
    return name


def find_firm_in_directory(firm_name, directory):
    """Try to find a firm in the directory using progressively looser matching."""
    if not directory:
        return None

    # Exact match
    if firm_name.lower() in directory:
        return directory[firm_name.lower()]

    # Normalized match
    normalized = normalize_firm_name(firm_name).lower()
    if normalized in directory:
        return directory[normalized]

    # Substring match (firm name contains or is contained in directory entry)
    for key, entry in directory.items():
        if normalized in key or key in normalized:
            return entry

    return None


def main():
    targets_file = os.path.join(data_dir, "analyst_price_targets.json")
    if not os.path.exists(targets_file):
        print("Error: analyst_price_targets.json not found. Run fetch_analyst_targets.py first.")
        return

    with open(targets_file, "r", encoding="utf-8") as f:
        all_targets = json.load(f)

    # Load firms directory for research URL cross-referencing
    firms_directory = load_firms_directory()
    print(f"Loaded sell-side firms directory: {len(firms_directory)} entries")

    registry = {}
    total_firms_count = 0
    total_reports_count = 0
    firms_with_urls = 0

    for sym, targets in all_targets.items():
        if not targets:
            continue

        # Aggregate by firm
        firm_map = {}
        for t in targets:
            firm = t.get("firm", "Unknown")
            analyst = t.get("analyst_name", "Unknown")
            date = t.get("announcement_date", "")
            rating = t.get("rating_action", "BUY")
            price = t.get("target_price", 0)

            key = firm
            if key not in firm_map:
                firm_map[key] = {
                    "firm": firm,
                    "lead_analyst": analyst,
                    "coverage_type": "Active",
                    "latest_rating": rating,
                    "latest_target_price": price,
                    "latest_date": date,
                    "total_reports": 0,
                    "all_analysts": set(),
                    "ir_page_listed": False,
                    "firm_research_url": None
                }

            firm_map[key]["total_reports"] += 1
            firm_map[key]["all_analysts"].add(analyst)

            # Update latest if this record is more recent
            if date > firm_map[key]["latest_date"]:
                firm_map[key]["latest_date"] = date
                firm_map[key]["latest_rating"] = rating
                firm_map[key]["latest_target_price"] = price
                firm_map[key]["lead_analyst"] = analyst

        # Cross-reference with firms directory for research URLs
        covering_firms = []
        for key, fm in firm_map.items():
            dir_entry = find_firm_in_directory(fm["firm"], firms_directory)
            if dir_entry:
                fm["firm_research_url"] = dir_entry.get("research_url")
                if fm["firm_research_url"]:
                    firms_with_urls += 1

            covering_firms.append({
                "firm": fm["firm"],
                "lead_analyst": fm["lead_analyst"],
                "coverage_type": fm["coverage_type"],
                "latest_rating": fm["latest_rating"],
                "latest_target_price": fm["latest_target_price"],
                "latest_date": fm["latest_date"],
                "total_reports": fm["total_reports"],
                "ir_page_listed": fm["ir_page_listed"],
                "firm_research_url": fm["firm_research_url"]
            })

        # Sort by latest date descending
        covering_firms.sort(key=lambda x: x["latest_date"], reverse=True)

        total_reports = sum(f["total_reports"] for f in covering_firms)
        registry[sym] = {
            "symbol": sym,
            "covering_firms": covering_firms,
            "total_covering_firms": len(covering_firms),
            "total_reports": total_reports,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }

        total_firms_count += len(covering_firms)
        total_reports_count += total_reports

    # Save to all three locations
    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(http_data_dir, exist_ok=True)
    os.makedirs(context_data_dir, exist_ok=True)

    for out_path in [
        os.path.join(data_dir, "analyst_coverage_registry.json"),
        os.path.join(http_data_dir, "analyst_coverage_registry.json"),
        os.path.join(context_data_dir, "analyst_coverage_registry.json"),
    ]:
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(registry, f, indent=2)

    # Print summary diagnostics
    print(f"\nAnalyst Coverage Registry Built Successfully")
    print(f"  Equities with coverage: {len(registry)}")
    print(f"  Total firm-equity coverage pairs: {total_firms_count}")
    print(f"  Total individual reports: {total_reports_count}")
    print(f"  Firms matched to directory URLs: {firms_with_urls}")

    # Top covered equities
    by_coverage = sorted(registry.items(), key=lambda x: x[1]["total_covering_firms"], reverse=True)
    print(f"\nTop 10 Most-Covered Equities:")
    for sym, entry in by_coverage[:10]:
        print(f"  {sym:6s}: {entry['total_covering_firms']} firms, {entry['total_reports']} reports")

    # Broadest covering firms
    firm_breadth = {}
    for sym, entry in registry.items():
        for cf in entry["covering_firms"]:
            fn = cf["firm"]
            if fn not in firm_breadth:
                firm_breadth[fn] = 0
            firm_breadth[fn] += 1

    by_breadth = sorted(firm_breadth.items(), key=lambda x: x[1], reverse=True)
    print(f"\nTop 15 Broadest-Covering Firms:")
    for firm, count in by_breadth[:15]:
        print(f"  {firm:40s}: covers {count} equities")

    print(f"\nSaved registry to scripts/data/, http/data/, and context/data/")


if __name__ == "__main__":
    main()
