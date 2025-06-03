// utils/fileProcessing.js revision: 1

import Papa from 'papaparse';
import { debugLog } from './debugConfig';

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
  console.log('Raw column headers:', columnHeaders);
  
  const headerMap = {};
  
  columnHeaders.forEach((header, index) => {
    // Normalize and map headers to standard names
    const normalizedHeader = header.replace(/\s+/g, ' ').trim().toLowerCase();
    console.log(`Processing header "${header}" -> normalized: "${normalizedHeader}"`);
    
    // Map different variations to standardized names
    if (normalizedHeader.includes('symbol')) {
      console.log(`Found Symbol header at index ${index}`);
      headerMap['Symbol'] = index;
    } else if (normalizedHeader.includes('quantity') || normalizedHeader.includes('qty')) {
      headerMap['Qty (Quantity)'] = index;
    } else if (normalizedHeader.includes('market value') || normalizedHeader.includes('mkt val') || normalizedHeader.includes('market val')) {
      headerMap['Mkt Val (Market Value)'] = index;
    } else if (normalizedHeader.includes('gain/loss $') || normalizedHeader.includes('gain $')) {
      console.log(`Found Gain/Loss $ header at index ${index}`);
      headerMap['Gain $ (Gain/Loss $)'] = index;
    } else if (normalizedHeader.includes('gain/loss %') || normalizedHeader.includes('gain %')) {
      console.log(`Found Gain/Loss % header at index ${index}`);
      headerMap['Gain % (Gain/Loss %)'] = index;
    } else if (normalizedHeader.includes('% of account') || normalizedHeader.includes('% of acct') || normalizedHeader.includes('% of portfolio')) {
      headerMap['% of Acct (% of Account)'] = index;
    } else if (normalizedHeader.includes('day change') || normalizedHeader.includes('day chng') || normalizedHeader.includes('day change $')) {
      headerMap['Day Chng $ (Day Change $)'] = index;
    } else if (normalizedHeader.includes('day chng %') || normalizedHeader.includes('day change %')) {
      headerMap['Day Chng % (Day Change %)'] = index;
    } else if (normalizedHeader.includes('price change') || normalizedHeader.includes('price chng') || normalizedHeader.includes('price change $')) {
      headerMap['Price Chng $ (Price Change $)'] = index;
    } else if (normalizedHeader.includes('price chng %') || normalizedHeader.includes('price change %')) {
      headerMap['Price Chng % (Price Change %)'] = index;
    } else if (normalizedHeader.includes('reinvest')) {
      headerMap['Reinvest?'] = index;
    } else if (normalizedHeader.includes('description')) {
      headerMap['Description'] = index;
    } else if (normalizedHeader.includes('price')) {
      headerMap['Price'] = index;
    } else if (normalizedHeader.includes('cost basis')) {
      headerMap['Cost Basis'] = index;
    } else {
      headerMap[header] = index;
    }
  });
  
  console.log('Final header mapping:', headerMap);
  
  // Validate required headers
  const requiredHeaders = ['Symbol', 'Qty (Quantity)', 'Mkt Val (Market Value)'];
  const missingHeaders = requiredHeaders.filter(header => headerMap[header] === undefined);
  
  if (missingHeaders.length > 0) {
    console.error('Missing headers:', missingHeaders);
    console.error('Available headers:', Object.keys(headerMap));
    throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
  }
  
  // Validate gain/loss headers
  if (headerMap['Gain $ (Gain/Loss $)'] === undefined) {
    console.warn('Gain/Loss $ header not found in CSV');
  }
  if (headerMap['Gain % (Gain/Loss %)'] === undefined) {
    console.warn('Gain/Loss % header not found in CSV');
  }
  
  return headerMap;
};

/**
 * Extracts date from account info text
 * @param {string} accountInfo - The account info text
 * @returns {Date|null} The extracted date or null
 */
export const extractDateFromAccountInfo = (accountInfo) => {
  if (!accountInfo) return null;
  
  // Try multiple date formats
  const dateFormats = [
    // Format: "as of 06:40 PM ET, 2025/04/27"
    /as of (\d+:\d+ [AP]M) ET, (\d{4})\/(\d{2})\/(\d{2})/,
    // Format: "as of 06:40 PM ET, 04/27/2025"
    /as of (\d+:\d+ [AP]M) ET, (\d{2})\/(\d{2})\/(\d{4})/,
    // Format: "as of 2025-04-27 18:40:00"
    /as of (\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/,
    // Format: "as of 04/27/2025"
    /as of (\d{2})\/(\d{2})\/(\d{4})/,
    // Format: "as of 2025/04/27"
    /as of (\d{4})\/(\d{2})\/(\d{2})/
  ];
  
  for (const format of dateFormats) {
    const match = accountInfo.match(format);
    if (match) {
      try {
        let date;
        if (format === dateFormats[0]) {
          // Format: "as of 06:40 PM ET, 2025/04/27"
          const [_, timeStr, year, month, day] = match;
          const [hourMin, ampm] = timeStr.split(' ');
          let [hours, minutes] = hourMin.split(':').map(Number);
          if (ampm === 'PM' && hours < 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;
          date = new Date(year, month - 1, day, hours, minutes);
        } else if (format === dateFormats[1]) {
          // Format: "as of 06:40 PM ET, 04/27/2025"
          const [_, timeStr, month, day, year] = match;
          const [hourMin, ampm] = timeStr.split(' ');
          let [hours, minutes] = hourMin.split(':').map(Number);
          if (ampm === 'PM' && hours < 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;
          date = new Date(year, month - 1, day, hours, minutes);
        } else if (format === dateFormats[2]) {
          // Format: "as of 2025-04-27 18:40:00"
          const [_, year, month, day, hours, minutes] = match;
          date = new Date(year, month - 1, day, hours, minutes);
        } else if (format === dateFormats[3]) {
          // Format: "as of 04/27/2025"
          const [_, month, day, year] = match;
          date = new Date(year, month - 1, day);
        } else if (format === dateFormats[4]) {
          // Format: "as of 2025/04/27"
          const [_, year, month, day] = match;
          date = new Date(year, month - 1, day);
        }
        
        if (date && !isNaN(date.getTime())) {
          return date;
        }
      } catch (error) {
        console.warn(`Error parsing date from format ${format}:`, error);
        continue;
      }
    }
  }
  
  return null;
};

/**
 * Extracts account name from CSV content
 * @param {string} fileContent - The CSV file content
 * @returns {string|null} The extracted account name or null if not found
 */
export const extractAccountNameFromCSV = (fileContent) => {
  if (!fileContent) return null;
  
  const lines = fileContent.split('\n');
  if (lines.length === 0) return null;
  
  // Look for account name in the first line
  const firstLine = lines[0];
  
  // Try different patterns for account name extraction
  const patterns = [
    // Pattern 1: "Positions for account Roth Contributory IRA ...348 as of"
    /Positions for account (.*?) as of/,
    // Pattern 2: "Positions for Roth Contributory IRA ...348 as of"
    /Positions for (.*?) as of/,
    // Pattern 3: "Account: Roth Contributory IRA ...348"
    /Account:?\s*(.*?)(?:\s*$|\s*as of)/,
    // Pattern 4: "Roth Contributory IRA ...348 Positions"
    /^(.*?)(?:\s+Positions|\s+as of)/,
    // Pattern 5: "Roth Contributory IRA XXX348"
    /^(.*?)(?:\s+XXX\d+|\s+\.{3}\d+)/,
    // Pattern 6: "Roth Contributory IRA 348"
    /^(.*?)(?:\s+\d+)(?:\s+Positions|\s+as of)?/
  ];
  
  for (const pattern of patterns) {
    const match = firstLine.match(pattern);
    if (match && match[1]) {
      const accountName = normalizeAccountName(match[1]);
      console.log('Extracted account name from CSV:', accountName);
      return accountName;
    }
  }
  
  // If no pattern matches, try to extract from the filename
  const filenameMatch = firstLine.match(/^([^,]+)/);
  if (filenameMatch && filenameMatch[1]) {
    const accountName = normalizeAccountName(filenameMatch[1]);
    console.log('Extracted account name from filename:', accountName);
    return accountName;
  }
  
  console.warn('Could not extract account name from CSV content');
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
    debugLog('files', 'parsing', 'First few lines of file:', lines.slice(0, 5));
    
    // Check if we have enough lines
    if (lines.length < 3) {
      throw new Error('File does not contain enough data');
    }
    
    // Extract date from the first row
    let portfolioDate = extractDateFromAccountInfo(lines[0]);
    debugLog('files', 'parsing', 'Extracted portfolio date:', portfolioDate);
    
    // Extract account name from CSV content
    const csvAccountName = extractAccountNameFromCSV(fileContent);
    debugLog('files', 'parsing', 'Extracted account name from CSV:', csvAccountName);
    
    // If first line doesn't have date info, it might be in a different format
    if (!portfolioDate) {
      // Try to parse from filename format in the first line
      const dateMatch = lines[0].match(/as of (.*?)[,"]/);
      if (dateMatch) {
        portfolioDate = new Date(dateMatch[1]);
        debugLog('files', 'parsing', 'Parsed date from filename format:', portfolioDate);
      }
    }
    
    // Find the header row - it contains "Symbol" and has many commas
    let headerRowIndex = -1;
    let columnHeaders = [];
    
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const possibleHeaderLine = lines[i];
      debugLog('files', 'parsing', `Checking line ${i} for headers:`, possibleHeaderLine);
      
      if (possibleHeaderLine.includes('"Symbol"') || possibleHeaderLine.includes('Symbol')) {
        headerRowIndex = i;
        debugLog('files', 'parsing', `Found header row at index ${i}`);
        
        // Parse the header line with Papa Parse
        const parsed = Papa.parse(possibleHeaderLine, {
          delimiter: ",",
          quoteChar: '"',
          skipEmptyLines: true
        });
        
        if (parsed.data && parsed.data[0]) {
          columnHeaders = parsed.data[0].map(header => header.trim());
          debugLog('files', 'parsing', 'Parsed column headers:', columnHeaders);
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
    let totalValue = 0;
    let totalGain = 0;
    
    for (let i = headerRowIndex + 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      try {
        const parsed = Papa.parse(lines[i], {
          delimiter: ",",
          quoteChar: '"',
          skipEmptyLines: true
        });
        
        if (!parsed.data || !parsed.data[0]) continue;
        
        const row = parsed.data[0];
        
        // Create mapped object using header mapping
        const mappedRow = {};
        
        // Use standardized header names
        Object.entries(headerMap).forEach(([standardHeader, idx]) => {
          if (idx < row.length) {
            mappedRow[standardHeader] = parseFieldValue(row[idx]);
          }
        });
        
        // Skip rows without a symbol
        if (!mappedRow.Symbol) continue;
        
        // Check if this is the account total row
        if ((mappedRow.Symbol === 'Account Total' || mappedRow.Description === 'Account Total' || 
             mappedRow.Symbol === 'Total' || mappedRow.Description === 'Total') &&
            mappedRow['Mkt Val (Market Value)']) {
          accountTotal = {
            totalValue: mappedRow['Mkt Val (Market Value)'] || 0,
            totalGain: mappedRow['Gain $ (Gain/Loss $)'] || 0,
            gainPercent: mappedRow['Gain % (Gain/Loss %)'] || 0
          };
        }
        
        // Only include valid positions
        if (mappedRow.Symbol !== 'Cash & Cash Investments' && 
            mappedRow.Symbol !== 'Account Total' &&
            mappedRow.Symbol !== 'Cash and Money Market' &&
            mappedRow.Symbol !== 'Total' &&
            mappedRow['Mkt Val (Market Value)']) {  // Only include rows with market value
          // Ensure all required fields are present and valid
          if (!mappedRow['Qty (Quantity)'] || isNaN(mappedRow['Qty (Quantity)'])) {
            mappedRow['Qty (Quantity)'] = 0;
          }
          if (!mappedRow['Price'] || isNaN(mappedRow['Price'])) {
            mappedRow['Price'] = 0;
          }
          if (!mappedRow['Cost Basis'] || isNaN(mappedRow['Cost Basis'])) {
            mappedRow['Cost Basis'] = 0;
          }

          // Validate gain/loss dollar value
          const gainLossDollar = parseFloat(mappedRow['Gain $ (Gain/Loss $)']);
          if (isNaN(gainLossDollar)) {
            debugLog('files', 'validation', `Invalid gain/loss dollar value for ${mappedRow.Symbol}:`, mappedRow['Gain $ (Gain/Loss $)']);
            mappedRow['Gain $ (Gain/Loss $)'] = 0;
          } else {
            mappedRow['Gain $ (Gain/Loss $)'] = gainLossDollar;
          }

          // Validate gain/loss percentage value
          const gainLossPercent = parseFloat(mappedRow['Gain % (Gain/Loss %)']);
          if (isNaN(gainLossPercent) || gainLossPercent < -100 || gainLossPercent > 100) {
            debugLog('files', 'validation', `Invalid gain/loss percentage value for ${mappedRow.Symbol}:`, mappedRow['Gain % (Gain/Loss %)']);
            mappedRow['Gain % (Gain/Loss %)'] = 0;
          } else {
            mappedRow['Gain % (Gain/Loss %)'] = gainLossPercent;
          }

          // Calculate expected gain/loss percentage for validation
          const calculatedGainLossPercent = mappedRow['Cost Basis'] > 0 ? 
            (mappedRow['Gain $ (Gain/Loss $)'] / mappedRow['Cost Basis']) * 100 : 0;

          // Log validation results
          debugLog('files', 'validation', `Validating position ${mappedRow.Symbol}:`, {
            symbol: mappedRow.Symbol,
            rawGainLossDollar: mappedRow['Gain $ (Gain/Loss $)'],
            rawGainLossPercent: mappedRow['Gain % (Gain/Loss %)'],
            costBasis: mappedRow['Cost Basis'],
            marketValue: mappedRow['Mkt Val (Market Value)'],
            calculatedGainLossPercent,
            validation: {
              dollarValueValid: !isNaN(gainLossDollar),
              percentValueValid: !isNaN(gainLossPercent) && gainLossPercent >= -100 && gainLossPercent <= 100,
              calculatedPercentMatches: Math.abs(calculatedGainLossPercent - gainLossPercent) < 0.01
            }
          });
          
          // Add to totals
          totalValue += mappedRow['Mkt Val (Market Value)'] || 0;
          totalGain += mappedRow['Gain $ (Gain/Loss $)'] || 0;
          
          if (portfolioData.length === 0) {
            debugLog('files', 'parsing', 'First position parsed:', {
              symbol: mappedRow.Symbol,
              marketValue: mappedRow['Mkt Val (Market Value)'],
              marketValueType: typeof mappedRow['Mkt Val (Market Value)'],
              gainLossDollar: mappedRow['Gain $ (Gain/Loss $)'],
              gainLossPercent: mappedRow['Gain % (Gain/Loss %)'],
              costBasis: mappedRow['Cost Basis'],
              calculatedGainLossPercent: mappedRow['Cost Basis'] > 0 ? 
                (mappedRow['Gain $ (Gain/Loss $)'] / mappedRow['Cost Basis']) * 100 : 0,
              rawRow: row,
              mappedRow
            });
          }
          
          // Log gain/loss calculations for each position
          debugLog('files', 'calculations', `Parsing position ${portfolioData.length + 1} (${mappedRow.Symbol}):`, {
            symbol: mappedRow.Symbol,
            gainLossDollar: mappedRow['Gain $ (Gain/Loss $)'],
            gainLossPercent: mappedRow['Gain % (Gain/Loss %)'],
            costBasis: mappedRow['Cost Basis'],
            marketValue: mappedRow['Mkt Val (Market Value)'],
            calculatedGainLossPercent: mappedRow['Cost Basis'] > 0 ? 
              (mappedRow['Gain $ (Gain/Loss $)'] / mappedRow['Cost Basis']) * 100 : 0
          });
          
          portfolioData.push(mappedRow);
        }
      } catch (rowError) {
        debugLog('files', 'errors', `Error parsing row ${i}:`, rowError.message);
        continue;
      }
    }
    
    if (portfolioData.length === 0) {
      throw new Error('No valid portfolio data found in the file');
    }
    
    // If no account total was found, calculate it from the positions
    if (!accountTotal) {
      accountTotal = {
        totalValue,
        totalGain,
        gainPercent: totalValue > 0 ? (totalGain / totalValue) * 100 : 0
      };
    }
    
    debugLog('files', 'summary', 'Processed portfolio data:', {
      positions: portfolioData.length,
      accountTotal,
      samplePosition: portfolioData[0]
    });
    
    return { portfolioData, portfolioDate, accountTotal };
  } catch (error) {
    debugLog('files', 'errors', 'Error parsing CSV:', error);
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

  // Debug to console
  console.log(`Attempting to parse date from filename: ${filename}`);
  
  // First attempt: Match format with hyphens: YYYY-MM-DD-HHMMSS
  const dateWithHyphensMatch = filename.match(/(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(\d{2})/);
  if (dateWithHyphensMatch) {
    const [_, year, month, day, hours, minutes, seconds] = dateWithHyphensMatch;
    const date = new Date(year, month-1, day, hours, minutes, seconds);
    
    // Validate the date
    if (!isNaN(date.getTime())) {
      console.log(`Successfully parsed date with hyphens from filename: ${filename}, date: ${date}`);
      return date;
    }
  }
  
  // Second attempt: Try to match format with different pattern: Positions-YYYY-MM-DD-HHMMSS
  const positionsDateMatch = filename.match(/Positions-(\d{4})-(\d{2})-(\d{2})-(\d{6})/);
  if (positionsDateMatch) {
    const [_, year, month, day, timeStr] = positionsDateMatch;
    const hours = timeStr.substring(0, 2);
    const minutes = timeStr.substring(2, 4);
    const seconds = timeStr.substring(4, 6);
    
    const date = new Date(year, month-1, day, hours, minutes, seconds);
    
    // Validate the date
    if (!isNaN(date.getTime())) {
      console.log(`Successfully parsed date from Positions pattern: ${filename}, date: ${date}`);
      return date;
    }
  }
  
  // Third attempt: Try to match format: accountNameYYYYMMDDHHMMSS.csv
  const dateNoSeparatorsMatch = filename.match(/.*?(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\.csv$/i);
  if (dateNoSeparatorsMatch) {
    const [_, year, month, day, hours, minutes, seconds] = dateNoSeparatorsMatch;
    const date = new Date(year, month-1, day, hours, minutes, seconds);
    
    // Validate the date
    if (!isNaN(date.getTime())) {
      console.log(`Successfully parsed date without separators from filename: ${filename}, date: ${date}`);
      return date;
    }
  }
  
  // Fourth attempt (for your specific case): Match IRA-Positions-YYYY-MM-DD-HHMMSS
  const iraPositionsMatch = filename.match(/IRA-Positions-(\d{4})-(\d{2})-(\d{2})-(\d{6})/);
  if (iraPositionsMatch) {
    const [_, year, month, day, timeStr] = iraPositionsMatch;
    const hours = timeStr.substring(0, 2);
    const minutes = timeStr.substring(2, 4);
    const seconds = timeStr.substring(4, 6);
    
    const date = new Date(year, month-1, day, hours, minutes, seconds);
    
    // Validate the date
    if (!isNaN(date.getTime())) {
      console.log(`Successfully parsed date from IRA-Positions pattern: ${filename}, date: ${date}`);
      return date;
    }
  }
  
  console.warn(`Could not parse any date from filename: ${filename}`);
  return null;
};

/**
 * Normalizes an account name by standardizing format while preserving account numbers
 * @param {string} accountName - The account name to normalize
 * @returns {string} The normalized account name
 */
export const normalizeAccountName = (accountName) => {
  if (!accountName) return '';
  
  return accountName
    // Replace underscores and hyphens with spaces
    .replace(/[_-]/g, ' ')
    // Standardize account number format (convert ...348 or XXX348 to 348)
    .replace(/\.{3}(\d+)/g, '$1')
    .replace(/XXX(\d+)/g, '$1')
    // Remove special characters but keep spaces, numbers, and common account-related characters
    .replace(/[^a-zA-Z0-9\s&()\-\.]/g, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Ensure consistent spacing around numbers
    .replace(/(\d+)/g, ' $1 ')
    .trim()
    // Remove extra spaces again after number formatting
    .replace(/\s+/g, ' ')
    // Ensure consistent casing
    .split(' ')
    .map(word => {
      // Keep common acronyms uppercase
      if (['IRA', 'Roth', '401k', '403b', 'HSA'].includes(word.toUpperCase())) {
        return word.toUpperCase();
      }
      // Capitalize first letter of each word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * Extracts account name from filename
 * @param {string} filename - The filename to parse
 * @returns {string} The extracted account name
 */
export const getAccountNameFromFilename = (filename) => {
  console.log('Attempting to extract account name from filename:', filename);
  
  if (!filename) {
    console.warn('No filename provided');
    return `Account ${new Date().toISOString().split('T')[0]}`;
  }
  
  // Remove file extension first
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  
  // Pattern 1: Files with hyphens: AccountType-AccountName-Positions-Date.csv
  const hyphenMatch = nameWithoutExt.match(/^([^-]+(?:-[^-]+)*)-(?:Positions|Transactions)/);
  if (hyphenMatch) {
    const accountName = normalizeAccountName(hyphenMatch[1]);
    console.log('Matched hyphen pattern:', accountName);
    return accountName;
  }

  // Pattern 2: Files with underscores: AccountType_AccountName_Positions_Date.csv
  const underscoreMatch = nameWithoutExt.match(/^([^_]+(?:_[^_]+)*?)_(?:Positions|Transactions)/);
  if (underscoreMatch) {
    const accountName = normalizeAccountName(underscoreMatch[1]);
    console.log('Matched underscore pattern:', accountName);
    return accountName;
  }

  // Pattern 3: Files with date embedded: AccountName20240327123456.csv
  const dateMatch = nameWithoutExt.match(/^(.+?)(?:\d{14}|\d{8})/);
  if (dateMatch) {
    const accountName = normalizeAccountName(dateMatch[1]);
    console.log('Matched date pattern:', accountName);
    return accountName;
  }

  // Pattern 4: Simple filename without special formatting
  const simpleMatch = nameWithoutExt.match(/^([^_\-]+)/);
  if (simpleMatch) {
    const accountName = normalizeAccountName(simpleMatch[1]);
    console.log('Matched simple pattern:', accountName);
    return accountName;
  }

  // If no patterns match, use a default with timestamp
  const defaultName = `Account ${new Date().toISOString().split('T')[0]}`;
  console.warn('No account name pattern matched. Using default:', defaultName);
  return defaultName;
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

/**
 * Finds similar account names from a list of existing accounts
 * @param {string} newAccountName - The new account name to check
 * @param {Array<string>} existingAccounts - List of existing account names
 * @returns {Array<string>} Array of similar account names
 */
export const findSimilarAccountNames = (newAccountName, existingAccounts) => {
  if (!newAccountName || !existingAccounts || !existingAccounts.length) return [];
  
  // Extract core account name and number
  const extractCoreInfo = (name) => {
    // First, normalize the name
    const cleaned = name
      .replace(/\.{3}/g, '') // Remove ...
      .replace(/XXX/g, '')   // Remove XXX
      .replace(/[_-]/g, ' ') // Replace _ and - with spaces
      .replace(/\s+/g, ' ')  // Normalize spaces
      .trim();
    
    // Try different patterns to extract account number
    let accountNumber = null;
    
    // Pattern 1: Look for numbers at the end of the string
    const endNumberMatch = cleaned.match(/(\d+)(?:\s*$)/);
    if (endNumberMatch) {
      accountNumber = endNumberMatch[1];
    }
    
    // Pattern 2: Look for numbers after common account type words
    if (!accountNumber) {
      const typeNumberMatch = cleaned.match(/(?:IRA|401k|403b|HSA)\s*(\d+)/i);
      if (typeNumberMatch) {
        accountNumber = typeNumberMatch[1];
      }
    }
    
    // Pattern 3: Look for any 3+ digit number
    if (!accountNumber) {
      const anyNumberMatch = cleaned.match(/(\d{3,})/);
      if (anyNumberMatch) {
        accountNumber = anyNumberMatch[1];
      }
    }
    
    // Get base name without number
    const baseName = cleaned
      .replace(/\d+/g, '') // Remove all numbers
      .replace(/\s+/g, ' ') // Normalize spaces again
      .trim();
    
    return { baseName, accountNumber };
  };
  
  const newInfo = extractCoreInfo(newAccountName);
  console.log('New account info:', newInfo);
  
  // First try exact match
  const exactMatch = existingAccounts.find(name => 
    normalizeAccountName(name) === normalizeAccountName(newAccountName)
  );
  if (exactMatch) {
    console.log('Found exact match:', exactMatch);
    return [exactMatch];
  }
  
  // If no exact match, try matching with account numbers
  const matches = existingAccounts.filter(existingName => {
    const existingInfo = extractCoreInfo(existingName);
    console.log('Comparing with:', existingInfo);
    
    // Must have matching base names
    if (existingInfo.baseName !== newInfo.baseName) {
      return false;
    }
    
    // If both have account numbers, they must match
    if (existingInfo.accountNumber && newInfo.accountNumber) {
      return existingInfo.accountNumber === newInfo.accountNumber;
    }
    
    // If only one has an account number, it's not a match
    if (existingInfo.accountNumber || newInfo.accountNumber) {
      return false;
    }
    
    // If neither has an account number, it's a match
    return true;
  });
  
  console.log('Found matches:', matches);
  return matches;
};
