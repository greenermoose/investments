# Portfolio Tracker Implementation Plan

We are building a web-based portfolio tracker that runs entirely in the browser using no-dependency JavaScript and IndexedDB for storage. The first phase focuses on parsing broker export files (from Roth IRA accounts) to maintain a list of currently held stocks, track trade history, and document the reasoning behind buy/sell decisions.

## User Review Required
> [!IMPORTANT]
> This plan pivots our immediate focus to building the front-end portfolio tracker and data parser before continuing with the Python market simulator. Please verify that this aligns with your current priorities.

## Open Questions
> [!WARNING]
> - Which broker(s) will you be exporting data from? Knowing this will help us structure the parser to handle their specific CSV/Excel formats.
> - Will the exports be in CSV format, or something else?

## Proposed Architecture

### 1. Broker Export Parser
A pure JavaScript, zero-dependency module to parse CSV/text exports from various brokers.
#### [NEW] `js/parser.js`
- Functions to read and parse CSV or text files using the HTML5 File API.
- Normalizes parsed data into a standard internal format (Symbol, Quantity, Cost Basis, Date, Action).

### 2. Local Database (IndexedDB)
A storage layer to securely keep portfolio data in the user's browser.
#### [NEW] `js/database.js`
- Initializes an IndexedDB database.
- Stores parsed holdings, trade history, and user-entered notes (buy/sell reasoning).

### 3. User Interface
A modern web interface to interact with the portfolio data.
#### [NEW] `index.html`
- Main entry point. Includes file upload inputs for broker exports.
- Displays the current portfolio, trade history, and performance metrics.
#### [NEW] `css/style.css`
- Core design system using vanilla CSS with a premium, dynamic aesthetic.
#### [NEW] `js/app.js`
- Wires up the UI to the parser and database.
- Handles user interactions (uploading files, adding notes to trades).

## Verification Plan

### Automated Tests
- We will provide various sample broker export files to the parser and verify the output matches expected JSON objects using simple JS assertions.

### Manual Verification
- Upload test export files through the UI and verify that the data is correctly parsed, displayed, and persisted in IndexedDB across page reloads.
- Add notes to specific trades and confirm they are saved and retrieved correctly.
