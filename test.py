import urllib.request
import http.cookiejar

req = urllib.request.Request('https://fc.yahoo.com', headers={'User-Agent': 'Mozilla/5.0'})
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

try:
    opener.open(req)
except Exception:
    pass

print(list(cj))

try:
    crumb_req = urllib.request.Request('https://query1.finance.yahoo.com/v1/test/getcrumb', headers={'User-Agent': 'Mozilla/5.0'})
    crumb = opener.open(crumb_req).read().decode('utf-8')
    print("Crumb:", crumb)
    
    quote_req = urllib.request.Request(f'https://query1.finance.yahoo.com/v7/finance/quote?symbols=%5EIRX&crumb={crumb}', headers={'User-Agent': 'Mozilla/5.0'})
    quote = opener.open(quote_req).read().decode('utf-8')
    print("Quote length:", len(quote))
except Exception as e:
    print("Error:", e)
