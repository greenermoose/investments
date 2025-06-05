# Portfolio Snapshot Parsing Bug Report

## Issue Description
When uploading a portfolio snapshot file, the system fails to parse the position data correctly. The file is successfully uploaded and saved, but all positions are being skipped during the parsing process. The console log shows that each position is being marked as "invalid" and skipped, resulting in an empty portfolio with no positions.

## Root Cause
The root cause appears to be a mismatch between the data format in the CSV file and the parsing logic. The console log shows that the data is being received in a format like:

```
{"Positions for account Roth Contributory IRA XXXX-6348 as of 07:19 AM ET: 'ABBV', 11/20/2021": '"ABBVIE INC"'}
```

However, the current parsing logic is trying to handle this as a CSV line with key-value pairs, which is incorrect. The data is actually being parsed as a JSON object at some point before reaching the position parsing code, which is why the regex pattern matching is failing.

The specific issues are:

1. The data is being double-parsed:
   - First as JSON (creating an object with a single key-value pair)
   - Then as CSV (trying to split on commas and quotes)

2. The position data format is not what the parser expects:
   - Expected: CSV format with separate columns for Symbol, Description, etc.
   - Actual: JSON-like format with a single key containing the position info

## Error Flow
1. File upload process starts successfully
2. File is saved correctly with proper metadata
3. During position parsing:
   - Each line is treated as a JSON object
   - The parser attempts to split this object as if it were CSV
   - The regex pattern fails to match the transformed data
   - All positions are marked as invalid and skipped
4. The portfolio is saved with zero positions

## Proposed Solution
1. Modify the file processing pipeline to handle the data format correctly:

```javascript
// In fileProcessing.js
export const parsePortfolioCSV = (content) => {
  try {
    const lines = content.split('\n').filter(line => line.trim());
    
    // Process data rows starting from line 3 (index 2)
    const positions = lines.slice(2)
      .filter(line => {
        const trimmed = line.trim();
        return trimmed && 
               !trimmed.includes('Account Total') && 
               !trimmed.includes('Cash & Cash Investments');
      })
      .map(line => {
        // Parse the line as a JSON object
        const positionData = JSON.parse(line);
        const key = Object.keys(positionData)[0];
        const value = positionData[key];
        
        // Extract symbol from the key using regex
        const symbolMatch = key.match(/'([^']+)'/);
        if (!symbolMatch) return null;
        
        const symbol = symbolMatch[1];
        
        // Create position object
        return {
          Symbol: symbol,
          Description: value.replace(/^"|"$/g, ''),
          'Qty (Quantity)': 0,
          Price: 0,
          'Mkt Val (Market Value)': 0,
          'Cost Basis': 0,
          'Gain $ (Gain/Loss $)': 0,
          'Gain % (Gain/Loss %)': 0
        };
      })
      .filter(Boolean);

    return {
      success: true,
      positions,
      headers: ['Symbol', 'Description', 'Qty (Quantity)', 'Price', 'Mkt Val (Market Value)', 'Cost Basis', 'Gain $ (Gain/Loss $)', 'Gain % (Gain/Loss %)'],
      totals: {
        totalValue: 0,
        totalGain: 0
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};
```

2. Add validation to ensure the data format is correct before parsing:
   - Check if the line is valid JSON
   - Verify the expected key format
   - Validate the symbol and description values

3. Add more detailed error logging to help diagnose parsing issues:
   - Log the raw line content
   - Log the parsed JSON object
   - Log any validation failures

## Impact
This bug affects the core functionality of uploading and processing portfolio snapshots. Users cannot see their portfolio positions after uploading a snapshot file, which is a critical feature of the application.

## Priority
High - This is a core functionality issue that prevents users from viewing their portfolio data. Should be fixed immediately to restore basic application functionality.

## Testing Plan
1. Test with the current problematic file to verify the fix
2. Test with various position formats to ensure robustness
3. Test with edge cases (special characters in symbols, long descriptions, etc.)
4. Verify that position totals are calculated correctly
5. Confirm that the UI displays the parsed positions correctly 