import http.server
import socketserver
import urllib.request
import json
import ssl
import os
from urllib.parse import urlparse, parse_qs
import http.cookiejar

# Global variables for yfinance auth
yf_cookie_jar = http.cookiejar.CookieJar()
yf_crumb = None

def get_yfinance_auth():
    global yf_crumb
    if yf_crumb is None:
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(yf_cookie_jar))
        req = urllib.request.Request('https://fc.yahoo.com', headers={'User-Agent': 'Mozilla/5.0'})
        try:
            opener.open(req)
        except Exception:
            pass
        
        crumb_req = urllib.request.Request('https://query1.finance.yahoo.com/v1/test/getcrumb', headers={'User-Agent': 'Mozilla/5.0'})
        try:
            yf_crumb = opener.open(crumb_req).read().decode('utf-8')
        except Exception as e:
            print("Error fetching crumb:", e)
    return yf_crumb, yf_cookie_jar

PORT = 8080
# Serve the 'http' directory, not the directory where the script is located
DIRECTORY = "http"

class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/api/sec/data':
            self.handle_sec_request(parsed_path)
        elif parsed_path.path.startswith('/api/yfinance/'):
            self.handle_yfinance_request(parsed_path)
        else:
            super().do_GET()

    def handle_sec_request(self, parsed_path):
        query_params = parse_qs(parsed_path.query)
        ticker = query_params.get('ticker', [None])[0]
        
        if not ticker:
            self.send_error(400, "Missing ticker parameter")
            return
            
        ticker = ticker.upper()
        
        # 1. Fetch CIK from ticker
        try:
            req = urllib.request.Request(
                'https://www.sec.gov/files/company_tickers.json',
                headers={'User-Agent': 'InvestmentApp AdminContact@investmentapp.com'}
            )
            context = ssl.create_default_context()
            with urllib.request.urlopen(req, context=context) as response:
                tickers_data = json.loads(response.read().decode())
                
            cik = None
            for key, value in tickers_data.items():
                if value['ticker'] == ticker:
                    cik = str(value['cik_str']).zfill(10)
                    break
                    
            if not cik:
                self.send_error(404, f"Ticker {ticker} not found in SEC database")
                return
                
        except Exception as e:
            self.send_error(500, f"Error fetching SEC ticker mapping: {str(e)}")
            return

        # 2. Fetch company facts from SEC EDGAR
        try:
            facts_url = f'https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json'
            req = urllib.request.Request(
                facts_url,
                headers={'User-Agent': 'InvestmentApp AdminContact@investmentapp.com'}
            )
            with urllib.request.urlopen(req, context=context) as response:
                facts_data = json.loads(response.read().decode())
                
            # Send the JSON back to the client
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(facts_data).encode())
            
        except urllib.error.HTTPError as e:
            self.send_error(e.code, f"SEC API Error: {e.reason}")
        except Exception as e:
            self.send_error(500, f"Error fetching SEC facts: {str(e)}")

    def handle_yfinance_request(self, parsed_path):
        query_params = parse_qs(parsed_path.query)
        ticker = query_params.get('ticker', [None])[0]
        
        if not ticker:
            self.send_error(400, "Missing ticker parameter")
            return
            
        ticker = ticker.upper()
        
        path = parsed_path.path
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json'
        }
        
        crumb, cookie_jar = get_yfinance_auth()
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))

        if path == '/api/yfinance/quote':
            # Yahoo uses url encoded ticker, so ^IRX becomes %5EIRX but urllib handles it if we don't encode, wait.
            # Actually we should import quote from urllib.parse
            from urllib.parse import quote
            ticker_encoded = quote(ticker)
            url = f"https://query1.finance.yahoo.com/v7/finance/quote?symbols={ticker_encoded}&crumb={crumb}"
        elif path == '/api/yfinance/history':
            from urllib.parse import quote
            ticker_encoded = quote(ticker)
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker_encoded}?range=2y&interval=1d&crumb={crumb}"
        elif path == '/api/yfinance/options':
            from urllib.parse import quote
            ticker_encoded = quote(ticker)
            url = f"https://query1.finance.yahoo.com/v7/finance/options/{ticker_encoded}?crumb={crumb}"
        else:
            self.send_error(404, "Unknown yfinance endpoint")
            return
            
        try:
            req = urllib.request.Request(url, headers=headers)
            with opener.open(req) as response:
                data = response.read()
                
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)
            
        except urllib.error.HTTPError as e:
            self.send_error(e.code, f"YFinance API Error: {e.reason}")
        except Exception as e:
            self.send_error(500, f"Error fetching YFinance data: {str(e)}")

Handler = ProxyHTTPRequestHandler

# Ensure we are in the root directory when serving
os.chdir(os.path.dirname(os.path.abspath(__file__)))

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving directory '{DIRECTORY}' at port {PORT}")
    httpd.serve_forever()
