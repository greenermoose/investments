import json
import urllib.request

headers = {'User-Agent': 'InvestmentApp AdminContact@example.com'}
url = "https://data.sec.gov/api/xbrl/companyfacts/CIK0001375877.json"
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode('utf-8'))

print("us-gaap Revenue tags:")
for tag in data['facts'].get('us-gaap', {}):
    if 'Revenue' in tag or 'Sales' in tag:
        units = data['facts']['us-gaap'][tag]['units']
        unit_key = list(units.keys())[0]
        entries = units[unit_key]
        print(tag, "Count:", len(entries), "Latest:", entries[-1])
