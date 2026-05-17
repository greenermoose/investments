export const CSVParser = {
  /**
   * Parses a CSV string into an array of objects based on the header row.
   * Handles quoted fields containing commas or newlines.
   * @param {string} csvText - The CSV content.
   * @param {number} headerRowIndex - The 0-based index of the header row.
   * @returns {Array<Object>} Array of objects with keys from the headers.
   */
  parse(csvText, headerRowIndex = 0) {
    if (!csvText) return [];

    const lines = this._splitIntoLines(csvText);
    if (lines.length <= headerRowIndex) return [];

    const headers = this._parseLine(lines[headerRowIndex]);
    const data = [];

    for (let i = headerRowIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this._parseLine(line);
      const row = {};

      for (let j = 0; j < headers.length; j++) {
        const header = headers[j] ? headers[j].trim() : `Column_${j}`;
        row[header] = values[j] !== undefined ? values[j].trim() : '';
      }

      data.push(row);
    }

    return data;
  },

  /**
   * Splits text into lines, handling newlines inside quotes.
   */
  _splitIntoLines(text) {
    const lines = [];
    let currentLine = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        insideQuotes = !insideQuotes;
      }

      if ((char === '\r' && nextChar === '\n') || char === '\n' || char === '\r') {
        if (!insideQuotes) {
          lines.push(currentLine);
          currentLine = '';
          if (char === '\r' && nextChar === '\n') {
            i++; // Skip the \n part of \r\n
          }
          continue;
        }
      }

      currentLine += char;
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  },

  /**
   * Parses a single CSV line into an array of values.
   */
  _parseLine(line) {
    const values = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          // Escaped quote
          currentValue += '"';
          i++;
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        // End of field
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    values.push(currentValue); // Push the last value
    return values;
  }
};
