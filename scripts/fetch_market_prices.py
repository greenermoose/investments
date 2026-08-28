"""
Fetch Market Prices & Technical Volume CLI Tool
Extracts verified market share prices, daily trading volumes, dual nominal and
split/dividend-adjusted historical OHLCV candlestick time-series, corporate action events,
52-week price ranges, and technical analysis indicators (SMA 20, SMA 50, Volume Ratio, Support/Resistance)
for all public equities in the universe.
"""

import argparse
from datetime import datetime, timezone
import json
import os
import sys
import time
import urllib.request

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

SYSTEM_DATASET_FILES = {
    "universe.json", "market_prices.json", "historical_price_archive.json",
    "analyst_coverage_registry.json", "sec_filing_calendar.json",
    "sentiment_surveillance.json", "short_seller_campaigns.json"
}


def load_universe_symbols():
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "http", "data")
    symbols = set()
    if os.path.exists(data_dir):
        for fname in os.listdir(data_dir):
            if fname.endswith(".json") and fname not in SYSTEM_DATASET_FILES:
                symbols.add(fname.replace(".json", ""))
    return sorted(list(symbols))


def parse_corporate_actions(events_dict):
    """Extract and sort split and dividend events from Yahoo chart API response."""
    splits_raw = events_dict.get("splits", {}) if events_dict else {}
    dividends_raw = events_dict.get("dividends", {}) if events_dict else {}

    split_events = []
    for k, v in splits_raw.items():
        s_date_ts = int(v.get("date", k))
        num = float(v.get("numerator", 1.0))
        den = float(v.get("denominator", 1.0))
        ratio_str = v.get("splitRatio", f"{int(num)}:{int(den)}")
        dt_str = datetime.fromtimestamp(s_date_ts, tz=timezone.utc).strftime("%Y-%m-%d")
        split_events.append({
            "timestamp": s_date_ts,
            "date": dt_str,
            "numerator": num,
            "denominator": den,
            "ratio": ratio_str
        })
    split_events.sort(key=lambda x: x["date"])

    dividend_events = []
    dividend_map = {}
    for k, v in dividends_raw.items():
        d_date_ts = int(v.get("date", k))
        amount = round(float(v.get("amount", 0.0)), 4)
        dt_str = datetime.fromtimestamp(d_date_ts, tz=timezone.utc).strftime("%Y-%m-%d")
        dividend_events.append({
            "timestamp": d_date_ts,
            "date": dt_str,
            "amount": amount
        })
        dividend_map[dt_str] = amount
    dividend_events.sort(key=lambda x: x["date"])

    return split_events, dividend_events, dividend_map


def calculate_cumulative_split_multiplier(candle_date_str, split_events):
    """
    Computes the cumulative forward/reverse split multiplier at a given historical candle date.
    Any split with split_date > candle_date means the split had not yet occurred at candle_date,
    so nominal price = split_adjusted_price * (numerator / denominator).
    """
    multiplier = 1.0
    for s in split_events:
        if s["date"] > candle_date_str:
            multiplier *= (s["numerator"] / s["denominator"])
    return multiplier


def fetch_ticker_quote_and_technicals(symbol):
    query_sym = symbol.replace(".", "-")
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{query_sym}?interval=1d&range=3mo&events=div%7Csplit"
    req = urllib.request.Request(url, headers=HEADERS)

    with urllib.request.urlopen(req, timeout=12) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        result = data.get("chart", {}).get("result", [])
        if not result:
            raise ValueError(f"No chart result returned for {symbol}")

        meta = result[0].get("meta", {})
        regular_price = meta.get("regularMarketPrice")
        chart_prev_close = meta.get("chartPreviousClose")
        prev_close = meta.get("previousClose", chart_prev_close)

        events_dict = result[0].get("events", {})
        split_events, dividend_events, dividend_map = parse_corporate_actions(events_dict)
        split_date_map = {s["date"]: s for s in split_events}

        timestamps = result[0].get("timestamp", [])
        indicators = result[0].get("indicators", {})
        quote_indicators = indicators.get("quote", [{}])[0]
        adjclose_list = indicators.get("adjclose", [{}])[0].get("adjclose", [])

        opens = quote_indicators.get("open", [])
        highs = quote_indicators.get("high", [])
        lows = quote_indicators.get("low", [])
        closes = quote_indicators.get("close", [])
        volumes = quote_indicators.get("volume", [])

        # Build dual nominal and split/dividend-adjusted historical daily candles
        candles = []
        for i in range(len(timestamps)):
            ts = timestamps[i]
            o = opens[i] if i < len(opens) else None
            h = highs[i] if i < len(highs) else None
            l = lows[i] if i < len(lows) else None
            c = closes[i] if i < len(closes) else None
            v = volumes[i] if i < len(volumes) else None
            adj_c_raw = adjclose_list[i] if (i < len(adjclose_list) and adjclose_list[i] is not None) else c

            if c is not None and ts is not None:
                dt_str = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")
                split_multiplier = calculate_cumulative_split_multiplier(dt_str, split_events)

                split_adj_open = round(float(o), 2) if o is not None else round(float(c), 2)
                split_adj_high = round(float(h), 2) if h is not None else round(float(c), 2)
                split_adj_low = round(float(l), 2) if l is not None else round(float(c), 2)
                split_adj_close = round(float(c), 2)
                split_adj_volume = int(v) if v is not None else 0

                nominal_open = round(split_adj_open * split_multiplier, 2)
                nominal_high = round(split_adj_high * split_multiplier, 2)
                nominal_low = round(split_adj_low * split_multiplier, 2)
                nominal_close = round(split_adj_close * split_multiplier, 2)
                nominal_volume = int(round(split_adj_volume / split_multiplier)) if split_multiplier > 0 else split_adj_volume

                adj_close = round(float(adj_c_raw), 2) if adj_c_raw is not None else split_adj_close

                split_info = split_date_map.get(dt_str)
                div_amount = dividend_map.get(dt_str)

                candles.append({
                    "date": dt_str,
                    "nominal_open": nominal_open,
                    "nominal_high": nominal_high,
                    "nominal_low": nominal_low,
                    "nominal_close": nominal_close,
                    "nominal_volume": nominal_volume,
                    "split_adj_open": split_adj_open,
                    "split_adj_high": split_adj_high,
                    "split_adj_low": split_adj_low,
                    "split_adj_close": split_adj_close,
                    "adj_close": adj_close,
                    # Backwards compatibility aliases
                    "open": split_adj_open,
                    "high": split_adj_high,
                    "low": split_adj_low,
                    "close": split_adj_close,
                    "volume": split_adj_volume,
                    "split_factor": round(split_multiplier, 4),
                    "split_ratio": split_info["ratio"] if split_info else None,
                    "dividend_amount": div_amount
                })

        valid_split_closes = [c["split_adj_close"] for c in candles]
        valid_volumes = [c["volume"] for c in candles if c["volume"] > 0]
        valid_highs = [c["split_adj_high"] for c in candles]
        valid_lows = [c["split_adj_low"] for c in candles]

        last_close = valid_split_closes[-1] if valid_split_closes else regular_price
        current_price = regular_price if regular_price is not None else last_close
        if current_price is not None:
            current_price = round(float(current_price), 2)

        if prev_close is None and len(valid_split_closes) >= 2:
            prev_close = valid_split_closes[-2]
        if prev_close is not None:
            prev_close = round(float(prev_close), 2)
        else:
            prev_close = current_price

        # Nominal previous close for session-over-session change (broker-observable)
        if len(candles) >= 2:
            nom_prev_close = round(float(candles[-2].get("nominal_close", prev_close)), 2)
        else:
            nom_prev_close = round(float(meta.get("previousClose", chart_prev_close or prev_close)), 2)

        # Day change uses nominal prices so previous_close aligns with nominal_current_price
        nominal_current = current_price
        day_change = round(nominal_current - nom_prev_close, 2) if (nominal_current and nom_prev_close) else 0.0
        day_change_percent = round((day_change / nom_prev_close) * 100.0, 2) if nom_prev_close else 0.0

        # Latest session metrics
        latest_candle = candles[-1] if candles else {}
        day_open = latest_candle.get("split_adj_open", current_price)
        day_high = meta.get("regularMarketDayHigh", latest_candle.get("split_adj_high", current_price))
        day_low = meta.get("regularMarketDayLow", latest_candle.get("split_adj_low", current_price))
        day_volume = meta.get("regularMarketVolume", latest_candle.get("volume", 0))

        # Technical Analysis Indicators (computed on split-adjusted continuous series)
        # 1. 20-Day SMA
        closes_20d = valid_split_closes[-20:] if len(valid_split_closes) >= 20 else valid_split_closes
        sma_20 = round(sum(closes_20d) / len(closes_20d), 2) if closes_20d else current_price

        # 2. 50-Day SMA
        closes_50d = valid_split_closes[-50:] if len(valid_split_closes) >= 50 else valid_split_closes
        sma_50 = round(sum(closes_50d) / len(closes_50d), 2) if closes_50d else sma_20

        # 3. 20-Day Average Volume & Volume Breakout Ratio
        volumes_20d = [c["volume"] for c in candles[-20:] if c["volume"] > 0]
        avg_vol_20d = int(sum(volumes_20d) / len(volumes_20d)) if volumes_20d else int(day_volume)
        volume_ratio = round(day_volume / avg_vol_20d, 2) if avg_vol_20d > 0 else 1.0

        # 4. 20-Day Support & Resistance
        lows_20d = valid_lows[-20:] if len(valid_lows) >= 20 else valid_lows
        highs_20d = valid_highs[-20:] if len(valid_highs) >= 20 else valid_highs
        tech_support_20d = round(min(lows_20d), 2) if lows_20d else current_price
        tech_resistance_20d = round(max(highs_20d), 2) if highs_20d else current_price

        # 52-Week Range
        fifty_two_week_high = meta.get("fiftyTwoWeekHigh")
        if fifty_two_week_high is not None:
            fifty_two_week_high = round(float(fifty_two_week_high), 2)
        else:
            fifty_two_week_high = round(max(valid_highs), 2) if valid_highs else current_price

        fifty_two_week_low = meta.get("fiftyTwoWeekLow")
        if fifty_two_week_low is not None:
            fifty_two_week_low = round(float(fifty_two_week_low), 2)
        else:
            fifty_two_week_low = round(min(valid_lows), 2) if valid_lows else current_price

        earliest_split_factor = candles[-1].get("split_factor", 1.0) if candles else 1.0
        latest_adj_close = candles[-1].get("adj_close", current_price) if candles else current_price

        return {
            "symbol": symbol,
            "name": meta.get("longName") or meta.get("shortName") or f"{symbol} Corporation",
            "currency": meta.get("currency", "USD"),
            "exchange": meta.get("exchangeName", "US"),
            "current_price": current_price,
            "nominal_current_price": current_price,
            "closing_price": current_price,
            "previous_close": nom_prev_close,
            "nominal_previous_close": nom_prev_close,
            "split_adj_previous_close": prev_close,
            "adj_close": latest_adj_close,
            "day_change": day_change,
            "day_change_percent": day_change_percent,
            "day_open": round(float(day_open), 2) if day_open is not None else current_price,
            "day_high": round(float(day_high), 2) if day_high is not None else current_price,
            "day_low": round(float(day_low), 2) if day_low is not None else current_price,
            "day_volume": int(day_volume) if day_volume is not None else 0,
            "average_volume_20d": avg_vol_20d,
            "volume_ratio": volume_ratio,
            "fifty_two_week_high": fifty_two_week_high,
            "fifty_two_week_low": fifty_two_week_low,
            "sma_20": sma_20,
            "sma_50": sma_50,
            "technical_support_20d": tech_support_20d,
            "technical_resistance_20d": tech_resistance_20d,
            "cumulative_split_factor": earliest_split_factor,
            "recent_splits": [
                {
                    "date": s["date"],
                    "ratio": s["ratio"],
                    "numerator": s["numerator"],
                    "denominator": s["denominator"]
                }
                for s in split_events
            ],
            "recent_dividends": [
                {
                    "date": d["date"],
                    "amount": d["amount"]
                }
                for d in dividend_events
            ],
            "historical_candles_30d": candles[-30:],
            "as_of_timestamp": datetime.now(timezone.utc).isoformat(),
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "provenance_tier": "TIER_2_FINANCIAL_AGGREGATOR",
            "provenance_source": "Direct Exchange / Yahoo Finance Chart API"
        }


def fetch_historical_archive_data(symbol, range_str="18mo"):
    """Fetch extended historical daily closes with dual nominal and split/dividend adjustments.

    Returns a structured payload containing:
    - daily_nominal_closes: {YYYY-MM-DD: nominal_price}
    - daily_split_adjusted_closes: {YYYY-MM-DD: split_adjusted_price}
    - daily_adjusted_closes: {YYYY-MM-DD: dividend_adjusted_price}
    - daily_closes: {YYYY-MM-DD: split_adjusted_price} (backward compatibility alias)
    - splits: list of corporate split events
    - dividends: list of cash dividend payments
    """
    query_sym = symbol.replace(".", "-")
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{query_sym}?interval=1d&range={range_str}&events=div%7Csplit"
    req = urllib.request.Request(url, headers=HEADERS)

    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        result = data.get("chart", {}).get("result", [])
        if not result:
            raise ValueError(f"No chart result returned for {symbol}")

        events_dict = result[0].get("events", {})
        split_events, dividend_events, _ = parse_corporate_actions(events_dict)

        timestamps = result[0].get("timestamp", [])
        indicators = result[0].get("indicators", {})
        quote_indicators = indicators.get("quote", [{}])[0]
        adjclose_list = indicators.get("adjclose", [{}])[0].get("adjclose", [])
        closes = quote_indicators.get("close", [])

        daily_nominal_closes = {}
        daily_split_adjusted_closes = {}
        daily_adjusted_closes = {}
        daily_closes = {}

        for i in range(len(timestamps)):
            ts = timestamps[i]
            c = closes[i] if i < len(closes) else None
            adj_c_raw = adjclose_list[i] if (i < len(adjclose_list) and adjclose_list[i] is not None) else c

            if c is not None and ts is not None:
                dt_str = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")
                split_mult = calculate_cumulative_split_multiplier(dt_str, split_events)

                split_adj_c = round(float(c), 2)
                nom_c = round(split_adj_c * split_mult, 2)
                adj_c = round(float(adj_c_raw), 2) if adj_c_raw is not None else split_adj_c

                daily_nominal_closes[dt_str] = nom_c
                daily_split_adjusted_closes[dt_str] = split_adj_c
                daily_adjusted_closes[dt_str] = adj_c
                daily_closes[dt_str] = split_adj_c

        return {
            "daily_nominal_closes": daily_nominal_closes,
            "daily_split_adjusted_closes": daily_split_adjusted_closes,
            "daily_adjusted_closes": daily_adjusted_closes,
            "daily_closes": daily_closes,
            "splits": [
                {
                    "date": s["date"],
                    "ratio": s["ratio"],
                    "numerator": s["numerator"],
                    "denominator": s["denominator"]
                }
                for s in split_events
            ],
            "dividends": [
                {
                    "date": d["date"],
                    "amount": d["amount"]
                }
                for d in dividend_events
            ]
        }


def run_archive_mode(symbols):
    """Build/update persistent historical price archive with dual nominal and adjusted daily closes."""
    scripts_data_dir = os.path.join(os.path.dirname(__file__), "data")
    http_data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "http", "data")
    context_data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "context", "data")
    os.makedirs(scripts_data_dir, exist_ok=True)
    os.makedirs(http_data_dir, exist_ok=True)
    os.makedirs(context_data_dir, exist_ok=True)

    archive_file = os.path.join(scripts_data_dir, "historical_price_archive.json")

    # Load existing archive to merge with
    archive = {}
    if os.path.exists(archive_file):
        try:
            with open(archive_file, "r", encoding="utf-8") as f:
                archive = json.load(f)
        except Exception:
            archive = {}

    print(f"Building dual nominal/adjusted historical price archive (18mo) for {len(symbols)} equities...")
    success_count = 0
    fail_count = 0

    for i, sym in enumerate(symbols, 1):
        try:
            new_data = fetch_historical_archive_data(sym, range_str="18mo")
            if not new_data or not new_data.get("daily_closes"):
                print(f"[{i}/{len(symbols)}] {sym}: No historical data returned.")
                fail_count += 1
                continue

            existing_entry = archive.get(sym, {})
            existing_nom = existing_entry.get("daily_nominal_closes", {})
            existing_split_adj = existing_entry.get("daily_split_adjusted_closes", {})
            existing_adj = existing_entry.get("daily_adjusted_closes", {})
            existing_closes = existing_entry.get("daily_closes", {})

            # Merge daily maps
            existing_nom.update(new_data["daily_nominal_closes"])
            existing_split_adj.update(new_data["daily_split_adjusted_closes"])
            existing_adj.update(new_data["daily_adjusted_closes"])
            existing_closes.update(new_data["daily_closes"])

            # Merge corporate actions
            existing_splits = {s["date"]: s for s in existing_entry.get("splits", [])}
            for s in new_data["splits"]:
                existing_splits[s["date"]] = s
            merged_splits = sorted(list(existing_splits.values()), key=lambda x: x["date"])

            existing_divs = {d["date"]: d for d in existing_entry.get("dividends", [])}
            for d in new_data["dividends"]:
                existing_divs[d["date"]] = d
            merged_divs = sorted(list(existing_divs.values()), key=lambda x: x["date"])

            sorted_dates = sorted(existing_closes.keys())
            archive[sym] = {
                "symbol": sym,
                "daily_nominal_closes": existing_nom,
                "daily_split_adjusted_closes": existing_split_adj,
                "daily_adjusted_closes": existing_adj,
                "daily_closes": existing_closes,
                "splits": merged_splits,
                "dividends": merged_divs,
                "first_date": sorted_dates[0] if sorted_dates else "",
                "last_date": sorted_dates[-1] if sorted_dates else "",
                "total_trading_days": len(existing_closes),
                "as_of_timestamp": datetime.now(timezone.utc).isoformat(),
                "provenance_tier": "TIER_2_FINANCIAL_AGGREGATOR",
                "provenance_source": "Yahoo Finance Chart API (18mo historical dual nominal/adjusted)"
            }

            success_count += 1
            print(f"[{i}/{len(symbols)}] {sym:5s}: {len(new_data['daily_closes'])} candles fetched, {len(existing_closes)} total archived [{sorted_dates[0]} to {sorted_dates[-1]}] (Splits: {len(merged_splits)}, Divs: {len(merged_divs)})")
            time.sleep(0.08)
        except Exception as e:
            print(f"[{i}/{len(symbols)}] Warning: Could not fetch archive for {sym}: {e}")
            fail_count += 1

    # Save archive to all three locations
    for out_path in [
        archive_file,
        os.path.join(http_data_dir, "historical_price_archive.json"),
        os.path.join(context_data_dir, "historical_price_archive.json"),
    ]:
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(archive, f, indent=2)

    print(f"\nHistorical price archive complete: {success_count} succeeded, {fail_count} failed.")
    print(f"Archive contains {len(archive)} equities. Saved to {archive_file} (and http/data/, context/data/).")


def main():
    parser = argparse.ArgumentParser(description="Fetch latest market prices, volumes, and technical indicators.")
    parser.add_argument("--symbols", nargs="+", help="Specific symbols to fetch (default: all universe)")
    parser.add_argument("--offline", action="store_true", help="Offline mode: use local cached prices without making remote HTTP calls")
    parser.add_argument("--live", action="store_true", help="Live mode: fetch fresh quotes from exchange APIs (default)")
    parser.add_argument("--archive", action="store_true",
                        help="Build/update historical price archive (18 months of dual nominal/adjusted daily closes).")
    args = parser.parse_args()

    symbols = args.symbols if args.symbols else load_universe_symbols()
    offline_mode = args.offline and not args.live

    scripts_data_dir = os.path.join(os.path.dirname(__file__), "data")
    http_data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "http", "data")
    context_data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "context", "data")
    os.makedirs(scripts_data_dir, exist_ok=True)
    os.makedirs(http_data_dir, exist_ok=True)
    os.makedirs(context_data_dir, exist_ok=True)

    out_file_scripts = os.path.join(scripts_data_dir, "market_prices.json")
    out_file_http = os.path.join(http_data_dir, "market_prices.json")
    out_file_context = os.path.join(context_data_dir, "market_prices.json")

    # Archive mode: build persistent historical daily close archive
    if args.archive:
        run_archive_mode(symbols)
        return

    if offline_mode:
        print(f"Offline Mode: Verifying cached market prices for {len(symbols)} public equities...")
        prices_map = {}
        if os.path.exists(out_file_scripts):
            try:
                with open(out_file_scripts, "r", encoding="utf-8") as f:
                    prices_map = json.load(f)
            except Exception:
                prices_map = {}

        success_count = 0
        missing_count = 0
        for i, sym in enumerate(symbols, 1):
            if sym in prices_map:
                record = prices_map[sym]
                print(f"[{i}/{len(symbols)}] Cached {sym:5s}: Price = ${record.get('current_price', 0.0):7.2f} | 52W: [${record.get('fifty_two_week_low', 0.0):.2f} - ${record.get('fifty_two_week_high', 0.0):.2f}] | Adj Close = ${record.get('adj_close', 0.0):.2f}")
                success_count += 1
            else:
                print(f"[{i}/{len(symbols)}] Warning: No cached price found for {sym}")
                missing_count += 1

        print(f"\nOffline Price Verification Complete: {success_count} verified, {missing_count} missing, total {len(symbols)}.")
        return

    print(f"Ingesting live market prices & dual nominal/adjusted technical data for {len(symbols)} public equities...")

    prices_map = {}
    if os.path.exists(out_file_scripts):
        try:
            with open(out_file_scripts, "r", encoding="utf-8") as f:
                prices_map = json.load(f)
        except Exception:
            prices_map = {}

    success_count = 0
    fail_count = 0

    for i, sym in enumerate(symbols, 1):
        try:
            record = fetch_ticker_quote_and_technicals(sym)
            prices_map[sym] = record
            success_count += 1
            splits_count = len(record.get("recent_splits", []))
            divs_count = len(record.get("recent_dividends", []))
            split_info = f" | Splits={splits_count}" if splits_count else ""
            div_info = f" | Divs={divs_count}" if divs_count else ""
            print(f"[{i}/{len(symbols)}] {sym:5s}: Spot = ${record['current_price']:7.2f} | Adj = ${record['adj_close']:7.2f} | 52W: [${record['fifty_two_week_low']:.2f} - ${record['fifty_two_week_high']:.2f}] | Vol = {record['day_volume']:,}{split_info}{div_info}")
            time.sleep(0.08)  # Rate limiting delay
        except Exception as e:
            print(f"[{i}/{len(symbols)}] Warning: Could not fetch price for {sym}: {e}")
            fail_count += 1

    # Save to scripts/data/, http/data/, and context/data/
    with open(out_file_scripts, "w", encoding="utf-8") as f:
        json.dump(prices_map, f, indent=2)

    with open(out_file_http, "w", encoding="utf-8") as f:
        json.dump(prices_map, f, indent=2)

    with open(out_file_context, "w", encoding="utf-8") as f:
        json.dump(prices_map, f, indent=2)

    print(f"\nLive price & volume ingestion complete: {success_count} succeeded, {fail_count} failed.")
    print(f"Saved records to {out_file_scripts}, {out_file_http}, and {out_file_context}")


if __name__ == "__main__":
    main()
