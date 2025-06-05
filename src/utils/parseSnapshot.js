// utils/parseSnapshot.js
// Handles parsing of portfolio snapshot CSV files into normalized data structures

import { debugLog } from './debugConfig';

/**
 * Parse portfolio data from CSV content
 * @param {string} content - Raw CSV content
 * @returns {Object} Parsed portfolio data
 */
export const parsePortfolioCSV = (content) => {
  debugLog('pipeline', 'parsing', 'Parsing portfolio CSV', {
    contentLength: content.length,
    firstLine: content.split('\n')[0]
  });

  try {
    // Split content into lines and remove empty lines
    const lines = content.split('\n').filter(line => line.trim());
    
    debugLog('pipeline', 'parsing', 'Split content into lines', {
      totalLines: lines.length,
      firstLine: lines[0],
      secondLine: lines[1]
    });

    // Find the header line by looking for common header patterns
    let headerLineIndex = -1;
    const headerPatterns = [
      /symbol/i,
      /description/i,
      /quantity|qty/i,
      /price/i,
      /market value|mkt val/i,
      /cost basis/i,
      /gain\/loss|gain loss/i
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      const matches = headerPatterns.filter(pattern => pattern.test(line));
      if (matches.length >= 3) { // Require at least 3 matching headers
        headerLineIndex = i;
        break;
      }
    }

    if (headerLineIndex === -1) {
      throw new Error('Could not find header line in CSV file');
    }

    debugLog('pipeline', 'parsing', 'Found header line', {
      headerLineIndex,
      headerLine: lines[headerLineIndex]
    });

    // Extract and normalize headers
    const headers = lines[headerLineIndex].split(',').map(h => {
      const trimmed = h.trim().replace(/^"|"$/g, '');
      // Normalize common header variations
      const lowerHeader = trimmed.toLowerCase();
      if (lowerHeader.includes('symbol')) return 'Symbol';
      if (lowerHeader.includes('description')) return 'Description';
      if (lowerHeader.includes('quantity') || lowerHeader.includes('qty')) return 'Qty (Quantity)';
      if (lowerHeader.includes('price')) return 'Price';
      if (lowerHeader.includes('market value') || lowerHeader.includes('mkt val')) return 'Mkt Val (Market Value)';
      if (lowerHeader.includes('cost basis')) return 'Cost Basis';
      if (lowerHeader.includes('gain/loss') || lowerHeader.includes('gain loss')) {
        return lowerHeader.includes('%') ? 'Gain % (Gain/Loss %)' : 'Gain $ (Gain/Loss $)';
      }
      return trimmed;
    });

    debugLog('pipeline', 'parsing', 'Normalized headers', { headers });

    // Process data rows starting after the header line
    const positions = lines.slice(headerLineIndex + 1)
      .filter(line => {
        const trimmed = line.trim();
        const isValid = trimmed && 
               !trimmed.includes('Account Total') && 
               !trimmed.includes('Cash & Cash Investments');
        
        debugLog('pipeline', 'parsing', 'Filtering line', {
          line: trimmed,
          isValid,
          isAccountTotal: trimmed.includes('Account Total'),
          isCash: trimmed.includes('Cash & Cash Investments')
        });
        
        return isValid;
      })
      .map(line => {
        debugLog('pipeline', 'parsing', 'Processing line', { line });
        
        try {
          // Handle both CSV and JSON-like formats
          let values;
          if (line.includes('":"')) {
            // JSON-like format
            const [key, value] = line.split('":"').map(part => part.replace(/^"|"$/g, ''));
            const symbolMatch = key.match(/'([^']+)'/);
            if (!symbolMatch) {
              debugLog('pipeline', 'parsing', 'No symbol found in key', { key });
              return null;
            }
            values = [symbolMatch[1], value];
          } else {
            // CSV format
            values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          }
          
          debugLog('pipeline', 'parsing', 'Parsed values', { values });
          
          // Create position object with normalized field names
          const position = {
            Symbol: values[0] || '',
            Description: values[1] || '',
            'Qty (Quantity)': parseFloat(values[2]) || 0,
            Price: parseFloat(values[3]) || 0,
            'Mkt Val (Market Value)': parseFloat(values[4]) || 0,
            'Cost Basis': parseFloat(values[5]) || 0,
            'Gain $ (Gain/Loss $)': parseFloat(values[6]) || 0,
            'Gain % (Gain/Loss %)': parseFloat(values[7]) || 0
          };
          
          // Validate position
          if (!position.Symbol || position.Symbol === '--') {
            debugLog('pipeline', 'parsing', 'Invalid position - missing symbol', { position });
            return null;
          }
          
          debugLog('pipeline', 'parsing', 'Created position object', { position });
          return position;
        } catch (error) {
          debugLog('pipeline', 'parsing', 'Error processing line', {
            line,
            error: error.message
          });
          return null;
        }
      })
      .filter(Boolean); // Remove null entries

    debugLog('pipeline', 'parsing', 'Processed positions', {
      positionCount: positions.length,
      samplePosition: positions[0],
      allPositions: positions
    });

    // Calculate totals
    const totals = positions.reduce((acc, position) => {
      acc.totalValue += parseFloat(position['Mkt Val (Market Value)']) || 0;
      acc.totalGain += parseFloat(position['Gain $ (Gain/Loss $)']) || 0;
      return acc;
    }, { totalValue: 0, totalGain: 0 });

    debugLog('pipeline', 'parsing', 'Calculated totals', totals);

    return {
      success: true,
      positions,
      headers: ['Symbol', 'Description', 'Qty (Quantity)', 'Price', 'Mkt Val (Market Value)', 'Cost Basis', 'Gain $ (Gain/Loss $)', 'Gain % (Gain/Loss %)'],
      totals
    };
  } catch (error) {
    debugLog('pipeline', 'error', 'Error parsing portfolio CSV', {
      error: error.message,
      stack: error.stack
    });
    return {
      success: false,
      error: error.message
    };
  }
}; 