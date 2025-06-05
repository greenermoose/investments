// utils/parseSnapshot.js
// Handles parsing of portfolio snapshot CSV files into normalized data structures

import { debugLog } from './debugConfig';

/**
 * Parse portfolio data from CSV content
 * @param {string} content - Raw CSV content
 * @returns {Object} Parsed portfolio data
 */
export const parsePortfolioCSV = (content) => {
  debugLog('parseSnapshot', 'start', 'Starting CSV parsing', {
    contentLength: content.length,
    firstFewLines: content.split('\n').slice(0, 3).join('\n')
  });

  try {
    // Split content into lines and filter out empty lines
    const lines = content.split('\n').filter(line => line.trim());
    debugLog('parseSnapshot', 'lines', 'Split content into lines', {
      totalLines: lines.length,
      firstFewLines: lines.slice(0, 3)
    });

    // Check if this is a JSON-like format
    const isJsonFormat = lines[0]?.trim().startsWith('{');
    debugLog('parseSnapshot', 'format', 'Detected format', {
      isJsonFormat,
      firstLine: lines[0]
    });

    let positions = [];
    if (isJsonFormat) {
      // Process JSON-like format
      positions = lines
        .filter(line => {
          const trimmed = line.trim();
          return trimmed && 
                 !trimmed.includes('Account Total') && 
                 !trimmed.includes('Cash & Cash Investments');
        })
        .map(line => {
          try {
            debugLog('parseSnapshot', 'parse', 'Processing JSON line', {
              rawLine: line
            });

            // Parse the line as a JSON object
            const positionData = JSON.parse(line);
            const key = Object.keys(positionData)[0];
            const value = positionData[key];
            
            // Extract symbol from the key using regex
            const symbolMatch = key.match(/'([^']+)'/);
            if (!symbolMatch) {
              debugLog('parseSnapshot', 'error', 'Failed to extract symbol', {
                key,
                regexResult: key.match(/'([^']+)'/),
                fullLine: line
              });
              return null;
            }
            
            const symbol = symbolMatch[1];
            
            // Extract additional data from the key if available
            const keyParts = key.split(',');
            const dateMatch = keyParts[1]?.trim().match(/(\d{2}\/\d{2}\/\d{4})/);
            const date = dateMatch ? new Date(dateMatch[1]) : null;

            // Create position object with the correct field names
            return {
              Symbol: symbol,
              Description: value.replace(/^"|"$/g, ''),
              'Qty (Quantity)': 0,
              Price: 0,
              'Mkt Val (Market Value)': 0,
              'Cost Basis': 0,
              'Gain $ (Gain/Loss $)': 0,
              'Gain % (Gain/Loss %)': 0,
              'Position Date': date,
              'Security Type': 'Unknown'
            };
          } catch (error) {
            debugLog('parseSnapshot', 'error', 'Error parsing JSON position', {
              error: error.message,
              line,
              stack: error.stack
            });
            return null;
          }
        })
        .filter(Boolean);
    } else {
      // Process standard CSV format
      // Skip the account header line if present
      const startIndex = lines[0].includes('Positions for account') ? 1 : 0;
      const headers = lines[startIndex].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      
      // Normalize headers to standard format
      const normalizedHeaders = headers.map(header => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('symbol')) return 'Symbol';
        if (lowerHeader.includes('description')) return 'Description';
        if (lowerHeader.includes('quantity') || lowerHeader.includes('qty')) return 'Qty (Quantity)';
        if (lowerHeader.includes('price')) return 'Price';
        if (lowerHeader.includes('market value') || lowerHeader.includes('mkt val')) return 'Mkt Val (Market Value)';
        if (lowerHeader.includes('cost basis')) return 'Cost Basis';
        if (lowerHeader.includes('gain/loss') || lowerHeader.includes('gain loss')) {
          if (lowerHeader.includes('%')) return 'Gain % (Gain/Loss %)';
          return 'Gain $ (Gain/Loss $)';
        }
        if (lowerHeader.includes('type')) return 'Security Type';
        return header;
      });

      // Process data rows
      positions = lines.slice(startIndex + 1)
        .filter(line => {
          const trimmed = line.trim();
          return trimmed && 
                 !trimmed.includes('Account Total') && 
                 !trimmed.includes('Cash & Cash Investments');
        })
        .map(line => {
          // Split by comma but respect quoted fields
          const values = [];
          let currentValue = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(currentValue.trim().replace(/^"|"$/g, ''));
              currentValue = '';
            } else {
              currentValue += char;
            }
          }
          values.push(currentValue.trim().replace(/^"|"$/g, ''));

          const position = {};
          normalizedHeaders.forEach((header, index) => {
            position[header] = values[index] || '';
          });
          return position;
        });
    }

    debugLog('parseSnapshot', 'complete', 'CSV parsing complete', {
      totalPositions: positions.length,
      totalLines: lines.length,
      firstPosition: positions[0],
      lastPosition: positions[positions.length - 1]
    });

    return {
      success: true,
      positions,
      headers: ['Symbol', 'Description', 'Qty (Quantity)', 'Price', 'Mkt Val (Market Value)', 'Cost Basis', 'Gain $ (Gain/Loss $)', 'Gain % (Gain/Loss %)', 'Security Type'],
      totals: {
        totalValue: positions.reduce((sum, pos) => sum + (parseFloat(pos['Mkt Val (Market Value)']) || 0), 0),
        totalGain: positions.reduce((sum, pos) => sum + (parseFloat(pos['Gain $ (Gain/Loss $)']) || 0), 0)
      }
    };
  } catch (error) {
    debugLog('parseSnapshot', 'error', 'Error parsing CSV', {
      error: error.message,
      stack: error.stack,
      contentLength: content.length,
      firstFewLines: content.split('\n').slice(0, 3).join('\n')
    });
    return {
      success: false,
      error: error.message
    };
  }
}; 