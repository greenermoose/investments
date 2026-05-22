import json
import urllib.request

headers = {'User-Agent': 'InvestmentApp AdminContact@example.com'}
url = "https://data.sec.gov/api/xbrl/companyfacts/CIK0000002488.json"
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode('utf-8'))
    
    rev_tags = ['Revenues', 'SalesRevenueNet', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'RevenuesNetOfYearc']
    for tag in rev_tags:
        if tag in data['facts']['us-gaap']:
            units = data['facts']['us-gaap'][tag]['units']
            unit_key = list(units.keys())[0]
            print(f"AMD Revenue ({tag}): {units[unit_key][-1]}")
            
    print("All tags:")
    for tag in data['facts']['us-gaap']:
        if 'Revenue' in tag or 'Sales' in tag:
            print(tag)
