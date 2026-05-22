# Build Scripts

This directory contains formal, repeatable build scripts used to prepare data and assets for the web application.

- **`build_sec_data.js`**: Parses raw JSON files from the `/data` directory containing SEC filings, calculates accurately the Trailing Twelve Months (TTM) Revenue and latest shares outstanding, and generates a single consolidated `sec-data.json` file in the `/http` directory for client-side consumption via IndexedDB.

To run scripts, make sure you have Node.js installed and execute them from the repository root:
```bash
node scripts/build_sec_data.js
```
