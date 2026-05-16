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

## Development

Since this is a no-build application:

- **No build step**: Edit files directly in the `http` folder
- **ES Modules**: All imports use native ES module syntax with `.js` extensions
- **Hot Reload**: Use your web server's capabilities or manually refresh the browser
- **Browser DevTools**: Use browser developer tools for debugging

### Architecture Notes

- **Components**: Vue 3 Options API components in `js/components/`
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

## Documentation

The docs folder is for specifications, plans, architectural diagrams, and other documentation. This is not for user docs. These are for developers. The docs folder is not served by the web server and is not part of the app. It exists as a reference for developers, especially AI agents. Note that the docs are not always up to date with the latest changes in the app. Developers should always refer to the code for the latest information.

## License

This project is licensed under the GNU General Public License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [Vue.js](https://vuejs.org/)
- [Vuetify](https://vuetifyjs.com/)