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