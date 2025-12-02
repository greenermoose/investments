// Mock data for testing

/**
 * Sample CSV file content for testing
 */
export const sampleCSVContent = `"Positions for account Roth Contributory IRA ...348 as of 06:40 PM ET, 2025/04/27"
""
"Symbol","Description","Qty (Quantity)","Price","Price Chng $ (Price Change $)","Price Chng % (Price Change %)","Mkt Val (Market Value)","Gain $ (Gain/Loss $)","Gain % (Gain/Loss %)","% of Acct (% of Account)","Day Chng $ (Day Change $)","Day Chng % (Day Change %)","Reinvest?"
"AAPL","APPLE INC","4.1569","$209.28","$0.91","0.44%","$869.96","$150.00","20.85%","8.5%","$3.78","0.44%","Yes"
"MSFT","MICROSOFT CORP","2.5000","$420.50","$2.10","0.50%","$1,051.25","$200.00","23.50%","10.3%","$5.25","0.50%","Yes"
"GOOGL","ALPHABET INC CLASS A","1.2500","$175.30","$-0.50","-0.28%","$219.13","$25.00","12.88%","2.1%","$-0.63","-0.28%","No"
"Account Total","","","","","","$10,240.34","$1,500.00","17.15%","100.0%","$50.00","0.49%",""`;

/**
 * Sample CSV file content with date in filename format
 */
export const sampleCSVWithDateInFilename = `"Positions for account Roth Contributory IRA ...348"
""
"Symbol","Description","Qty (Quantity)","Price","Mkt Val (Market Value)","Gain $ (Gain/Loss $)","Gain % (Gain/Loss %)"
"AAPL","APPLE INC","4.1569","$209.28","$869.96","$150.00","20.85%"
"MSFT","MICROSOFT CORP","2.5000","$420.50","$1,051.25","$200.00","23.50%"
"Account Total","","","","$10,240.34","$1,500.00","17.15%"`;

/**
 * Sample JSON transaction file content
 */
export const sampleJSONContent = {
  "FromDate": "2024-01-01",
  "ToDate": "2024-12-31",
  "TotalTransactionsAmount": "$5,000.00",
  "BrokerageTransactions": [
    {
      "TransactionDate": "2024-01-15",
      "TransactionType": "Buy",
      "Symbol": "AAPL",
      "Quantity": 4.1569,
      "Price": "$180.00",
      "Amount": "$748.24",
      "Commission": "$0.00"
    },
    {
      "TransactionDate": "2024-02-20",
      "TransactionType": "Buy",
      "Symbol": "MSFT",
      "Quantity": 2.5000,
      "Price": "$340.50",
      "Amount": "$851.25",
      "Commission": "$0.00"
    },
    {
      "TransactionDate": "2024-03-10",
      "TransactionType": "Sell",
      "Symbol": "GOOGL",
      "Quantity": 0.5000,
      "Price": "$150.00",
      "Amount": "$75.00",
      "Commission": "$0.00"
    }
  ]
};

/**
 * Sample portfolio data (parsed from CSV)
 */
export const samplePortfolioData = [
  {
    "Symbol": "AAPL",
    "Description": "APPLE INC",
    "Qty (Quantity)": 4.1569,
    "Price": 209.28,
    "Price Chng $ (Price Change $)": 0.91,
    "Price Chng % (Price Change %)": 0.44,
    "Mkt Val (Market Value)": 869.96,
    "Gain $ (Gain/Loss $)": 150.00,
    "Gain % (Gain/Loss %)": 20.85,
    "% of Acct (% of Account)": 8.5,
    "Day Chng $ (Day Change $)": 3.78,
    "Day Chng % (Day Change %)": 0.44,
    "Reinvest?": "Yes"
  },
  {
    "Symbol": "MSFT",
    "Description": "MICROSOFT CORP",
    "Qty (Quantity)": 2.5000,
    "Price": 420.50,
    "Price Chng $ (Price Change $)": 2.10,
    "Price Chng % (Price Change %)": 0.50,
    "Mkt Val (Market Value)": 1051.25,
    "Gain $ (Gain/Loss $)": 200.00,
    "Gain % (Gain/Loss %)": 23.50,
    "% of Acct (% of Account)": 10.3,
    "Day Chng $ (Day Change $)": 5.25,
    "Day Chng % (Day Change %)": 0.50,
    "Reinvest?": "Yes"
  }
];

/**
 * Sample account total
 */
export const sampleAccountTotal = {
  totalValue: 10240.34,
  totalGain: 1500.00,
  gainPercent: 17.15
};

/**
 * Sample transaction data (parsed from JSON)
 */
export const sampleTransactionData = [
  {
    date: new Date("2024-01-15"),
    type: "Buy",
    symbol: "AAPL",
    quantity: 4.1569,
    price: 180.00,
    amount: 748.24,
    commission: 0.00
  },
  {
    date: new Date("2024-02-20"),
    type: "Buy",
    symbol: "MSFT",
    quantity: 2.5000,
    price: 340.50,
    amount: 851.25,
    commission: 0.00
  }
];

/**
 * Create a mock File object for testing
 * @param {string} content - File content
 * @param {string} filename - Filename
 * @param {string} mimeType - MIME type
 * @returns {File} Mock File object
 */
export function createMockFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const file = new File([blob], filename, { type: mimeType });
  return file;
}

/**
 * Create a mock CSV file
 * @param {string} filename - Filename
 * @returns {File} Mock CSV file
 */
export function createMockCSVFile(filename = 'test-portfolio.csv') {
  return createMockFile(sampleCSVContent, filename, 'text/csv');
}

/**
 * Create a mock JSON file
 * @param {string} filename - Filename
 * @returns {File} Mock JSON file
 */
export function createMockJSONFile(filename = 'test-transactions.json') {
  return createMockFile(JSON.stringify(sampleJSONContent), filename, 'application/json');
}

