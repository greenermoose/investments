"""
Fetch Market Closing Prices CLI Tool
Extracts authoritative closing prices as of the most recent trading day for all public equities in the universe.
"""

import argparse
import json
import os
import sys
import time
import urllib.request

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def load_universe_symbols():
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "http", "data")
    symbols = set()
    if os.path.exists(data_dir):
        for fname in os.listdir(data_dir):
            if fname.endswith(".json") and fname != "universe.json":
                symbols.add(fname.replace(".json", ""))
    return sorted(list(symbols))

def fetch_ticker_price(symbol):
    # Symbol transformations for Yahoo/exchanges
    query_sym = symbol.replace(".", "-")
    if query_sym == "BRK-B":
        query_sym = "BRK-B"
    
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{query_sym}?interval=1d&range=5d"
    req = urllib.request.Request(url, headers=HEADERS)
    
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        result = data.get("chart", {}).get("result", [])
        if not result:
            raise ValueError(f"No chart result returned for {symbol}")
        
        meta = result[0].get("meta", {})
        regular_price = meta.get("regularMarketPrice")
        chart_prev_close = meta.get("chartPreviousClose")
        prev_close = meta.get("previousClose", chart_prev_close)
        
        # Get indicators/quotes if available
        indicators = result[0].get("indicators", {}).get("quote", [{}])[0]
        closes = indicators.get("close", [])
        valid_closes = [c for c in closes if c is not None]
        
        last_close = valid_closes[-1] if valid_closes else regular_price
        close_price = regular_price if regular_price is not None else last_close
        
        return {
            "symbol": symbol,
            "closing_price": round(float(close_price), 2) if close_price else None,
            "previous_close": round(float(prev_close), 2) if prev_close else None,
            "currency": meta.get("currency", "USD"),
            "exchange": meta.get("exchangeName", ""),
            "market_time": meta.get("regularMarketTime")
        }

def main():
    parser = argparse.ArgumentParser(description="Fetch latest market closing prices for equity universe.")
    parser.add_argument("--symbols", nargs="+", help="Specific symbols to fetch (default: all universe)")
    args = parser.parse_args()

    symbols = args.symbols if args.symbols else load_universe_symbols()
    print(f"Fetching latest market closing prices for {len(symbols)} public equities...")
    
    out_dir = os.path.join(os.path.dirname(__file__), "data")
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "market_prices.json")
    
    prices_map = {}
    if os.path.exists(out_file):
        try:
            with open(out_file, "r", encoding="utf-8") as f:
                prices_map = json.load(f)
        except Exception:
            prices_map = {}

    success_count = 0
    fail_count = 0

    for i, sym in enumerate(symbols, 1):
        # Handle synthetic benchmark symbols
        if sym in ["XYZ", "BETA"]:
            prices_map[sym] = {
                "symbol": sym,
                "closing_price": 100.0,
                "previous_close": 98.5,
                "currency": "USD",
                "exchange": "INDEX",
                "market_time": int(time.time())
            }
            success_count += 1
            continue

        try:
            quote = fetch_ticker_price(sym)
            prices_map[sym] = quote
            success_count += 1
            print(f"[{i}/{len(symbols)}] {sym}: Close = ${quote['closing_price']:.2f}")
            time.sleep(0.08)  # Courteous delay
        except Exception as e:
            print(f"[{i}/{len(symbols)}] Warning: Could not fetch price for {sym}: {e}")
            # Keep previous if available, otherwise set default from company_meta
            if sym not in prices_map:
                prices_map[sym] = {
                    "symbol": sym,
                    "closing_price": None,
                    "previous_close": None,
                    "currency": "USD",
                    "exchange": "UNKNOWN",
                    "market_time": None
                }
            fail_count += 1

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(prices_map, f, indent=2)

    print(f"\nPrice ingestion finished: {success_count} succeeded, {fail_count} failed. Saved to {out_file}")

if __name__ == "__main__":
    main()
