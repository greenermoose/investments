// utils/csvParser.js
import Papa from 'papaparse';
import { extractDateFromAccountInfo } from './dateUtils';

/**
 * Parses a value to appropriate format
 * @param {string} value - The value to parse
 * @returns {number|string} The parsed value
 */
const parseFieldValue = (value) => {
  if (!value || value === 'N/A' || value === '--' || value === '') {
    return value;
  }
  
  // Remove quotes and trim
  value = value.replace(/^["']|["']$/g, '').trim();
  
  // Parse currency
  if (value.startsWith('$')) {
    const numValue = parseFloat(value.replace(/[\$,\+]/g, ''));
    return isNaN(numValue) ? value : numValue;
  }
  
  // Parse percentage
  if (value.includes('%')) {
    const numValue = parseFloat(value.replace(/[%\+]/g, ''));
    return isNaN(numValue) ? value : numValue;
  }
  
  // Parse numeric values
  const possibleNumber = parseFloat(value.replace(/[,\+]/g, ''));
  if (!isNaN(possibleNumber)) {
    return possibleNumber;
  }
  
  return value;
};

/**
 * Creates a header mapping to handle different header variations
 * @param {Array} columnHeaders - The raw column headers from the file
 * @returns {Object} A mapping of standard names to column indices
 */
const createHeaderMapping = (columnHeaders) => {
  const headerMap = {};
  
  columnHeaders.forEach((header, index) => {
    // Normalize and map headers to standard names
    const normalizedHeader = header.replace(/\s+/g, ' ').trim();
    
    // Map different variations to standardized names
    switch(normalizedHeader) {
      case 'Quantity':
      case 'Qty (Quantity)':
        headerMap['Qty (Quantity)'] = index;
        break;
      case 'Market Value':
      case 'Mkt Val (Market Value)':
        headerMap['Mkt Val (Market Value)'] = index;
        break;
      case 'Gain/Loss $':
      case 'Gain $ (Gain/Loss $)':
        headerMap['Gain $ (Gain/Loss $)'] = index;
        break;
      case 'Gain/Loss %':
      case 'Gain % (Gain/Loss %)':
        headerMap['Gain % (Gain/Loss %)'] = index;
        break;
      case '% Of Account':
      case '% of Acct (% of Account)':
        headerMap['% of Acct (% of Account)'] = index;
        break;
      case 'Day Change $':
      case 'Day Chng $ (Day Change $)':
        headerMap['Day Chng $ (Day Change $)'] = index;
        break;
      case 'Day Change %':
      case 'Day Chng % (Day Change %)':
        headerMap['Day Chng % (Day Change %)'] = index;
        break;
      case 'Price Change $':
      case 'Price Chng $ (Price Change $)':
        headerMap['Price Chng $ (Price Change $)'] = index;
        break;
      case 'Price Change %':
      case 'Price Chng % (Price Change %)':
        headerMap['Price Chng % (Price Change %)'] = index;
        break;
      case 'Reinvest Dividends?':
      case 'Reinvest?':
        headerMap['Reinvest?'] = index;
        break;
      default:
        headerMap[normalizedHeader] = index;
    }
  });
  
  return headerMap;
};

/**
 * Parses the IRA CSV data from the exported format
 * @param {string} fileContent - The raw CSV file content
 * @returns {Object} The parsed portfolio data and date
 */
export const parseIRAPortfolioCSV = (fileContent) => {
  try {
    // Check if file content is empty
    if (!fileContent || fileContent.trim().length === 0) {
      throw new Error('File is empty');
    }
    
    const lines = fileContent.split('\n');
    
    // Check if we have enough lines
    if (lines.length < 3) {
      throw new Error('File does not contain enough data');
    }
    
    // Extract date from the first row (checking for both format variations)
    let portfolioDate = extractDateFromAccountInfo(lines[0]);
    
    // If first line doesn't have date info, it might be in a different format
    if (!portfolioDate) {
      // Try to parse from filename format in the first line
      const dateMatch = lines[0].match(/as of (.*?)[,"]/);
      if (dateMatch) {
        portfolioDate = new Date(dateMatch[1]);
      }
    }
    
    // Find the header row - it contains "Symbol" and has many commas
    let headerRowIndex = -1;
    let columnHeaders = [];
    
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const possibleHeaderLine = lines[i];
      if (possibleHeaderLine.includes('"Symbol"') || possibleHeaderLine.includes('Symbol')) {
        headerRowIndex = i;
        
        // Parse the header line with Papa Parse
        const parsed = Papa.parse(possibleHeaderLine, {
          delimiter: ",",
          quoteChar: '"'
        });
        
        if (parsed.data && parsed.data[0]) {
          columnHeaders = parsed.data[0].map(header => header.trim());
        }
        break;
      }
    }
    
    if (headerRowIndex === -1) {
      throw new Error('Could not find the column headers row');
    }
    
    // Create header mapping
    const headerMap = createHeaderMapping(columnHeaders);
    
    // Parse the data rows
    const portfolioData = [];
    let accountTotal = null;
    
    for (let i = headerRowIndex + 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      try {
        const parsed = Papa.parse(lines[i], {
          delimiter: ",",
          quoteChar: '"'
        });
        
        if (!parsed.data || !parsed.data[0]) continue;
        
        const row = parsed.data[0];
        
        // Create mapped object using header mapping
        const mappedRow = {};
        
        // Use standardized header names
        Object.entries(headerMap).forEach(([standardHeader, idx]) => {
          if (idx < row.length && row[idx]) {
            mappedRow[standardHeader] = parseFieldValue(row[idx]);
          }
        });
        
        // Check if this is the account total row
        if ((mappedRow.Symbol === 'Account Total' || mappedRow.Description === 'Account Total') &&
            mappedRow['Mkt Val (Market Value)']) {
          accountTotal = {
            totalValue: mappedRow['Mkt Val (Market Value)'] || 0,
            totalGain: mappedRow['Gain $ (Gain/Loss $)'] || 0,
            gainPercent: mappedRow['Gain % (Gain/Loss %)'] || 0
          };
        } else if (mappedRow.Symbol && 
                   mappedRow.Symbol !== 'Cash & Cash Investments' && 
                   mappedRow.Symbol !== 'Account Total' &&
                   mappedRow.Symbol !== 'Cash and Money Market') {
          portfolioData.push(mappedRow);
        }
      } catch (rowError) {
        console.warn(`Error parsing row ${i}:`, rowError.message);
        continue;
      }
    }
    
    if (portfolioData.length === 0) {
      throw new Error('No valid portfolio data found in the file');
    }
    
    return { portfolioData, portfolioDate, accountTotal };
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw new Error(`Failed to parse the portfolio CSV data: ${error.message}`);
  }
};