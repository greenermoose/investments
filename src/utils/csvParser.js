// utils/csvParser.js
import Papa from 'papaparse';
import { extractDateFromAccountInfo } from './dateUtils';
import { isAccountTotalRow } from './securityUtils';

/**
 * Field mappings for the CSV parser
 */
const FIELD_TYPES = {
  NUMERIC: ['Qty (Quantity)', 'Price', 'Mkt Val (Market Value)', 'Cost Basis'],
  PERCENTAGE: [
    'Gain % (Gain/Loss %)', 
    'Price Chng % (Price Change %)',
    'Day Chng % (Day Change %)',
    '% of Acct (% of Account)'
  ],
  CURRENCY: [
    'Price Chng $ (Price Change $)', 
    'Day Chng $ (Day Change $)',
    'Gain $ (Gain/Loss $)'
  ]
};

/**
 * Parses a value based on its field type
 * @param {string} value - The value to parse
 * @param {string} fieldName - The field name
 * @returns {number|string} The parsed value
 */
const parseFieldValue = (value, fieldName) => {
  value = value.replace(/"/g, '').trim();
  
  if (value === 'N/A' || value === '--') {
    return value;
  }
  
  if (FIELD_TYPES.NUMERIC.includes(fieldName)) {
    return parseFloat(value.replace(/[$,]/g, ''));
  }
  
  if (FIELD_TYPES.PERCENTAGE.includes(fieldName)) {
    return parseFloat(value.replace(/[%]/g, ''));
  }
  
  if (FIELD_TYPES.CURRENCY.includes(fieldName)) {
    return parseFloat(value.replace(/[$,]/g, ''));
  }
  
  return value;
};

/**
 * Maps a row to column headers
 * @param {Array} row - The row data
 * @param {Array} headers - Column headers
 * @returns {Object} The mapped row data
 */
const mapRowToHeaders = (row, headers) => {
  const mappedRow = {};
  
  for (let j = 0; j < headers.length; j++) {
    mappedRow[headers[j]] = parseFieldValue(row[j], headers[j]);
  }
  
  return mappedRow;
};

/**
 * Parses the IRA CSV data from the exported format
 * @param {string} fileContent - The raw CSV file content
 * @returns {Object} The parsed portfolio data and date
 */
export const parseIRAPortfolioCSV = (fileContent) => {
  try {
    const lines = fileContent.split('\n');
    
    // Extract date from the first row
    const portfolioDate = extractDateFromAccountInfo(lines[0]);
    
    // Extract column headers from the third row
    const columnHeaders = lines[2].split(',').map(header => 
      header.replace(/"/g, '').trim()
    );
    
    // Parse the data rows
    const portfolioData = [];
    let accountTotal = null;
    
    for (let i = 3; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;
      
      const row = Papa.parse(lines[i], {
        delimiter: ",",
        quoteChar: '"'
      }).data[0];
      
      if (row.length < columnHeaders.length) continue;
      
      const mappedRow = mapRowToHeaders(row, columnHeaders);
      
      if (isAccountTotalRow(mappedRow)) {
        accountTotal = {
          totalValue: mappedRow['Mkt Val (Market Value)'] || 0,
          totalGain: mappedRow['Gain $ (Gain/Loss $)'] || 0,
          gainPercent: mappedRow['Gain % (Gain/Loss %)'] || 0
        };
      } else {
        portfolioData.push(mappedRow);
      }
    }
    
    return { portfolioData, portfolioDate, accountTotal };
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw new Error('Failed to parse the portfolio CSV data');
  }
};