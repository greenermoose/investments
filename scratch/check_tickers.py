import json
import urllib.request

headers = {'User-Agent': 'InvestmentApp AdminContact@example.com'}
req = urllib.request.Request('https://www.sec.gov/files/company_tickers.json', headers=headers)
with urllib.request.urlopen(req) as response:
    tickers_data = json.loads(response.read().decode('utf-8'))
    
for entry in tickers_data.values():
    if 'BRK' in entry['ticker'] or 'CSIQ' in entry['ticker']:
        print(f"Ticker: {entry['ticker']}, Title: {entry['title']}, CIK: {entry['cik_str']}")
