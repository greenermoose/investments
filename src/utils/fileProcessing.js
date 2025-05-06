// utils/fileProcessing.js revision: 1

import Papa from 'papaparse';

/**
 * File Type Constants
 */
export const FileTypes = {
  CSV: 'csv',
  JSON: 'json'
};

/**
 * Parses a value to appropriate format
 * @param {string} value - The value to parse
 * @returns {number|string} The parsed value
 */
export const parseFieldValue = (value) => {
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
export const createHeaderMapping = (columnHeaders) => {
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
 * Extracts date from account info text
 * @param {string} accountInfo - The account info text
 * @returns {Date|null} The extracted date or null
 */
export const extractDateFromAccountInfo = (accountInfo) => {
  if (!accountInfo) return null;
  
  const dateMatch = accountInfo.match(/as of (\d+:\d+ [AP]M) ET, (\d{4})\/(\d{2})\/(\d{2})/);
  if (dateMatch) {
    const [_, timeStr, year, month, day] = dateMatch;
    // Parse time (convert from 12-hour to 24-hour format)
    const [hourMin, ampm] = timeStr.split(' ');
    let [hours, minutes] = hourMin.split(':').map(Number);
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    
    const date = new Date(year, month - 1, day, hours, minutes);
    
    // Validate the date
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date parsed from account info: ${accountInfo}`);
      return null;
    }
    
    return date;
  }
  return null;
};

/**
 * Parses the IRA CSV data from the exported format
 * @param {string} fileContent - The raw CSV file content
 * @returns {Object} The parsed portfolio data and date
 */
export const parsePortfolioCSV = (fileContent) => {
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
    
    // Extract date from the first row
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

/**
 * Validates a file based on type and content
 * @param {File} file - The file to validate
 * @param {string} expectedType - Expected file type (CSV or JSON)
 * @returns {Object} Validation result with success/error information
 */
export const validateFile = (file, expectedType) => {
  // Check if file exists
  if (!file) {
    return {
      success: false,
      error: 'No file provided'
    };
  }

  // Determine file type based on extension
  const isCSV = file.name.toLowerCase().endsWith('.csv');
  const isJSON = file.name.toLowerCase().endsWith('.json');
  
  // Validate file type matches expected type
  if (expectedType === FileTypes.CSV && !isCSV) {
    return {
      success: false,
      error: 'Please upload a CSV file'
    };
  }
  
  if (expectedType === FileTypes.JSON && !isJSON) {
    return {
      success: false,
      error: 'Please upload a JSON file'
    };
  }
  
  // Basic file size validation
  const maxSize = expectedType === FileTypes.CSV ? 10 * 1024 * 1024 : 50 * 1024 * 1024; // 10MB for CSV, 50MB for JSON
  if (file.size > maxSize) {
    const sizeInMB = Math.round(maxSize / (1024 * 1024));
    return {
      success: false,
      error: `File size too large. Please upload a file smaller than ${sizeInMB}MB`
    };
  }
  
  return {
    success: true,
    fileType: isCSV ? FileTypes.CSV : FileTypes.JSON
  };
};

/**
 * Parses a date from a filename with embedded date format
 * @param {string} filename - The filename to parse
 * @returns {Date|null} The extracted date or null if not found
 */
export const parseDateFromFilename = (filename) => {
  if (!filename) return null;
  
  // Match format with hyphens: YYYY-MM-DD-HHMMSS
  const dateMatch = filename.match(/(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(\d{2})/);
  if (dateMatch) {
    const [_, year, month, day, hours, minutes, seconds] = dateMatch;
    const date = new Date(year, month-1, day, hours, minutes, seconds);
    
    // Validate the date
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date parsed from filename: ${filename}`);
      return null;
    }
    
    return date;
  }
  
  // Try to match format: accountNameYYYYMMDDHHMMSS.csv
  const altDateMatch = filename.match(/.*?(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\.csv$/i);
  if (altDateMatch) {
    const [_, year, month, day, hours, minutes, seconds] = altDateMatch;
    const date = new Date(year, month-1, day, hours, minutes, seconds);
    
    // Validate the date
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date parsed from filename: ${filename}`);
      return null;
    }
    
    return date;
  }
  
  return null;
};

/**
 * Extracts account name from filename
 * @param {string} filename - The filename to parse
 * @returns {string} The extracted account name
 */
export const getAccountNameFromFilename = (filename) => {
  // Pattern for files with hyphens: AccountType_AccountName-Positions-Date.csv
  const match = filename.match(/^([^-]+)-Positions/);
  if (match) {
    return match[1].replace(/_/g, ' ');
  }

  // Pattern for files with underscores: AccountType_Account_Name_AccountNumber_Transactions_Date.csv
  const matchTransactions = filename.match(/^(.+)_[^_]+_Transactions/);
  if (matchTransactions) {
    return matchTransactions[1].replace(/_/g, ' ');
  }

  // Fallback pattern
  const fallbackMatch = filename.match(/^([^_]+_[^_]+)_?Positions/);
  if (fallbackMatch) {
    return fallbackMatch[1].replace(/_/g, ' ');
  }
  
  // Pattern: AccountType_AccountName_Positions_Date.csv
  const altMatch = filename.match(/^([^_]+_[^_]+)_Positions/);
  if (altMatch) {
    return altMatch[1];
  }
  
  return 'Unknown Account';
};

/**
 * Generates CSV data for export
 * @param {Array} data - The data to export
 * @param {Array} headers - Column headers
 * @param {string} filename - Output filename
 */
export const generateAndDownloadCSV = (data, headers, filename) => {
  const csvData = data.map(position => 
    headers.map(header => position[header])
  );
  
  const csv = [
    headers.join(','),
    ...csvData.map(row => row.map(cell => 
      typeof cell === 'string' && cell.includes(',') 
        ? `"${cell}"`
        : cell
    ).join(','))
  ].join('\n');
  
  downloadFile(csv, filename, 'text/csv');
};

/**
 * Creates a Blob and initiates download
 * @param {string} content - File content
 * @param {string} filename - Filename for download
 * @param {string} mimeType - MIME type of the file
 */
export const downloadFile = (content, filename, mimeType = 'text/plain') => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Reads a file as text
 * @param {File} file - File to read
 * @returns {Promise<string>} File content as text
 */
export const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('Error reading file'));
    reader.readAsText(file);
  });
};
