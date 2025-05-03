# Investment Portfolio Manager

A React-based web application for analyzing and managing investment portfolios.

![Investment Portfolio Dashboard](https://via.placeholder.com/800x400?text=Investment+Portfolio+Dashboard)

## Features

- **Portfolio Overview**: Get a quick glance at your total portfolio value, gains/losses, and asset allocation
- **Position Management**: View, sort, and filter all your investment positions
- **Performance Analysis**: Track your top performers and analyze your investment returns
- **Portfolio Insights**: Get recommendations and visualizations to help optimize your investments
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

1. **Upload Your Portfolio**: 
   - Click on the upload area to select a CSV file or drag and drop it
   - The app supports IRA position exports with embedded dates in the filename (format: nameYYYYMMDDHHMMSS.csv)

2. **Navigate Tabs**:
   - **Overview**: View portfolio summary and top holdings
   - **Positions**: See all your positions with sorting and filtering
   - **Performance**: Analyze gains and losses
   - **Analysis**: Get insights and recommendations about your portfolio

3. **Export Data**:
   - Use the "Export CSV" button to download your portfolio data

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

## License

This project is licensed under the GNU General Public License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [React](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Recharts](https://recharts.org/)
- [PapaParse](https://www.papaparse.com/)