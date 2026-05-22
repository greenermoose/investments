import json
import urllib.request

headers = {'User-Agent': 'InvestmentApp AdminContact@example.com'}
url = "https://data.sec.gov/api/xbrl/companyfacts/CIK0001375877.json"
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode('utf-8'))

forms = set()
for taxonomy in data['facts']:
    for tag in data['facts'][taxonomy]:
        for unit in data['facts'][taxonomy][tag].get('units', {}):
            for entry in data['facts'][taxonomy][tag]['units'][unit]:
                if 'form' in entry:
                    forms.add(entry['form'])

print("Forms for CSIQ:", forms)
