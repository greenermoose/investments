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
 * Robustly parses a portfolio snapshot CSV into a list of securities with canonical fields.
 * Handles header variations, missing/extra columns, and both per-share and total cost basis.
 *
 * @param {string} fileContent - The raw CSV file content
 * @returns {Object} { success, data, errors }
 */
export const parsePortfolioCSV = (fileContent) => {
  const errors = [];
  try {
    if (!fileContent || fileContent.trim().length === 0) {
      throw new Error('File is empty');
    }
    // Split into lines and find the header row
    const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);
    let headerRowIndex = -1;
    let headers = [];
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i];
      if (/symbol/i.test(line) && /desc/i.test(line)) {
        headerRowIndex = i;
        headers = Papa.parse(line, { delimiter: ',', skipEmptyLines: true }).data[0].map(h => h.trim());
        break;
      }
    }
    if (headerRowIndex === -1) {
      throw new Error('Could not find header row with Symbol and Description');
    }
    // Map headers to canonical fields
    const headerMap = {};
    headers.forEach((h, idx) => {
      const norm = h.toLowerCase();
      if (/symbol/.test(norm)) headerMap.symbol = idx;
      else if (/desc/.test(norm)) headerMap.description = idx;
      else if (/qty|quantity/.test(norm)) headerMap.quantity = idx;
      else if (/price(?!.*change)/.test(norm)) headerMap.price = idx;
      else if (/cost.*share|cost\/share/.test(norm)) headerMap.costPerShare = idx;
      else if (/cost basis/.test(norm)) headerMap.costBasis = idx;
      else if (/market value|mkt val/.test(norm)) headerMap.marketValue = idx;
      else if (/security type|type/.test(norm)) headerMap.type = idx;
    });
    // Parse data rows
    const data = [];
    for (let i = headerRowIndex + 1; i < lines.length; i++) {
      const row = Papa.parse(lines[i], { delimiter: ',', skipEmptyLines: false }).data[0];
      if (!row || row.length < 2) continue;
      // Skip summary/cash rows
      const symbol = (row[headerMap.symbol] || '').toString().trim();
      if (!symbol || /account total|cash/i.test(symbol)) continue;
      // Parse fields
      const description = (row[headerMap.description] || '').toString().trim();
      const quantity = parseFloat((row[headerMap.quantity] || '').replace(/,/g, '')) || 0;
      let price = row[headerMap.price];
      price = typeof price === 'string' ? parseFloat(price.replace(/[^\d.\-]/g, '')) : Number(price) || 0;
      // Cost basis per share
      let costBasis = 0;
      if (headerMap.costPerShare !== undefined && row[headerMap.costPerShare]) {
        costBasis = parseFloat((row[headerMap.costPerShare] || '').replace(/[^\d.\-]/g, '')) || 0;
      } else if (headerMap.costBasis !== undefined && row[headerMap.costBasis]) {
        // If cost basis is total, divide by quantity
        let totalCost = parseFloat((row[headerMap.costBasis] || '').replace(/[^\d.\-]/g, '')) || 0;
        costBasis = quantity > 0 ? totalCost / quantity : 0;
      }
      // Type
      let type = row[headerMap.type] || '';
      type = typeof type === 'string' ? type.trim() : 'Unknown';
      // Only include valid securities
      if (symbol && quantity !== 0 && price !== 0) {
        data.push({
          Symbol: symbol,
          Description: description,
          'Qty (Quantity)': quantity,
          Price: price,
          'Cost Basis': costBasis,
          'Security Type': type || 'Unknown',
          'Mkt Val (Market Value)': quantity * price
        });
      } else {
        // Log or collect errors for rows that don't parse
        errors.push({ line: i + 1, symbol, description, reason: 'Missing or invalid key fields' });
      }
    }
    if (data.length === 0) {
      throw new Error('No valid securities found in file');
    }
    return { success: true, data, errors };
  } catch (e) {
    errors.push({ error: e.message });
    return { success: false, data: [], errors };
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
