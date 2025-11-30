# Investment Portfolio Manager

A Vue.js-based web application for analyzing and managing investment portfolios with time-series comparison capabilities. This is a no-build application that runs directly in the browser using ES modules.

# Investment Portfolio Dashboard

## Features

- **Portfolio Overview**: Get a quick glance at your total portfolio value, gains/losses, and asset allocation
- **Position Management**: View, sort, and filter all your investment positions
- **Performance Analysis**: Track your top performers and analyze your investment returns
- **Portfolio Insights**: Get recommendations and visualizations to help optimize your investments
- **Time-Series Portfolio Tracking**: 
  - Upload multiple portfolio snapshots from different dates
  - Compare portfolios over time
  - Track position changes and performance trends
  - Visual portfolio evolution tracking
- **Lot Management**:
  - Track individual tax lots
  - Support for FIFO, LIFO, and Specific Identification
  - Weighted-average cost basis calculations
- **Acquisition Management**:
  - Automatically detect new securities
  - Handle ticker symbol changes
  - Track acquisition dates and cost basis
- **Portfolio History**:
  - Compare any two snapshots side-by-side
  - Track position changes (additions, removals, quantity changes)
  - Analyze portfolio value changes over time
- **CSV Import/Export**: Import your portfolio data from a CSV file and export it for external use

## Technologies Used

- [Vue 3](https://vuejs.org/) (Options API with ES modules)
- [Vuetify](https://vuetifyjs.com/) (Material Design component framework)
- [ES Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) (native browser module support, no build step required)
- [PapaParse](https://www.papaparse.com/) (for CSV parsing)
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (browser-based data storage)

## Setup and Installation

### Prerequisites

- A modern web browser with ES module support (Chrome, Firefox, Safari, Edge - all recent versions)
- A web server to serve the files (required for ES modules to work properly)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/investment-portfolio-manager.git
   cd investment-portfolio-manager
   ```

2. **No build step required!** This application uses native ES modules and runs directly in the browser.

3. Serve the `http` folder using any web server. Here are a few options:

   **Option A: Python 3 (recommended for quick testing)**
   ```bash
   cd http
   python3 -m http.server 8000
   ```
   Then open your browser to `http://localhost:8000`

   **Option B: Node.js http-server**
   ```bash
   npx http-server http -p 8000
   ```
   Then open your browser to `http://localhost:8000`

   **Option C: PHP**
   ```bash
   cd http
   php -S localhost:8000
   ```
   Then open your browser to `http://localhost:8000`

   **Option D: Any web server**
   - Point your web server's document root to the `http` folder
   - Ensure the server supports ES modules (most modern servers do)
   - Access the application via your server's URL

### Project Structure

The application is organized in the `http` folder:

```
http/
├── index.html          # Main HTML entry point
├── css/                # Stylesheets (Vuetify and app styles)
├── js/
│   ├── app.js          # Vue application entry point
│   ├── vue.esm-browser.js    # Vue 3 ES module
│   ├── vuetify.esm.js        # Vuetify ES module
│   ├── components/     # Vue components
│   ├── composables/    # Reactive stores (state management)
│   ├── repositories/   # Data access layer (IndexedDB)
│   ├── services/       # Business logic services
│   └── utils/          # Utility functions
└── fonts/              # Web fonts
```

## Usage

### Initial Portfolio Upload

1. **Upload Your First Portfolio**: 
   - Click on the upload area to select a CSV file or drag and drop it
   - The app supports IRA position exports with embedded dates in the filename (format: nameYYYYMMDDHHMMSS.csv)

2. **Acquisition Date Processing**:
   - When new securities are detected, you'll be prompted to enter acquisition dates
   - Option to identify ticker symbol changes for proper cost basis tracking

### Adding Additional Portfolios

1. **Upload New Snapshots**: 
   - Click the "Upload New Portfolio" button in the header (visible after initial upload)
   - Upload portfolio exports from different dates
   - The app automatically detects and prompts for new security acquisitions

2. **Compare Over Time**:
   - Navigate to the History tab to see all uploaded snapshots
   - Select any two snapshots to compare side-by-side
   - View position changes and portfolio value variations

### Navigation

1. **Overview Tab**: 
   - View portfolio summary and top holdings
   - Quick indicator of how many portfolio snapshots are available

2. **Positions Tab**: 
   - See all your positions with sorting and filtering
   - Export current portfolio as CSV

3. **Performance Tab**: 
   - Analyze gains and losses
   - View top performers and underperformers

4. **Analysis Tab**: 
   - Get insights and recommendations
   - Portfolio diversification analysis

5. **History Tab**: 
   - View all portfolio snapshots
   - Compare any two snapshots for detailed analysis
   - Track portfolio evolution over time

6. **Lots Tab**: 
   - Manage tax lots for each security
   - Configure lot tracking method (FIFO/LIFO/Specific)
   - View cost basis calculations

### Export Data

1. **Position Export**:
   - Use the "Export CSV" button in the Positions tab

2. **Historical Comparison**:
   - Export comparison data between any two snapshots

## CSV File Format

The application expects a CSV file with the following structure:
- Header rows at the top (account information)
- Column headers (Symbol, Description, Quantity, etc.)
- Position data rows

Example format supported:
```
"Positions for account Roth Contributory IRA ...348 as of 06:40 PM ET, 2025/04/27"
""
"Symbol","Description","Qty (Quantity)","Price","Price Chng $ (Price Change $)","Price Chng % (Price Change %)","Mkt Val (Market Value)",...
"AAPL","APPLE INC","4.1569","$209.28","$0.91","0.44%","$869.96",...
...
```

## File Naming Convention

For automatic date detection, name your CSV files using the format:
```
accountNameYYYYMMDDHHMMSS.csv
```
Example: `IRA20250427180000.csv`

## Data Persistence

The application uses browser-based storage (IndexedDB) to maintain:
- Portfolio snapshots across sessions
- Security metadata (acquisition dates, descriptions)
- Tax lot information
- Lot tracking preferences
- Transaction history
- Uploaded file metadata

All data is stored locally in your browser - no server or cloud storage required.

## Development

Since this is a no-build application:

- **No build step**: Edit files directly in the `http` folder
- **ES Modules**: All imports use native ES module syntax with `.js` extensions
- **Hot Reload**: Use your web server's capabilities or manually refresh the browser
- **Browser DevTools**: Use browser developer tools for debugging

### Architecture Notes

- **Components**: Vue 3 Options API components in `js/components/`
- **State Management**: Reactive stores using Vue's `reactive()` in `js/composables/`
- **Data Layer**: Repository pattern for IndexedDB access in `js/repositories/`
- **Business Logic**: Service layer in `js/services/`
- **Utilities**: Helper functions in `js/utils/`

## Deployment

To deploy this application:

1. Copy the entire `http` folder to your web server
2. Ensure your web server supports ES modules (most modern servers do)
3. Point your server's document root to the `http` folder
4. Access the application via your server's URL

No build or compilation step is required - the application runs directly from the source files.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

- Multi-account portfolio aggregation
- Custom reporting and analytics
- Integration with brokerage APIs
- Mobile application development
- Cloud sync capabilities

## License

This project is licensed under the GNU General Public License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [Vue.js](https://vuejs.org/)
- [Vuetify](https://vuetifyjs.com/)
- [PapaParse](https://www.papaparse.com/)
- [Material Design Icons](https://materialdesignicons.com/)
