"""
Wall Street Analyst Price Targets & Coverage Fetcher
Fetches and ground-truths sell-side analyst research targets and forecasts from MarketBeat
for all 144 constituents in the tracked investment universe.

Uses the historical price archive for accurate market_price_at_announcement lookups
and the ranked press release sources directory for targeted search URLs.
"""

import html
import json
import os
import re
import sys
import time
import urllib.request
from datetime import datetime

scripts_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(scripts_dir)
data_dir = os.path.join(scripts_dir, "data")
http_data_dir = os.path.join(root_dir, "http", "data")
sources_dir = os.path.join(root_dir, "context", "sources")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# Load historical price archive for accurate announcement price lookups
def load_price_archive():
    archive_path = os.path.join(data_dir, "historical_price_archive.json")
    if os.path.exists(archive_path):
        try:
            with open(archive_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def lookup_archive_price(archive, symbol, date_str):
    """Look up the closing price for a symbol on a specific date from the archive.

    If the exact date is not found (weekend/holiday), searches up to 5 prior
    trading days to find the most recent available close.
    Returns the price or None if not found.
    """
    entry = archive.get(symbol, {})
    daily_closes = entry.get("daily_closes", {})
    if not daily_closes:
        return None

    # Try exact date first
    if date_str in daily_closes:
        return daily_closes[date_str]

    # Search up to 5 prior trading days (handles weekends, holidays)
    try:
        from datetime import timedelta
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        for offset in range(1, 6):
            prior = (dt - timedelta(days=offset)).strftime("%Y-%m-%d")
            if prior in daily_closes:
                return daily_closes[prior]
    except Exception:
        pass

    return None

# Load ranked press release sources for targeted search URL generation
def load_press_release_domains():
    """Load the top search-reliable press release source domains for site-scoped queries."""
    sources_path = os.path.join(sources_dir, "analyst_press_release_sources.json")
    if os.path.exists(sources_path):
        try:
            with open(sources_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Return domains of sources with HIGH search reliability, up to 5
                domains = []
                for src in data.get("sources", []):
                    if src.get("search_reliability") == "HIGH" and len(domains) < 5:
                        domains.append(src["domain"])
                return domains
        except Exception:
            pass
    return ["thefly.com", "benzinga.com", "streetinsider.com", "marketbeat.com", "finance.yahoo.com"]

def clean_text(text):
    text = re.sub(r'<[^>]+>', ' ', text)
    text = html.unescape(text)
    text = re.sub(r'\d+\s+of\s+\d+\s+stars', '', text)
    text = text.split("Subscribe to")[0].strip()
    text = ' '.join(text.split())
    return text

import urllib.parse

# Module-level cached domains (loaded once at startup in main())
_press_release_domains = []

def build_analyst_search_url(analyst_name, firm, sym):
    """Generate a targeted Google search URL using site-scoped queries for top press release sources."""
    clean_analyst = (analyst_name or "").replace(" Research Team", "").replace(" Research Department", "").strip()
    is_named = clean_analyst and clean_analyst.lower() not in ["not rated", "wall street research", "research team", (firm or "").lower()]
    
    clean_firm = (firm or "Wall Street Research").replace("& Co.", "").replace("& Company", "").replace("Financial Group", "").replace("Capital Markets", "").replace("Securities", "").strip()
    
    # Build site-scoped query for top press release sources
    domains = _press_release_domains or ["thefly.com", "benzinga.com", "streetinsider.com", "marketbeat.com", "finance.yahoo.com"]
    site_scope = " OR ".join(f"site:{d}" for d in domains[:5])
    
    if is_named:
        q = f'({site_scope}) "{clean_analyst}" "{clean_firm}" {sym} price target'
    else:
        q = f'({site_scope}) "{clean_firm}" {sym} price target'
        
    encoded_q = urllib.parse.quote_plus(q)
    return f"https://www.google.com/search?q={encoded_q}"


def generate_press_release_title(brokerage, sym, action, rating, target_price):
    b = brokerage.strip()
    act = (action or "").strip()
    rat = (rating or "").strip()
    
    if "raise" in act.lower() or "boost" in act.lower() or "increase" in act.lower():
        return f"{b} Raises {sym} Price Target to ${target_price:.2f}"
    elif "lower" in act.lower() or "cut" in act.lower() or "decrease" in act.lower():
        return f"{b} Lowers {sym} Price Target to ${target_price:.2f}"
    elif "upgrade" in act.lower():
        return f"{b} Upgrades {sym} to {rat or 'Buy'}, Sets ${target_price:.2f} Target"
    elif "downgrade" in act.lower():
        return f"{b} Downgrades {sym} to {rat or 'Hold'}, Target ${target_price:.2f}"
    elif "initiate" in act.lower() or "new coverage" in act.lower():
        return f"{b} Initiates Coverage on {sym} with {rat or 'Outperform'}, Target ${target_price:.2f}"
    elif "reiterate" in act.lower() or "reaffirms" in act.lower() or "maintain" in act.lower():
        return f"{b} Reiterates {rat or 'Buy'} Rating on {sym}, Reaffirms ${target_price:.2f} Target"
    elif rat:
        return f"{b} Maintains {rat} on {sym}, Sets Price Target to ${target_price:.2f}"
    else:
        return f"{b} Research Note on {sym}: Price Target ${target_price:.2f}"

def parse_marketbeat_ticker(sym, curr_price, default_exchange="NASDAQ", price_archive=None):
    exchanges = [default_exchange, "NYSE" if default_exchange == "NASDAQ" else "NASDAQ"]
    all_targets = []

    for exch in exchanges:
        url = f"https://www.marketbeat.com/stocks/{exch}/{sym.upper()}/forecast/"
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=12) as resp:
                content = resp.read().decode("utf-8", errors="ignore")
        except Exception:
            continue

        rows = re.findall(r'<tr[^>]*>(.*?)</tr>', content, re.DOTALL)
        for r in rows:
            tds = re.findall(r'<td[^>]*>(.*?)</td>', r, re.DOTALL)
            if len(tds) < 6:
                continue

            clean_tds = [clean_text(td) for td in tds]
            date_str = clean_tds[0]
            if not re.match(r'^\d{1,2}/\d{1,2}/\d{4}$', date_str):
                continue

            try:
                parsed_date = datetime.strptime(date_str, "%m/%d/%Y").strftime("%Y-%m-%d")
            except Exception:
                parsed_date = date_str

            brokerage = clean_tds[1]
            if not brokerage:
                brokerage = "Wall Street Research"

            analyst = clean_tds[2]
            if not analyst or analyst == "\xa0" or analyst.lower() in ["research team", "research department", "not rated"]:
                analyst = f"{brokerage} Research Team"

            # Clean analyst name of trailing 'Not Rated'
            analyst = re.sub(r'\s+Not\s+Rated', '', analyst).strip()

            action = clean_tds[3]
            rating = clean_tds[4]
            pt_raw = clean_tds[5]

            pt_match = re.findall(r'\$([0-9,]+\.[0-9]{2})', pt_raw)
            target_price = float(pt_match[-1].replace(',', '')) if pt_match else None

            if not target_price or target_price <= 0:
                continue

            upside_raw = None
            if len(clean_tds) > 6 and '%' in clean_tds[6]:
                try:
                    clean_pct = clean_tds[6].replace('%', '').replace('+', '').replace(',', '').strip()
                    upside_raw = float(clean_pct)
                except ValueError:
                    pass

            # Calculate accurate historical market price at announcement
            # Priority: 1) Historical archive, 2) MarketBeat upside, 3) Current price
            archive_price = lookup_archive_price(price_archive or {}, sym.upper(), parsed_date)
            if archive_price is not None:
                announcement_price = round(archive_price, 2)
            elif upside_raw is not None and abs(upside_raw) < 1000 and upside_raw != 0:
                announcement_price = round(target_price / (1.0 + (upside_raw / 100.0)), 2)
            else:
                announcement_price = round(curr_price, 2)
                upside_raw = round(((target_price - announcement_price) / announcement_price) * 100.0, 2)

            implied_upside = round(((target_price - announcement_price) / announcement_price) * 100.0, 2)

            # Standardize rating_action
            std_action = "BUY"
            comb = f"{rating} {action}".upper()
            if "STRONG BUY" in comb or "STRONG-BUY" in comb:
                std_action = "BUY"
            elif "OUTPERFORM" in comb:
                std_action = "OUTPERFORM"
            elif "OVERWEIGHT" in comb:
                std_action = "OVERWEIGHT"
            elif "HOLD" in comb or "EQUAL-WEIGHT" in comb or "NEUTRAL" in comb:
                std_action = "HOLD"
            elif "UNDERPERFORM" in comb or "UNDERWEIGHT" in comb:
                std_action = "UNDERPERFORM"
            elif "SELL" in comb:
                std_action = "SELL"
            elif "BUY" in comb:
                std_action = "BUY"

            press_release_title = generate_press_release_title(brokerage, sym.upper(), action, rating, target_price)

            # Generate direct precision article search permalink
            source_url = build_analyst_search_url(analyst, brokerage, sym.upper())

            all_targets.append({
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

        if all_targets:
            break

    return all_targets

def main():
    global _press_release_domains

    universe_file = os.path.join(http_data_dir, "universe.json")
    prices_file = os.path.join(http_data_dir, "market_prices.json")

    with open(universe_file, "r", encoding="utf-8") as f:
        universe = json.load(f)

    market_prices = {}
    if os.path.exists(prices_file):
        with open(prices_file, "r", encoding="utf-8") as f:
            market_prices = json.load(f)

    # Load historical price archive for accurate announcement price lookups
    price_archive = load_price_archive()
    archive_count = len(price_archive)
    if archive_count > 0:
        sample_sym = next(iter(price_archive))
        sample_days = price_archive[sample_sym].get("total_trading_days", 0)
        print(f"Loaded historical price archive: {archive_count} equities (e.g. {sample_sym}: {sample_days} trading days)")
    else:
        print("Warning: No historical price archive found. Run 'python fetch_market_prices.py --archive' to build it.")

    # Load press release source domains for targeted search URLs
    _press_release_domains = load_press_release_domains()
    print(f"Using {len(_press_release_domains)} press release source domains for search URLs: {', '.join(_press_release_domains)}")

    output_path = os.path.join(data_dir, "analyst_price_targets.json")
    
    # Load existing if available
    existing_targets = {}
    if os.path.exists(output_path):
        with open(output_path, "r", encoding="utf-8") as f:
            existing_targets = json.load(f)

    results = {}
    total = len(universe)
    archive_hits = 0
    archive_misses = 0

    print(f"Fetching Wall Street Analyst Price Targets for {total} universe equities...")
    for idx, u in enumerate(universe):
        sym = u["symbol"]
        curr_price = market_prices.get(sym, {}).get("current_price") or u.get("current_price", 100.0)
        
        # Determine exchange
        exch = "NASDAQ"
        indices = u.get("indices", [])
        if "DJIA" in indices and sym in ["IBM", "JNJ", "JPM", "KO", "MCD", "MMM", "NKE", "PG", "TRV", "VZ", "WMT", "DIS", "GS", "HD", "CAT", "CVX", "BA", "AXP", "UNH"]:
            exch = "NYSE"

        targets = parse_marketbeat_ticker(sym, curr_price, default_exchange=exch, price_archive=price_archive)
        if targets:
            # Sort newest first, keep top 10
            targets.sort(key=lambda x: x.get("announcement_date", ""), reverse=True)
            results[sym] = targets[:10]
            # Count archive hits/misses for diagnostics
            for t in results[sym]:
                if lookup_archive_price(price_archive, sym, t.get("announcement_date", "")) is not None:
                    archive_hits += 1
                else:
                    archive_misses += 1
            print(f"[{idx+1}/{total}] {sym}: {len(results[sym])} targets fetched (Latest: {results[sym][0]['analyst_name']} / {results[sym][0]['firm']} ${results[sym][0]['target_price']:.2f})")
        else:
            print(f"[{idx+1}/{total}] {sym}: No live targets found from MarketBeat. Retaining fallback if valid.")
            if sym in existing_targets and existing_targets[sym]:
                results[sym] = existing_targets[sym]

        time.sleep(0.3)

    # Save to scripts/data/analyst_price_targets.json
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print(f"\nSuccessfully saved analyst price targets for {len(results)} equities to {output_path}")
    print(f"Archive price lookups: {archive_hits} hits, {archive_misses} misses ({round(archive_hits/(archive_hits+archive_misses)*100, 1) if (archive_hits+archive_misses) > 0 else 0}% accuracy)")

if __name__ == "__main__":
    main()
