import Papa from 'papaparse';

/**
 * Parses the IRA CSV data from the exported format
 * @param {string} fileContent - The raw CSV file content
 * @returns {Object} The parsed portfolio data and date
 */
export const parseIRAPortfolioCSV = (fileContent) => {
  try {
    // Split by lines and parse manually to handle the specific structure
    const lines = fileContent.split('\n');
    
    // Extract account info and date from the first row
    const accountInfo = lines[0];
    let portfolioDate = null;
    let accountTotal = null;
    
    // Extract date from account info (format: "as of 06:40 PM ET, 2025/04/27")
    const dateMatch = accountInfo.match(/as of (\d+:\d+ [AP]M) ET, (\d{4})\/(\d{2})\/(\d{2})/);
    if (dateMatch) {
      const [_, timeStr, year, month, day] = dateMatch;
      // Parse time (convert from 12-hour to 24-hour format)
      const [hourMin, ampm] = timeStr.split(' ');
      let [hours, minutes] = hourMin.split(':').map(Number);
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      
      portfolioDate = new Date(year, month - 1, day, hours, minutes);
    }
    
    // Extract column headers from the third row (index 2)
    const columnHeaders = lines[2].split(',').map(header => {
      // Remove quotes and trim
      return header.replace(/"/g, '').trim();
    });
    
    // Parse the data rows (starting from row 3)
    const portfolioData = [];
    for (let i = 3; i < lines.length; i++) {
      if (lines[i].trim() === '') continue; // Skip empty lines
      
      // Split the line by commas, respecting quoted values
      const row = Papa.parse(lines[i], {
        delimiter: ",",
        quoteChar: '"'
      }).data[0];
      
      if (row.length < columnHeaders.length) continue; // Skip incomplete rows
      
      // Map the row values to the column headers
      const mappedRow = {};
      for (let j = 0; j < columnHeaders.length; j++) {
        // Remove quotes
        let value = row[j].replace(/"/g, '').trim();
        
        // Special handling for numeric fields
        if (columnHeaders[j] === 'Qty (Quantity)' || 
            columnHeaders[j] === 'Price' || 
            columnHeaders[j] === 'Mkt Val (Market Value)' || 
            columnHeaders[j] === 'Cost Basis') {
          if (value !== 'N/A' && value !== '--') {
            value = value.replace(/[$,]/g, '');
            mappedRow[columnHeaders[j]] = parseFloat(value);
          } else {
            mappedRow[columnHeaders[j]] = value;
          }
        } 
        // Handle percentage fields
        else if (columnHeaders[j] === 'Gain % (Gain/Loss %)' || 
                 columnHeaders[j] === 'Price Chng % (Price Change %)' ||
                 columnHeaders[j] === 'Day Chng % (Day Change %)' ||
                 columnHeaders[j] === '% of Acct (% of Account)') {
          if (value !== 'N/A' && value !== '--') {
            value = value.replace(/[%]/g, '');
            mappedRow[columnHeaders[j]] = parseFloat(value);
          } else {
            mappedRow[columnHeaders[j]] = value;
          }
        }
        // Handle dollar change fields
        else if (columnHeaders[j] === 'Price Chng $ (Price Change $)' || 
                 columnHeaders[j] === 'Day Chng $ (Day Change $)' ||
                 columnHeaders[j] === 'Gain $ (Gain/Loss $)') {
          if (value !== 'N/A' && value !== '--') {
            value = value.replace(/[$,]/g, '');
            mappedRow[columnHeaders[j]] = parseFloat(value);
          } else {
            mappedRow[columnHeaders[j]] = value;
          }
        }
        else {
          mappedRow[columnHeaders[j]] = value;
        }
      }
      
      // Check if this row is the Account Total row
      if (mappedRow['Symbol'] === 'Account Total' || 
          mappedRow['Description']?.includes('Account Total') || 
          mappedRow['Symbol'] === '' && mappedRow['Description']?.includes('Total')) {
        // Store account total information separately instead of adding to portfolio data
        accountTotal = {
          totalValue: mappedRow['Mkt Val (Market Value)'] || 0,
          totalGain: mappedRow['Gain $ (Gain/Loss $)'] || 0,
          gainPercent: mappedRow['Gain % (Gain/Loss %)'] || 0
        };
      } else {
        // Add regular security to portfolio data
        portfolioData.push(mappedRow);
      }
    }
    
    return { portfolioData, portfolioDate, accountTotal };
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw new Error('Failed to parse the portfolio CSV data');
  }
};

/**
 * Parses a filename with embedded date (format: nameYYYYMMDDHHMMSS.csv)
 * @param {string} filename - The filename to parse
 * @returns {Date|null} The extracted date or null if not found
 */
export const parseDateFromFilename = (filename) => {
  const dateMatch = filename.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (dateMatch) {
    const [_, year, month, day, hours, minutes, seconds] = dateMatch;
    return new Date(year, month-1, day, hours, minutes, seconds);
  }
  return null;
};

/**
 * Formats a numeric value as currency
 * @param {number} value - The value to format
 * @returns {string} The formatted currency string
 */
export const formatCurrency = (value) => {
  if (typeof value !== 'number') return value;
  return '$' + value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
};

/**
 * Formats a numeric value as a percentage
 * @param {number} value - The value to format
 * @returns {string} The formatted percentage string
 */
export const formatPercent = (value) => {
  if (typeof value !== 'number') return value;
  return value.toFixed(2) + '%';
};

/**
 * Normalizes security symbols for comparison
 * @param {string} symbol - The symbol to normalize
 * @returns {string} The normalized symbol
 */
export const normalizeSymbol = (symbol) => {
  if (!symbol) return '';
  return symbol.replace(/\s+/g, '').toUpperCase();
};

/**
 * Compares two portfolio snapshots to detect quantity changes
 * @param {Array} current - Current portfolio data
 * @param {Array} previous - Previous portfolio data
 * @returns {Object} Comparison results with changes
 */
export const comparePortfolioSnapshots = (current, previous) => {
  const changes = {
    added: [],
    removed: [],
    quantityChanges: [],
    noChanges: []
  };
  
  if (!previous || !Array.isArray(previous)) {
    return { added: current || [], removed: [], quantityChanges: [], noChanges: [] };
  }
  
  const currentSymbols = new Map();
  const previousSymbols = new Map();
  
  // Build lookup maps
  current.forEach(position => {
    if (position.Symbol) {
      currentSymbols.set(normalizeSymbol(position.Symbol), position);
    }
  });
  
  previous.forEach(position => {
    if (position.Symbol) {
      previousSymbols.set(normalizeSymbol(position.Symbol), position);
    }
  });
  
  // Find added positions
  currentSymbols.forEach((position, symbol) => {
    if (!previousSymbols.has(symbol)) {
      changes.added.push(position);
    }
  });
  
  // Find removed positions
  previousSymbols.forEach((position, symbol) => {
    if (!currentSymbols.has(symbol)) {
      changes.removed.push(position);
    }
  });
  
  // Find quantity changes
  currentSymbols.forEach((currentPos, symbol) => {
    if (previousSymbols.has(symbol)) {
      const previousPos = previousSymbols.get(symbol);
      const currentQty = currentPos['Qty (Quantity)'] || 0;
      const previousQty = previousPos['Qty (Quantity)'] || 0;
      
      if (Math.abs(currentQty - previousQty) > 0.0001) { // Allow for floating point errors
        changes.quantityChanges.push({
          symbol: currentPos.Symbol,
          previousQuantity: previousQty,
          currentQuantity: currentQty,
          quantityDelta: currentQty - previousQty,
          position: currentPos
        });
      } else {
        changes.noChanges.push(currentPos);
      }
    }
  });
  
  return changes;
};