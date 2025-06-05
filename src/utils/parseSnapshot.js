// utils/parseSnapshot.js
// Handles parsing of portfolio snapshot CSV files into normalized data structures

import { debugLog } from './debugConfig';

/**
 * Parse portfolio data from CSV content
 * @param {string} content - Raw CSV content
 * @returns {Object} Parsed portfolio data
 */
export const parsePortfolioCSV = (content) => {
  debugLog('file', 'parsing', 'Starting CSV parsing', {
    contentLength: content.length,
    firstFewLines: content.split('\n').slice(0, 3).join('\n')
  });

  try {
    // Split content into lines and filter out empty lines
    const lines = content.split('\n').filter(line => line.trim());
    debugLog('file', 'parsing', 'Split content into lines', {
      totalLines: lines.length,
      firstFewLines: lines.slice(0, 3)
    });

    // Find the header row
    let headerRow = -1;
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
      if (matches.length >= 3) {
        headerRow = i;
        debugLog('file', 'parsing', 'Found header row', {
          lineNumber: i + 1,
          line: lines[i],
          matches: matches.map(m => m.toString()),
          totalLines: lines.length
        });
        break;
      }
    }

    if (headerRow === -1) {
      debugLog('file', 'error', 'No header row found', {
        totalLines: lines.length,
        firstFewLines: lines.slice(0, 3),
        contentLength: content.length
      });
      return {
        success: false,
        error: 'No header row found'
      };
    }

    // Process each line after the header
    const positions = [];
    let skippedLines = 0;
    let errorLines = 0;

    for (let i = headerRow + 1; i < lines.length; i++) {
      const line = lines[i];
      debugLog('file', 'parsing', 'Processing line', {
        lineNumber: i + 1,
        line,
        totalLines: lines.length,
        positionsFound: positions.length,
        skippedLines,
        errorLines
      });

      try {
        // Parse the line as JSON
        const data = JSON.parse(line);
        debugLog('file', 'parsing', 'Parsed line as JSON', {
          lineNumber: i + 1,
          data,
          totalLines: lines.length
        });

        // Extract symbol from the data
        const symbol = data.symbol || data.Symbol || data.securitySymbol;
        if (!symbol) {
          debugLog('file', 'parsing', 'Skipping line - no symbol found', {
            lineNumber: i + 1,
            data,
            totalLines: lines.length
          });
          skippedLines++;
          continue;
        }

        // Extract date from the data
        const date = data.date || data.Date || data.asOfDate;
        if (!date) {
          debugLog('file', 'parsing', 'Skipping line - no date found', {
            lineNumber: i + 1,
            symbol,
            data,
            totalLines: lines.length
          });
          skippedLines++;
          continue;
        }

        // Create position object with default values
        const position = {
          symbol,
          date,
          quantity: 0,
          price: 0,
          marketValue: 0,
          costBasis: 0,
          gainLoss: 0
        };

        debugLog('file', 'parsing', 'Created position object', {
          lineNumber: i + 1,
          position,
          totalLines: lines.length,
          positionsFound: positions.length + 1
        });

        positions.push(position);
      } catch (error) {
        debugLog('file', 'error', 'Error processing line', {
          lineNumber: i + 1,
          line,
          error: error.message,
          totalLines: lines.length,
          errorLines: errorLines + 1
        });
        errorLines++;
        continue;
      }
    }

    debugLog('file', 'parsing', 'CSV parsing complete', {
      totalPositions: positions.length,
      totalLines: lines.length,
      skippedLines,
      errorLines,
      firstPosition: positions[0],
      contentLength: content.length
    });

    return {
      success: true,
      positions,
      stats: {
        totalLines: lines.length,
        positionsFound: positions.length,
        skippedLines,
        errorLines
      }
    };
  } catch (error) {
    debugLog('file', 'error', 'Error parsing CSV', {
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