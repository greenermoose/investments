# Gain/Loss Calculation Bug Report

## Issue Description
The application is incorrectly handling gain/loss calculations in the portfolio display. The console logs show that:
1. `gainLossDollar` is incorrectly getting values from the Gain/Loss % column
2. `gainLossPercent` is not being set properly (showing as 0)

## Root Cause Analysis
After reviewing the code, the issue appears to be in the header mapping logic in `fileProcessing.js`. The problem occurs in the `createHeaderMapping` function where the header detection for gain/loss columns is not specific enough:

```javascript
else if (normalizedHeader.includes('gain/loss') || normalizedHeader.includes('gain $') || normalizedHeader.includes('gain/loss $')) {
  headerMap['Gain $ (Gain/Loss $)'] = index;
} else if (normalizedHeader.includes('gain %') || normalizedHeader.includes('gain/loss %') || normalizedHeader.includes('gain/loss %')) {
  headerMap['Gain % (Gain/Loss %)'] = index;
}
```

The issue is that the first condition `normalizedHeader.includes('gain/loss')` is too broad and matches both dollar and percentage columns. This causes the dollar column to be mapped incorrectly.

## Fix Plan

1. **Update Header Mapping Logic**
   - Make the header detection more specific
   - Add exact pattern matching for dollar and percentage columns
   - Add validation to ensure columns are mapped correctly

2. **Add Data Validation**
   - Add validation in `parsePortfolioCSV` to verify gain/loss values
   - Ensure dollar values are numeric and not percentages
   - Ensure percentage values are between -100 and 100

3. **Add Logging**
   - Add detailed logging of header mapping process
   - Log raw values from CSV before parsing
   - Log mapped values after parsing

4. **Update Display Component**
   - Add validation in PortfolioDisplay component
   - Add error handling for invalid gain/loss values
   - Add visual indicators for data validation issues

## Implementation Steps

1. Update `createHeaderMapping` in `fileProcessing.js`:
```javascript
// More specific header detection
if (normalizedHeader.includes('gain/loss $') || normalizedHeader.includes('gain $')) {
  headerMap['Gain $ (Gain/Loss $)'] = index;
} else if (normalizedHeader.includes('gain/loss %') || normalizedHeader.includes('gain %')) {
  headerMap['Gain % (Gain/Loss %)'] = index;
}
```

2. Add validation in `parsePortfolioCSV`:
```javascript
// Validate gain/loss values
if (mappedRow['Gain $ (Gain/Loss $)'] !== undefined) {
  const value = parseFloat(mappedRow['Gain $ (Gain/Loss $)']);
  if (isNaN(value)) {
    console.warn(`Invalid gain/loss dollar value for ${mappedRow.Symbol}`);
    mappedRow['Gain $ (Gain/Loss $)'] = 0;
  }
}

if (mappedRow['Gain % (Gain/Loss %)'] !== undefined) {
  const value = parseFloat(mappedRow['Gain % (Gain/Loss %)']);
  if (isNaN(value) || value < -100 || value > 100) {
    console.warn(`Invalid gain/loss percentage value for ${mappedRow.Symbol}`);
    mappedRow['Gain % (Gain/Loss %)'] = 0;
  }
}
```

3. Add logging in `PortfolioDisplay.jsx`:
```javascript
console.log('Raw gain/loss values:', {
  symbol: position.Symbol,
  rawGainLossDollar: position['Gain $ (Gain/Loss $)'],
  rawGainLossPercent: position['Gain % (Gain/Loss %)'],
  costBasis: position['Cost Basis'],
  marketValue: position['Mkt Val (Market Value)']
});
```

## Testing Plan

1. Test with sample CSV files:
   - Test with various header formats
   - Test with missing or malformed gain/loss columns
   - Test with invalid values in gain/loss columns

2. Verify calculations:
   - Compare calculated percentages with provided percentages
   - Verify dollar amounts are correctly parsed
   - Check total gain/loss calculations

3. UI Testing:
   - Verify correct display of gain/loss values
   - Check sorting functionality
   - Verify filtering works correctly

## Expected Outcome
After implementing these changes:
1. Gain/loss dollar values will be correctly parsed from the CSV
2. Gain/loss percentage values will be correctly parsed and validated
3. The display will show accurate gain/loss information
4. Console logs will provide clear information about any data issues 