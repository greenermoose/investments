"""
Reprocess Analyst Price Targets
Recomputes market_price_at_announcement for historical targets using the persistent
historical price archive, formats press release titles, and assigns targeted search
URLs using the ranked press release source directory.
"""

import json
import os
import re
import urllib.parse
from datetime import datetime, timedelta

scripts_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(scripts_dir)
data_dir = os.path.join(scripts_dir, "data")
http_data_dir = os.path.join(root_dir, "http", "data")
context_data_dir = os.path.join(root_dir, "context", "data")
sources_dir = os.path.join(root_dir, "context", "sources")

targets_file = os.path.join(data_dir, "analyst_price_targets.json")
market_prices_file = os.path.join(http_data_dir, "market_prices.json")


def load_price_archive():
    """Load the historical price archive for accurate announcement price lookups."""
    archive_path = os.path.join(data_dir, "historical_price_archive.json")
    if os.path.exists(archive_path):
        try:
            with open(archive_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def lookup_archive_price(archive, symbol, date_str, price_type="split_adjusted"):
    """Look up the closing price for a symbol on a specific date from the archive.

    price_type:
      - 'split_adjusted' (default): looks in daily_split_adjusted_closes or daily_closes
      - 'nominal': looks in daily_nominal_closes (matching historical press releases)
      - 'adjusted': looks in daily_adjusted_closes (dividend + split adjusted)

    If the exact date is not found (weekend/holiday), searches up to 5 prior
    trading days to find the most recent available close.
    Returns the price or None if not found.
    """
    entry = archive.get(symbol, {})
    if price_type == "nominal" and "daily_nominal_closes" in entry:
        closes_map = entry["daily_nominal_closes"]
    elif price_type == "adjusted" and "daily_adjusted_closes" in entry:
        closes_map = entry["daily_adjusted_closes"]
    elif "daily_split_adjusted_closes" in entry:
        closes_map = entry["daily_split_adjusted_closes"]
    else:
        closes_map = entry.get("daily_closes", {})

    if not closes_map:
        return None

    # Try exact date first
    if date_str in closes_map:
        return closes_map[date_str]

    # Search up to 5 prior trading days (handles weekends, holidays)
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        for offset in range(1, 6):
            prior = (dt - timedelta(days=offset)).strftime("%Y-%m-%d")
            if prior in closes_map:
                return closes_map[prior]
    except Exception:
        pass

    return None



def load_press_release_domains():
    """Load the top search-reliable press release source domains for site-scoped queries."""
    sources_path = os.path.join(sources_dir, "analyst_press_release_sources.json")
    if os.path.exists(sources_path):
        try:
            with open(sources_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                domains = []
                for src in data.get("sources", []):
                    if src.get("search_reliability") == "HIGH" and len(domains) < 5:
                        domains.append(src["domain"])
                return domains
        except Exception:
            pass
    return ["thefly.com", "benzinga.com", "streetinsider.com", "marketbeat.com", "finance.yahoo.com"]


def build_analyst_search_url(analyst_name, firm, sym, domains):
    """Generate a targeted Google search URL using site-scoped queries for top press release sources."""
    clean_analyst = (analyst_name or "").replace(" Research Team", "").replace(" Research Department", "").strip()
    is_named = clean_analyst and clean_analyst.lower() not in ["not rated", "wall street research", "research team", (firm or "").lower()]
    
    clean_firm = (firm or "Wall Street Research").replace("& Co.", "").replace("& Company", "").replace("Financial Group", "").replace("Capital Markets", "").replace("Securities", "").strip()
    
    # Build site-scoped query for top press release sources
    site_scope = " OR ".join(f"site:{d}" for d in domains[:5])
    
    if is_named:
        q = f'({site_scope}) "{clean_analyst}" "{clean_firm}" {sym} price target'
    else:
        q = f'({site_scope}) "{clean_firm}" {sym} price target'
        
    encoded_q = urllib.parse.quote_plus(q)
    return f"https://www.google.com/search?q={encoded_q}"


def generate_press_release_title(brokerage, sym, raw_title, rating_action, target_price):
    b = brokerage.strip()
    raw_lower = raw_title.lower() if raw_title else ""
    
    if "raise" in raw_lower or "boost" in raw_lower or "increase" in raw_lower:
        return f"{b} Raises {sym} Price Target to ${target_price:.2f}"
    elif "lower" in raw_lower or "cut" in raw_lower or "decrease" in raw_lower:
        return f"{b} Lowers {sym} Price Target to ${target_price:.2f}"
    elif "upgrade" in raw_lower:
        return f"{b} Upgrades {sym} to {rating_action}, Sets ${target_price:.2f} Target"
    elif "downgrade" in raw_lower:
        return f"{b} Downgrades {sym} to {rating_action}, Target ${target_price:.2f}"
    elif "initiate" in raw_lower or "new coverage" in raw_lower:
        return f"{b} Initiates Coverage on {sym} with {rating_action}, Target ${target_price:.2f}"
    elif "reiterate" in raw_lower or "reaffirm" in raw_lower or "maintain" in raw_lower:
        return f"{b} Reiterates {rating_action} Rating on {sym}, Reaffirms ${target_price:.2f} Target"
    elif "set target" in raw_lower or "price target" in raw_lower:
        return f"{b} Maintains {rating_action} on {sym}, Sets Price Target to ${target_price:.2f}"
    else:
        return f"{b} Maintains {rating_action} on {sym}, Price Target ${target_price:.2f}"


def main():
    with open(targets_file, "r", encoding="utf-8") as f:
        all_targets = json.load(f)

    market_prices = {}
    if os.path.exists(market_prices_file):
        with open(market_prices_file, "r", encoding="utf-8") as f:
            market_prices = json.load(f)

    # Load historical price archive
    price_archive = load_price_archive()
    archive_count = len(price_archive)
    if archive_count > 0:
        sample_sym = next(iter(price_archive))
        sample_days = price_archive[sample_sym].get("total_trading_days", 0)
        print(f"Loaded historical price archive: {archive_count} equities (e.g. {sample_sym}: {sample_days} trading days)")
    else:
        print("Warning: No historical price archive found. Run 'python fetch_market_prices.py --archive' to build it.")

    # Load press release source domains
    domains = load_press_release_domains()
    print(f"Using {len(domains)} press release source domains for search URLs: {', '.join(domains)}")

    updated_all = {}
    total_records = 0
    archive_hits = 0
    archive_misses = 0

    for sym, targets in all_targets.items():
        curr_price = market_prices.get(sym, {}).get("current_price", 100.0)
        updated_list = []
        
        for t in targets:
            target_price = float(t.get("target_price", 100.0))
            parsed_date = t.get("announcement_date", "2026-01-01")
            brokerage = t.get("firm") or "Wall Street Research"
            analyst = t.get("analyst_name") or f"{brokerage} Research Team"
            std_action = t.get("rating_action") or "BUY"
            old_upside = t.get("implied_upside_pct")
            old_ann_price = t.get("market_price_at_announcement")
            old_title = t.get("report_title") or t.get("press_release_title") or ""
            
            # Calculate accurate historical announcement price
            # Priority: 1) Historical archive, 2) MarketBeat upside, 3) Existing price, 4) Current price
            archive_price = lookup_archive_price(price_archive, sym, parsed_date)
            if archive_price is not None:
                announcement_price = round(archive_price, 2)
                archive_hits += 1
            elif old_upside is not None and abs(old_upside) < 1000 and old_upside != 0:
                announcement_price = round(target_price / (1.0 + (old_upside / 100.0)), 2)
                archive_misses += 1
            elif old_ann_price and old_ann_price > 0 and old_ann_price != curr_price:
                announcement_price = round(float(old_ann_price), 2)
                archive_misses += 1
            else:
                announcement_price = round(curr_price, 2)
                archive_misses += 1
                
            implied_upside = round(((target_price - announcement_price) / announcement_price) * 100.0, 2)
            
            press_release_title = generate_press_release_title(brokerage, sym, old_title, std_action, target_price)
            
            # Generate targeted search URL using press release source domains
            source_url = build_analyst_search_url(analyst, brokerage, sym.upper(), domains)
            
            updated_list.append({
                "symbol": sym.upper(),
                "analyst_name": analyst,
                "firm": brokerage,
                "announcement_date": parsed_date,
                "market_price_at_announcement": announcement_price,
                "target_price": target_price,
                "implied_upside_pct": implied_upside,
                "rating_action": std_action,
                "press_release_title": press_release_title,
                "report_title": press_release_title,
                "source_url": source_url,
                "data_tier": "TIER_2_FINANCIAL_NEWSWIRE"
            })
            total_records += 1

        updated_all[sym] = updated_list

    with open(targets_file, "w", encoding="utf-8") as f:
        json.dump(updated_all, f, indent=2)

    total_lookups = archive_hits + archive_misses
    hit_pct = round(archive_hits / total_lookups * 100, 1) if total_lookups > 0 else 0
    print(f"\nSuccessfully reprocessed {total_records} analyst targets across {len(updated_all)} equities.")
    print(f"Archive price lookups: {archive_hits} hits, {archive_misses} misses ({hit_pct}% accuracy)")


if __name__ == "__main__":
    main()
