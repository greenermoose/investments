# Investment Portfolio Manager

A React-based web application for analyzing and managing investment portfolios with time-series comparison capabilities.

![Investment Portfolio Dashboard](https://via.placeholder.com/800x400?text=Investment+Portfolio+Dashboard)

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

- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/) (for fast development and builds)
- [Tailwind CSS](https://tailwindcss.com/) (for styling)
- [Recharts](https://recharts.org/) (for data visualization)
- [PapaParse](https://www.papaparse.com/) (for CSV parsing)

## Setup and Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/investment-portfolio-manager.git
   cd investment-portfolio-manager
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

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

The application uses browser-based storage to maintain:
- Portfolio snapshots across sessions
- Security metadata (acquisition dates, descriptions)
- Tax lot information
- Lot tracking preferences

## Build for Production

```bash
npm run build
# or
yarn build
```

The built files will be in the `dist` directory, ready to be deployed to any static hosting service.

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

- [React](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Recharts](https://recharts.org/)
- [PapaParse](https://www.papaparse.com/)