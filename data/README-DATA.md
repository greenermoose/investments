# Data about public companies

In this folder, for each public company there will be one data file that contains research compiled from SEC filings.

## Instructions for AI Agents

When requested to create or update data for a public company, please follow these instructions:

1. **Find SEC Filings**:
   - Go to the SEC EDGAR search page (https://www.sec.gov/edgar/searchedgar/companysearch).
   - Search for the company using its ticker symbol.
   - Locate the company's 10-Q (quarterly) and 10-K (annual) filings. 8-K filings that include financial statements (usually for the 4th quarter) should also be reviewed.

2. **Read and Extract Data**:
   - Open the interactive data or HTML version of the filing.
   - You need to extract financial metrics for the specific three-month period covered by the filing (or the fourth quarter in the case of a 10-K/8-K).

3. **Data Requirements**:
   For each three-month period, extract the following metrics:
   - **Shares Outstanding**: The number of shares outstanding as of the latest practicable date or balance sheet date.
   - **Revenue**: Total net sales or revenue for the three-month period.
   - **Balance Sheet**:
     - **Total Assets**: The total assets as of the end of the period.
     - **Total Liabilities**: The total liabilities as of the end of the period.
     - **Total Shareholders' Equity**: Total stockholders' equity as of the end of the period.

4. **Update or Create JSON File**:
   - Look for an existing JSON file in this directory named `[SYMBOL].json` (e.g., `AAPL.json`).
   - If it exists, update it by adding a new object to the `filings` array for the new period.
   - If it does not exist, create a new file following the structure shown in existing files (like `AAPL.json`).

5. **Ensure Accuracy and Completeness**:
   - Verify that all extracted numbers are accurate and properly formatted as integers (not strings).
   - Ensure the JSON structure exactly matches the existing schema.
   - Double-check period dates to avoid duplicate entries.