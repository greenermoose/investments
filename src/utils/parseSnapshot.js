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
      console.log('Parsing header line:', headerLine);
      
      // Extract date and time from header line - try multiple formats
      const dateTimeFormats = [
        // Format: "as of 07:19 AM ET, 11/20/2021"
        /as of (\d{1,2}:\d{2} (?:AM|PM) ET), (\d{1,2}\/\d{1,2}\/\d{4})/i,
        // Format: "as of 07:19 AM ET, 2021/11/20"
        /as of (\d{1,2}:\d{2}) (AM|PM) ET, (\d{4}\/\d{1,2}\/\d{1,2})/i,
        // Format: "as of 07:19 AM ET, 2021-11-20"
        /as of (\d{1,2}:\d{2}) (AM|PM) ET, (\d{4}-\d{1,2}-\d{1,2})/i,
        // Format: "as of 07:19 AM ET, 20-Nov-2021"
        /as of (\d{1,2}:\d{2}) (AM|PM) ET, (\d{1,2}-[A-Za-z]{3}-\d{4})/i
      ];

      let dateTimeMatch = null;
      let formatIndex = -1;

      for (let i = 0; i < dateTimeFormats.length; i++) {
        const match = headerLine.match(dateTimeFormats[i]);
        if (match) {
          dateTimeMatch = match;
          formatIndex = i;
          break;
        }
      }

      if (dateTimeMatch) {
        try {
          switch (formatIndex) {
            case 0: // MM/DD/YYYY
              snapshotTime = dateTimeMatch[1];
              const [month, day, year] = dateTimeMatch[2].split('/');
              snapshotDate = new Date(year, month - 1, day);
              break;
            case 1: // YYYY/MM/DD
              snapshotTime = `${dateTimeMatch[1]} ${dateTimeMatch[2]} ET`;
              const [year1, month1, day1] = dateTimeMatch[3].split('/');
              snapshotDate = new Date(year1, month1 - 1, day1);
              break;
            case 2: // YYYY-MM-DD
              snapshotTime = `${dateTimeMatch[1]} ${dateTimeMatch[2]} ET`;
              const [year2, month2, day2] = dateTimeMatch[3].split('-');
              snapshotDate = new Date(year2, month2 - 1, day2);
              break;
            case 3: // DD-MMM-YYYY
              snapshotTime = `${dateTimeMatch[1]} ${dateTimeMatch[2]} ET`;
              const [day3, month3, year3] = dateTimeMatch[3].split('-');
              const monthIndex = new Date(`${month3} 1, 2000`).getMonth();
              snapshotDate = new Date(year3, monthIndex, day3);
              break;
          }

          // Add time to the date
          const [time, period] = snapshotTime.split(' ').slice(0, 2);  // Take only first two parts
          let [hours, minutes] = time.split(':').map(Number);
          
          if (period === 'PM' && hours < 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          
          snapshotDate.setHours(hours, minutes);
          
          console.log('Successfully parsed date and time:', {
            date: snapshotDate.toISOString(),
            time: snapshotTime
          });
        } catch (error) {
          console.error('Error parsing date/time:', error);
          debugLog('parseSnapshot', 'error', 'Error parsing date/time', {
            error: error.message,
            headerLine,
            dateTimeMatch
          });
          // Don't throw here, continue with null values
        }
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
        // Only filter out account totals and empty lines
        const isValid = trimmed && 
               !trimmed.includes('Account Total') && 
               !trimmed.includes('Cash & Cash Investments') &&
               !trimmed.includes('Total') &&
               !trimmed.includes('Grand Total');
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

        // Ensure we have enough values for all headers
        while (values.length < normalizedHeaders.length) {
          values.push('');
        }

        const position = {};
        normalizedHeaders.forEach((header, index) => {
          // Convert numeric values
          const value = values[index] || '';
          if (header === 'Symbol' || header === 'Description' || header === 'Security Type') {
            position[header] = value;
          } else {
            // Remove any currency symbols, commas, and parentheses
            const cleanValue = value.replace(/[$,()]/g, '');
            // Handle negative values in parentheses
            const isNegative = cleanValue.startsWith('(') && cleanValue.endsWith(')');
            const numericValue = isNegative ? 
              -parseFloat(cleanValue.slice(1, -1)) : 
              parseFloat(cleanValue);
            position[header] = isNaN(numericValue) ? '' : numericValue;
          }
        });

        // Only include positions with a valid symbol
        if (position.Symbol && position.Symbol.trim()) {
          console.log(`Parsed position ${index}:`, position);
          return position;
        }
        return null;
      })
      .filter(Boolean); // Remove null positions

    console.log('Total positions parsed:', positions.length);
    if (positions.length > 0) {
      console.log('First position:', positions[0]);
      console.log('Last position:', positions[positions.length - 1]);
    } else {
      console.warn('No valid positions found in the data');
    }

    debugLog('parseSnapshot', 'complete', 'CSV parsing complete', {
      totalPositions: positions.length,
      totalLines: lines.length,
      firstPosition: positions[0],
      lastPosition: positions[positions.length - 1],
      snapshotDate: snapshotDate?.toISOString(),
      snapshotTime
    });

    // Calculate totals only if we have valid positions
    const totals = positions.length > 0 ? {
      totalValue: positions.reduce((sum, pos) => sum + (parseFloat(pos['Mkt Val (Market Value)']) || 0), 0),
      totalGain: positions.reduce((sum, pos) => sum + (parseFloat(pos['Gain $ (Gain/Loss $)']) || 0), 0)
    } : {
      totalValue: 0,
      totalGain: 0
    };

    // Return success even if date parsing failed, as long as we have positions
    return {
      success: positions.length > 0,
      data: positions,
      headers: normalizedHeaders,
      snapshotDate: snapshotDate?.toISOString(),
      snapshotTime,
      totals,
      metadata: {
        date: snapshotDate?.toISOString(),
        time: snapshotTime,
        accountName: headerLine?.match(/Positions for account ([^,]+)/)?.[1]?.trim()
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