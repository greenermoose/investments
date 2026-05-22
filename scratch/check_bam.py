import json
import urllib.request

headers = {'User-Agent': 'InvestmentApp AdminContact@example.com'}
url = "https://data.sec.gov/api/xbrl/companyfacts/CIK0001937926.json"
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode('utf-8'))

for tag in data['facts'].get('dei', {}):
    print('dei', tag)
