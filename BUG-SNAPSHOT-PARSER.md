# BUG: Portfolio Snapshot Parser Data Structure Issue

## Summary
The current portfolio snapshot parser does not produce the desired clean data structure for each security. Instead, it returns inconsistent or incorrect fields, sometimes including header rows as data or failing to properly parse and normalize the relevant fields.

## Desired Data Structure
Each security in the parsed output should have the following structure:

```
{
  symbol: string,
  description: string,
  quantity: number,
  price: number,        // price per share
  costBasis: number,    // cost basis per share
  type: string
}
```

From this structure, other values (such as total cost basis, gain/loss $ or %, etc.) can be calculated as needed elsewhere in the application.

## Current Issues
- The parser sometimes includes the header row as a data row, resulting in empty or invalid fields for key attributes like `symbol` and `quantity`.
- The output data structure is inconsistent and includes extraneous or misnamed fields.
- The parser does not always correctly distinguish between per-share and total cost basis.
- The output is not a clean array of security objects matching the above specification.

## Steps to Reproduce
1. Upload a portfolio snapshot CSV file.
2. Observe the parsed JSON output.
3. Note that the output does not match the desired structure above and may include header rows or empty fields.

## Expected Behavior
- The parser should return an array of objects, each matching the structure above, with all fields correctly parsed and normalized.
- Only valid security rows should be included (no header or summary rows).
- The `price` and `costBasis` fields should represent per-share values.
- The `type` field should be set based on the security type in the CSV, or 'Unknown' if not available.

## Additional Notes
- Other derived values (total cost basis, gain/loss, etc.) should be calculated elsewhere, not in the parser output.
- The parser should be robust to variations in CSV format and header naming.

# Portfolio Snapshot Parser Bug Report

## Issue Description
When processing portfolio snapshots, the data array in the resulting snapshot object is empty, despite the CSV file containing valid security data.

## Current Behavior
The processed data structure shows:
```json
{
  "success": true,
  "result": {
    "success": true,
    "snapshot": {
      "id": "Roth Contributory IRA_1637410798000_3hmigr4xv",
      "account": "Roth Contributory IRA",
      "date": "2021-11-20T12:19:58.000Z",
      "data": [], // Empty array despite valid CSV data
      "accountTotal": {
        "totalValue": 0,
        "totalGain": 0
      },
      "transactionMetadata": {
        "changes": null,
        "fileId": "file_1749002559731_mikzsg7ja"
      },
      "createdAt": "2025-06-04T02:02:39.739Z"
    },
    "accountName": "Roth Contributory IRA",
    "changes": null
  }
}
```

## Root Cause Analysis
The issue stems from a mismatch between the field names in the parsed data and what the repository expects:

1. The `parsePortfolioCSV` function in `src/utils/fileProcessing.js` outputs data with lowercase field names:
```javascript
{
  symbol,
  description,
  quantity,
  price,
  costBasis,
  type
}
```

2. However, the `PortfolioRepository` expects data with specific capitalized field names:
```javascript
{
  Symbol,
  Description,
  'Qty (Quantity)',
  Price,
  'Cost Basis',
  'Security Type',
  'Mkt Val (Market Value)'
}
```

3. This mismatch causes the repository to filter out the data as invalid, resulting in an empty array.

## Solution
Update the `parsePortfolioCSV` function to output data with the correct field names that match the repository's expectations:

```javascript
data.push({
  Symbol: symbol,
  Description: description,
  'Qty (Quantity)': quantity,
  Price: price,
  'Cost Basis': costBasis,
  'Security Type': type || 'Unknown',
  'Mkt Val (Market Value)': quantity * price
});
```

Key changes:
1. Changed field names to match repository format
2. Added `Mkt Val (Market Value)` calculation
3. Maintained consistent field naming across the application

## Implementation Status
- [x] Identified root cause
- [x] Proposed solution
- [ ] Implemented fix
- [ ] Tested with sample data
- [ ] Verified fix resolves the issue

## Testing Plan
1. Upload a portfolio snapshot CSV file
2. Verify the parsed data contains the correct field names
3. Confirm the snapshot object contains the securities data
4. Validate that account totals are calculated correctly

## Additional Notes
- The fix maintains backward compatibility with existing code
- No changes required to the repository layer
- Improves data consistency across the application 