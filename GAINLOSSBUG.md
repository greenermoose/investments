# Gain/Loss Calculation Bug Report

## Issue Description
The application is incorrectly calculating total gain/loss in the portfolio display. The console logs show that:
1. Some positions have both gain/loss dollar and percentage values (e.g., AMZN: `gainLossDollar: 2117.67, gainLossPercent: 12.34`)
2. Some positions have only percentage values (e.g., ABNB: `gainLossDollar: 0, gainLossPercent: -6.27`)
3. Some positions have only dollar values (e.g., AMPX: `gainLossDollar: 1309.4, gainLossPercent: 0`)
4. The total gain/loss calculation is incomplete because it only includes positions with dollar values

## Root Cause Analysis
After reviewing the code and logs, we've identified the following issues:

1. **Missing Value Calculation**:
   - When a position has only a percentage value, the code doesn't calculate the corresponding dollar value
   - When a position has only a dollar value, the code doesn't calculate the corresponding percentage value
   - This leads to positions with only percentage values being excluded from the total gain calculation

2. **Total Gain Calculation**:
   - The total gain ($21,929.94) is only summing the positions that have dollar values
   - The total cost ($268,410.23) is correct
   - The calculated gain percentage (8.17%) is correct based on these numbers
   - However, this doesn't match the actual portfolio performance because we're missing the gain/loss values from positions that only have percentage values

## Fix Plan

1. **Update Gain/Loss Calculation**
   - Update `portfolioPerformanceMetrics.js` to properly handle both dollar and percentage values
   - Calculate missing dollar values from percentages when available
   - Calculate missing percentages from dollar values when available
   - Ensure total gain includes all positions, regardless of whether they have dollar or percentage values

2. **Add Data Validation**
   - Add validation in `parsePortfolioCSV` to verify gain/loss values
   - Ensure dollar values are numeric and not percentages
   - Ensure percentage values are between -100 and 100

3. **Add Logging**
   - Add detailed logging of gain/loss calculations
   - Log when values are calculated from percentages
   - Log when values are calculated from dollar amounts
   - Log total gain calculations

## Implementation Steps

1. Update gain/loss calculation in `portfolioPerformanceMetrics.js`:
```javascript
// Calculate missing values
if (position['Gain $ (Gain/Loss $)'] === 0 && position['Gain % (Gain/Loss %)'] !== 0) {
  // Calculate dollar value from percentage
  position['Gain $ (Gain/Loss $)'] = (position['Gain % (Gain/Loss %)'] / 100) * position['Cost Basis'];
  console.log(`Calculated dollar value from percentage for ${position.Symbol}:`, {
    percentage: position['Gain % (Gain/Loss %)'],
    costBasis: position['Cost Basis'],
    calculatedDollar: position['Gain $ (Gain/Loss $)']
  });
} else if (position['Gain % (Gain/Loss %)'] === 0 && position['Gain $ (Gain/Loss $)'] !== 0) {
  // Calculate percentage from dollar value
  position['Gain % (Gain/Loss %)'] = (position['Gain $ (Gain/Loss $)'] / position['Cost Basis']) * 100;
  console.log(`Calculated percentage from dollar value for ${position.Symbol}:`, {
    dollar: position['Gain $ (Gain/Loss $)'],
    costBasis: position['Cost Basis'],
    calculatedPercentage: position['Gain % (Gain/Loss %)']
  });
}
```

## Testing Plan

1. Test with sample CSV files:
   - Test with positions that have only dollar values
   - Test with positions that have only percentage values
   - Test with positions that have both values
   - Test with positions that have neither value

2. Verify calculations:
   - Verify that dollar values are correctly calculated from percentages
   - Verify that percentages are correctly calculated from dollar values
   - Check total gain/loss calculations
   - Verify that positions with only percentage values contribute to total gain
   - Verify that positions with only dollar values contribute to total gain

3. UI Testing:
   - Verify correct display of gain/loss values
   - Check sorting functionality
   - Verify filtering works correctly

## Expected Outcome
After implementing these changes:
1. All positions will have both dollar and percentage values
2. Missing values will be calculated from available values
3. Total gain will include all positions, regardless of whether they originally had dollar or percentage values
4. The display will show accurate gain/loss information
5. Console logs will provide clear information about calculated values 