// utils/sampleData.js revision: 1
/**
 * Generates sample portfolio data for testing
 * @returns {Object} Sample portfolio data
 */
export const generateSamplePortfolioData = () => {
    const stocks = [
      { Symbol: 'AAPL', Description: 'Apple Inc.', SecurityType: 'Equity', Price: 196.45, Quantity: 15.0 },
      { Symbol: 'MSFT', Description: 'Microsoft Corporation', SecurityType: 'Equity', Price: 417.88, Quantity: 10.0 },
      { Symbol: 'AMZN', Description: 'Amazon.com Inc.', SecurityType: 'Equity', Price: 178.87, Quantity: 12.0 },
      { Symbol: 'GOOGL', Description: 'Alphabet Inc. Class A', SecurityType: 'Equity', Price: 164.32, Quantity: 18.0 },
      { Symbol: 'META', Description: 'Meta Platforms Inc.', SecurityType: 'Equity', Price: 472.24, Quantity: 8.0 },
      { Symbol: 'NVDA', Description: 'NVIDIA Corporation', SecurityType: 'Equity', Price: 883.84, Quantity: 5.0 },
      { Symbol: 'TSLA', Description: 'Tesla Inc.', SecurityType: 'Equity', Price: 183.97, Quantity: 14.0 },
      { Symbol: 'AVGO', Description: 'Broadcom Inc.', SecurityType: 'Equity', Price: 1428.18, Quantity: 2.0 },
      { Symbol: 'NFLX', Description: 'Netflix Inc.', SecurityType: 'Equity', Price: 629.50, Quantity: 4.0 },
      { Symbol: 'ADBE', Description: 'Adobe Inc.', SecurityType: 'Equity', Price: 513.36, Quantity: 6.0 }
    ];
    
    const etfs = [
      { Symbol: 'SPY', Description: 'SPDR S&P 500 ETF Trust', SecurityType: 'ETF', Price: 512.61, Quantity: 10.0 },
      { Symbol: 'QQQ', Description: 'Invesco QQQ Trust', SecurityType: 'ETF', Price: 441.67, Quantity: 8.0 },
      { Symbol: 'VTI', Description: 'Vanguard Total Stock Market ETF', SecurityType: 'ETF', Price: 253.89, Quantity: 15.0 },
      { Symbol: 'VGT', Description: 'Vanguard Information Technology ETF', SecurityType: 'ETF', Price: 506.87, Quantity: 6.0 },
      { Symbol: 'SCHD', Description: 'Schwab US Dividend Equity ETF', SecurityType: 'ETF', Price: 78.42, Quantity: 25.0 }
    ];
    
    const bonds = [
      { Symbol: 'BND', Description: 'Vanguard Total Bond Market ETF', SecurityType: 'Bond', Price: 72.43, Quantity: 30.0 },
      { Symbol: 'TLT', Description: 'iShares 20+ Year Treasury Bond ETF', SecurityType: 'Bond', Price: 94.15, Quantity: 20.0 }
    ];
    
    // Combine all securities
    const positions = [...stocks, ...etfs, ...bonds];
    
    // Calculate additional fields for each position
    const enrichedPositions = positions.map(position => {
      const marketValue = position.Price * position.Quantity;
      const costBasis = marketValue * (0.7 + Math.random() * 0.6); // Random cost basis around market value
      const gainLoss = marketValue - costBasis;
      const gainLossPercent = (gainLoss / costBasis) * 100;
      const dayChange = (position.Price * (Math.random() * 0.04 - 0.02)); // Random day change between -2% and 2%
      const dayChangeAmount = dayChange * position.Quantity;
      const dayChangePercent = (dayChange / position.Price) * 100;
      
      return {
        'Symbol': position.Symbol,
        'Description': position.Description,
        'Security Type': position.SecurityType,
        'Qty (Quantity)': position.Quantity,
        'Price': position.Price,
        'Mkt Val (Market Value)': marketValue,
        'Cost Basis': costBasis,
        'Gain $ (Gain/Loss $)': gainLoss,
        'Gain % (Gain/Loss %)': gainLossPercent,
        'Day Chng $ (Day Change $)': dayChangeAmount,
        'Day Chng % (Day Change %)': dayChangePercent,
        'Price Chng $ (Price Change $)': dayChange,
        'Price Chng % (Price Change %)': dayChangePercent,
        '% of Acct (% of Account)': 0, // Will be calculated after total portfolio value
      };
    });
    
    // Calculate total portfolio value
    const totalValue = enrichedPositions.reduce((sum, position) => sum + position['Mkt Val (Market Value)'], 0);
    
    // Add percentage of account
    return enrichedPositions.map(position => ({
      ...position,
      '% of Acct (% of Account)': (position['Mkt Val (Market Value)'] / totalValue) * 100
    }));
  };
  
  /**
   * Creates a sample CSV string from portfolio data
   * @returns {string} CSV data as a string
   */
  export const generateSampleCSV = () => {
    const data = generateSamplePortfolioData();
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = today.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
    
    // Header rows
    const csvRows = [
      `"Positions for Roth Contributory IRA as of ${timeStr} ET, ${today.getFullYear()}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}"`,
      `"Last updated as of ${timeStr} ET"`,
      `"Symbol","Description","Security Type","Qty (Quantity)","Price","Mkt Val (Market Value)","Cost Basis","Gain $ (Gain/Loss $)","Gain % (Gain/Loss %)","Day Chng $ (Day Change $)","Day Chng % (Day Change %)","Price Chng $ (Price Change $)","Price Chng % (Price Change %)","% of Acct (% of Account)"`
    ];
    
    // Add data rows
    data.forEach(position => {
      const row = [
        `"${position.Symbol}"`,
        `"${position.Description}"`,
        `"${position['Security Type']}"`,
        `"${position['Qty (Quantity)'].toFixed(4)}"`,
        `"${position.Price.toFixed(2)}"`,
        `"${position['Mkt Val (Market Value)'].toFixed(2)}"`,
        `"${position['Cost Basis'].toFixed(2)}"`,
        `"${position['Gain $ (Gain/Loss $)'].toFixed(2)}"`,
        `"${position['Gain % (Gain/Loss %)'].toFixed(2)}%"`,
        `"${position['Day Chng $ (Day Change $)'].toFixed(2)}"`,
        `"${position['Day Chng % (Day Change %)'].toFixed(2)}%"`,
        `"${position['Price Chng $ (Price Change $)'].toFixed(2)}"`,
        `"${position['Price Chng % (Price Change %)'].toFixed(2)}%"`,
        `"${position['% of Acct (% of Account)'].toFixed(2)}%"`
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  };
  
  /**
   * Function to download a sample CSV file
   */
  export const downloadSampleCSV = () => {
    const csvContent = generateSampleCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Create filename with current date/time in format that can be parsed later
    const now = new Date();
    const filename = `Roth_Contributory_IRAPositions${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };