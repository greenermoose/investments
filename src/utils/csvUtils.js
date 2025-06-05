// utils/csvUtils.js
// Handles CSV generation and download functionality

import { debugLog } from './debugConfig';

/**
 * Generate CSV content from data array
 * @param {Array<Object>} data - Array of objects to convert to CSV
 * @param {Array<string>} headers - Array of header names
 * @returns {string} CSV content
 */
export const generateCSVContent = (data, headers) => {
  debugLog('csv', 'generate', 'Generating CSV content', {
    rowCount: data.length,
    headers
  });

  try {
    // Create header row
    const headerRow = headers.join(',');
    
    // Create data rows
    const rows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        // Handle special cases
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
        return value;
      }).join(',');
    });

    // Combine header and data rows
    const csvContent = [headerRow, ...rows].join('\n');
    
    debugLog('csv', 'generate', 'CSV content generated', {
      contentLength: csvContent.length,
      rowCount: rows.length
    });

    return csvContent;
  } catch (error) {
    debugLog('csv', 'error', 'Error generating CSV content', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Generate and download CSV file
 * @param {Array<Object>} data - Array of objects to convert to CSV
 * @param {Array<string>} headers - Array of header names
 * @param {string} filename - Name of the file to download
 */
export const generateAndDownloadCSV = (data, headers, filename) => {
  debugLog('csv', 'download', 'Generating and downloading CSV', {
    filename,
    rowCount: data.length,
    headers
  });

  try {
    // Generate CSV content
    const csvContent = generateCSVContent(data, headers);
    
    // Create blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    // Set up download
    if (navigator.msSaveBlob) { // IE10+
      navigator.msSaveBlob(blob, filename);
    } else {
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    debugLog('csv', 'download', 'CSV download initiated', { filename });
  } catch (error) {
    debugLog('csv', 'error', 'Error downloading CSV', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Generate CSV content for portfolio positions
 * @param {Array<Object>} positions - Array of position objects
 * @returns {string} CSV content
 */
export const generatePortfolioCSV = (positions) => {
  debugLog('csv', 'portfolio', 'Generating portfolio CSV', {
    positionCount: positions.length
  });

  const headers = [
    'Symbol',
    'Description',
    'Quantity',
    'Price',
    'Market Value',
    'Cost Basis',
    'Gain/Loss',
    'Gain/Loss %'
  ];

  return generateCSVContent(positions, headers);
};

/**
 * Generate CSV content for transactions
 * @param {Array<Object>} transactions - Array of transaction objects
 * @returns {string} CSV content
 */
export const generateTransactionsCSV = (transactions) => {
  debugLog('csv', 'transactions', 'Generating transactions CSV', {
    transactionCount: transactions.length
  });

  const headers = [
    'Date',
    'Symbol',
    'Type',
    'Quantity',
    'Price',
    'Amount',
    'Description'
  ];

  return generateCSVContent(transactions, headers);
}; 