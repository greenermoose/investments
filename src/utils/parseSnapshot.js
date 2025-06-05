// utils/parseSnapshot.js
// Handles parsing of portfolio snapshot CSV files into normalized data structures

import { debugLog } from './debugConfig';

/**
 * Parse portfolio data from CSV content
 * @param {string} content - Raw CSV content
 * @returns {Object} Parsed portfolio data
 */
export const parsePortfolioCSV = (content) => {
  console.log('Starting CSV parsing with content length:', content.length);
  console.log('First few lines:', content.split('\n').slice(0, 3).join('\n'));

  debugLog('parseSnapshot', 'start', 'Starting CSV parsing', {
    contentLength: content.length,
    firstFewLines: content.split('\n').slice(0, 3).join('\n')
  });

  try {
    // Split content into lines and filter out empty lines
    const lines = content.split('\n').filter(line => line.trim());
    console.log('Total lines after filtering:', lines.length);
    console.log('First few lines:', lines.slice(0, 3));

    debugLog('parseSnapshot', 'lines', 'Split content into lines', {
      totalLines: lines.length,
      firstFewLines: lines.slice(0, 3)
    });

    // Parse the header line for date and time
    const headerLine = lines[0];
    let snapshotDate = null;
    let snapshotTime = null;

    if (headerLine) {
      // Extract date and time from header line
      const dateTimeMatch = headerLine.match(/as of (\d{1,2}:\d{2} (?:AM|PM) ET), (\d{1,2}\/\d{1,2}\/\d{4})/);
      if (dateTimeMatch) {
        snapshotTime = dateTimeMatch[1];
        const dateStr = dateTimeMatch[2];
        snapshotDate = new Date(dateStr);
        
        // Add time to the date
        const [time, period] = snapshotTime.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        snapshotDate.setHours(hours, minutes);
      } else {
        console.warn('Could not parse date/time from header:', headerLine);
        debugLog('parseSnapshot', 'warning', 'Could not parse date/time from header', {
          headerLine
        });
      }
    }

    // Find the header row - it should be the first line that looks like CSV headers
    let headerRowIndex = 0;
    const headerPatterns = [
      /symbol|ticker/i,
      /description|security/i,
      /quantity|qty|shares/i,
      /price|share price/i,
      /market value|mkt val|total value/i,
      /cost basis|basis/i,
      /gain\/loss|gain loss|unrealized/i
    ];

    console.log('Searching for header row...');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const matches = headerPatterns.filter(pattern => 
        values.some(value => pattern.test(value))
      );
      
      console.log(`Line ${i} matches:`, matches.length, 'patterns');
      if (matches.length >= 2) {
        headerRowIndex = i;
        console.log('Found header row at index:', i);
        console.log('Header line:', line);
        break;
      }
    }

    if (headerRowIndex === 0) {
      console.warn('No clear header row found, using first line as header');
    }

    debugLog('parseSnapshot', 'headers', 'Found header row', {
      headerRowIndex,
      headerLine: lines[headerRowIndex]
    });

    // Get headers from the header row
    const headers = lines[headerRowIndex].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    console.log('Raw headers:', headers);
    
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
    console.log('Normalized headers:', normalizedHeaders);

    // Process data rows starting after the header row
    console.log('Processing data rows starting from index:', headerRowIndex + 1);
    const positions = lines.slice(headerRowIndex + 1)
      .filter(line => {
        const trimmed = line.trim();
        const isValid = trimmed && 
               !trimmed.includes('Account Total') && 
               !trimmed.includes('Cash & Cash Investments');
        if (!isValid) {
          console.log('Filtered out line:', trimmed);
        }
        return isValid;
      })
      .map((line, index) => {
        console.log(`Processing data row ${index}:`, line);
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
        console.log(`Parsed position ${index}:`, position);
        return position;
      });

    console.log('Total positions parsed:', positions.length);
    console.log('First position:', positions[0]);
    console.log('Last position:', positions[positions.length - 1]);

    debugLog('parseSnapshot', 'complete', 'CSV parsing complete', {
      totalPositions: positions.length,
      totalLines: lines.length,
      firstPosition: positions[0],
      lastPosition: positions[positions.length - 1],
      snapshotDate: snapshotDate?.toISOString(),
      snapshotTime
    });

    return {
      success: true,
      positions,
      headers: normalizedHeaders,
      snapshotDate,
      snapshotTime,
      totals: {
        totalValue: positions.reduce((sum, pos) => sum + (parseFloat(pos['Mkt Val (Market Value)']) || 0), 0),
        totalGain: positions.reduce((sum, pos) => sum + (parseFloat(pos['Gain $ (Gain/Loss $)']) || 0), 0)
      }
    };
  } catch (error) {
    console.error('Error parsing CSV:', error);
    console.error('Error stack:', error.stack);
    console.error('Content length:', content.length);
    console.error('First few lines:', content.split('\n').slice(0, 3).join('\n'));

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