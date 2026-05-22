import json
import urllib.request
import os
import time

headers = {
    'User-Agent': 'InvestmentApp AdminContact@example.com'
}

# Fetch CIKs
print("Fetching CIKs...")
req = urllib.request.Request('https://www.sec.gov/files/company_tickers.json', headers=headers)
with urllib.request.urlopen(req) as response:
    tickers_data = json.loads(response.read().decode('utf-8'))

ticker_to_cik = {}
for entry in tickers_data.values():
    ticker_to_cik[entry['ticker']] = str(entry['cik_str']).zfill(10)

symbols = [
    "ADBE", "AMD", "AVGO", "BAM", "BEAM", "BETA", "BRK-B", "CRM", "CRSP", "CSIQ", 
    "DIS", "EDIT", "ENPH", "ENVX", "EOSE", "GNRC", "GOOGL", "GWH", "JNJ", "JPM", 
    "KO", "MA", "META", "MSFT", "NFLX", "NRGV", "NTLA", "NVDA", "SBUX", "SEDG", 
    "SLDP", "STOK", "TDOC", "TMUS", "TSLA", "UNH", "WMT", "XYZ", "ZM"
]

out_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
os.makedirs(out_dir, exist_ok=True)

def extract_metric(facts, taxonomy, possible_tags, period_type='Q'):
    best_entries = []
    for tag in possible_tags:
        if taxonomy in facts and tag in facts[taxonomy]:
            units = facts[taxonomy][tag].get('units', {})
            # try to get the first unit (usually USD or shares)
            if not units: continue
            unit_key = list(units.keys())[0]
            entries = units[unit_key]
            
            # Sort by end date descending
            entries.sort(key=lambda x: x['end'], reverse=True)
            if not best_entries or (entries and entries[0]['end'] > best_entries[0]['end']):
                best_entries = entries
    return best_entries

for sym in symbols:
    lookup_sym = sym
    if lookup_sym not in ticker_to_cik and '-' in lookup_sym:
        alt_sym = lookup_sym.replace('-', '')
        if alt_sym in ticker_to_cik:
            lookup_sym = alt_sym
    
    if lookup_sym not in ticker_to_cik:
        print(f"CIK not found for {sym}")
        continue
        
    cik = ticker_to_cik[lookup_sym]
    url = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"
    req = urllib.request.Request(url, headers=headers)
    
    try:
        time.sleep(0.5) # SEC rate limit is 10 requests/sec
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            facts = data.get('facts', {})
            
            # We'll just extract the most recent valid quarter for simplicity in this script
            # Shares
            shares = extract_metric(facts, 'dei', ['EntityCommonStockSharesOutstanding'])
            if not shares:
                shares = extract_metric(facts, 'us-gaap', ['CommonStockSharesOutstanding', 'WeightedAverageNumberOfSharesOutstandingBasic', 'WeightedAverageNumberOfDilutedSharesOutstanding'])
                
            # Revenue
            revenue = extract_metric(facts, 'us-gaap', ['Revenues', 'SalesRevenueNet', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'RevenueFromContractWithCustomerIncludingAssessedTax', 'RevenuesNetOfYearc'])
            
            # Assets
            assets = extract_metric(facts, 'us-gaap', ['Assets'])
            
            # Liabilities
            liabilities = extract_metric(facts, 'us-gaap', ['Liabilities'])
            
            # Equity
            equity = extract_metric(facts, 'us-gaap', ['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'])
            
            # Grab latest 4 filings based on assets date
            valid_dates = []
            for a in assets:
                if 'form' in a and a['form'] in ['10-Q', '10-K', '20-F', '40-F'] and a['end'] not in [d['end'] for d in valid_dates]:
                    valid_dates.append({'end': a['end'], 'form': a['form'], 'fy': a.get('fy'), 'fp': a.get('fp'), 'filed': a.get('filed', a['end'])})
                if len(valid_dates) >= 4:
                    break
                    
            filings = []
            for d in valid_dates:
                end_date = d['end']
                filed_date = d.get('filed', end_date)
                
                s_val = next((x['val'] for x in shares if x['end'] <= end_date), 0) if shares else 0
                r_entry = next((x for x in revenue if x['end'] == end_date), None) if revenue else None
                r_val = r_entry['val'] if r_entry else 0
                period_start = r_entry.get('start', end_date) if r_entry else end_date

                a_val = next((x['val'] for x in assets if x['end'] == end_date), 0) if assets else 0
                l_val = next((x['val'] for x in liabilities if x['end'] == end_date), 0) if liabilities else 0
                e_val = next((x['val'] for x in equity if x['end'] == end_date), 0) if equity else 0
                
                filings.append({
                    "type": d['form'],
                    "filing_date": filed_date,
                    "period_start": period_start,
                    "period_end": end_date,
                    "filing_url": f"https://www.sec.gov/edgar/browse/?CIK={cik}",
                    "data": {
                        "shares_outstanding": s_val,
                        "revenue": r_val,
                        "balance_sheet": {
                            "total_assets": a_val,
                            "total_liabilities": l_val,
                            "total_shareholders_equity": e_val
                        }
                    }
                })
                
            out_obj = {
                "symbol": sym,
                "sec_edgar_url": f"https://www.sec.gov/edgar/browse/?CIK={cik}",
                "filings": filings
            }
            
            out_file = os.path.join(out_dir, f"{sym}.json")
            with open(out_file, 'w') as f:
                json.dump(out_obj, f, indent=2)
            print(f"Saved {sym}.json")
            
    except Exception as e:
        print(f"Error fetching {sym}: {e}")
        
print("Done!")
