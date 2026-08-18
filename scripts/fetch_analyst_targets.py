"""
Wall Street Analyst Price Targets & Coverage Fetcher
Fetches and ground-truths sell-side analyst research targets and forecasts from MarketBeat
for all 144 constituents in the tracked investment universe.
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

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def clean_text(text):
    text = re.sub(r'<[^>]+>', ' ', text)
    text = html.unescape(text)
    text = re.sub(r'\d+\s+of\s+\d+\s+stars', '', text)
    text = text.split("Subscribe to")[0].strip()
    text = ' '.join(text.split())
    return text

def parse_marketbeat_ticker(sym, curr_price, default_exchange="NASDAQ"):
    exchanges = [default_exchange, "NYSE" if default_exchange == "NASDAQ" else "NASDAQ"]
    all_targets = []
    final_url = ""

    for exch in exchanges:
        url = f"https://www.marketbeat.com/stocks/{exch}/{sym.upper()}/forecast/"
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=12) as resp:
                content = resp.read().decode("utf-8", errors="ignore")
                final_url = resp.geturl()
        except Exception as e:
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

            if upside_raw is None:
                upside_raw = round(((target_price - curr_price) / curr_price) * 100.0, 1)

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

            report_title = f"{brokerage}: {action or rating or 'Price Target'} ${target_price:.2f}"

            all_targets.append({
                "symbol": sym,
                "analyst_name": analyst,
                "firm": brokerage,
                "announcement_date": parsed_date,
                "market_price_at_announcement": round(curr_price, 2),
                "target_price": target_price,
                "implied_upside_pct": upside_raw,
                "rating_action": std_action,
                "report_title": report_title,
                "source_url": final_url or url,
                "data_tier": "TIER_2_FINANCIAL_AGGREGATOR"
            })

        if all_targets:
            break

    return all_targets

def main():
    universe_file = os.path.join(http_data_dir, "universe.json")
    prices_file = os.path.join(http_data_dir, "market_prices.json")

    with open(universe_file, "r", encoding="utf-8") as f:
        universe = json.load(f)

    market_prices = {}
    if os.path.exists(prices_file):
        with open(prices_file, "r", encoding="utf-8") as f:
            market_prices = json.load(f)

    output_path = os.path.join(data_dir, "analyst_price_targets.json")
    
    # Load existing if available
    existing_targets = {}
    if os.path.exists(output_path):
        with open(output_path, "r", encoding="utf-8") as f:
            existing_targets = json.load(f)

    results = {}
    total = len(universe)

    print(f"Fetching Wall Street Analyst Price Targets for {total} universe equities...")
    for idx, u in enumerate(universe):
        sym = u["symbol"]
        curr_price = market_prices.get(sym, {}).get("current_price") or u.get("current_price", 100.0)
        
        # Determine exchange
        exch = "NASDAQ"
        indices = u.get("indices", [])
        if "DJIA" in indices and sym in ["IBM", "JNJ", "JPM", "KO", "MCD", "MMM", "NKE", "PG", "TRV", "VZ", "WMT", "DIS", "GS", "HD", "CAT", "CVX", "BA", "AXP", "UNH"]:
            exch = "NYSE"

        targets = parse_marketbeat_ticker(sym, curr_price, default_exchange=exch)
        if targets:
            # Sort newest first, keep top 10
            targets.sort(key=lambda x: x.get("announcement_date", ""), reverse=True)
            results[sym] = targets[:10]
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

if __name__ == "__main__":
    main()
