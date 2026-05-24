import http.server
import socketserver
import urllib.request
import json
import ssl
import os
from urllib.parse import urlparse, parse_qs

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

Handler = ProxyHTTPRequestHandler

# Ensure we are in the root directory when serving
os.chdir(os.path.dirname(os.path.abspath(__file__)))

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving directory '{DIRECTORY}' at port {PORT}")
    httpd.serve_forever()
