# Portfolio Snapshot Parsing Bug Report

## Issue Description
When uploading a portfolio snapshot file, the system fails during the storage migration process with the error: "Account name and date are required for portfolio reference". This occurs in the `generatePortfolioReference` function during the migration of existing portfolio data to the new storage format.

## Root Cause
The error occurs in the `migrateFromOldStorage` function in `fileStorage.js` when attempting to generate a portfolio reference for existing portfolios. The issue stems from two main problems:

1. The portfolio data structure being migrated has inconsistent date formats:
   - The portfolio object contains a date string in ISO format: `"2021-11-20T12:19:58.000Z"`
   - The `generatePortfolioReference` function expects a Date object
   - The conversion from string to Date object is failing silently

2. The error handling in the migration process is not properly handling the case where the date conversion fails, leading to the validation error in `generatePortfolioReference`.

## Error Flow
1. File upload process starts successfully
2. File is parsed and saved correctly
3. Portfolio data is saved to the database
4. During storage migration check:
   - System finds existing portfolio: `{"id":"Roth Contributory IRA-2021-11-20T12:19:58.000Z",...}`
   - Attempts to generate reference using `generatePortfolioReference(portfolio.account, new Date(portfolio.date))`
   - Date conversion fails silently
   - `generatePortfolioReference` throws error due to invalid date

## Proposed Solution
1. Add proper date validation and conversion in the migration process:
```javascript
const expectedReference = generatePortfolioReference(
  portfolio.account,
  portfolio.date instanceof Date ? portfolio.date : new Date(portfolio.date)
);
```

2. Add error handling for date conversion:
```javascript
try {
  const portfolioDate = portfolio.date instanceof Date ? 
    portfolio.date : 
    new Date(portfolio.date);
    
  if (isNaN(portfolioDate.getTime())) {
    console.error('Invalid date format in portfolio:', portfolio.date);
    continue; // Skip this portfolio
  }
  
  const expectedReference = generatePortfolioReference(portfolio.account, portfolioDate);
  // ... rest of migration logic
} catch (error) {
  console.error('Error processing portfolio during migration:', error);
  continue; // Skip this portfolio
}
```

3. Add validation in `generatePortfolioReference`:
```javascript
export const generatePortfolioReference = (accountName, date) => {
  if (!accountName) {
    throw new Error('Account name is required for portfolio reference');
  }
  
  if (!date) {
    throw new Error('Date is required for portfolio reference');
  }
  
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date format for portfolio reference');
  }
  
  const formattedDate = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `${accountName}_${formattedDate}`;
};
```

## Impact
This bug affects the storage migration process but does not impact the core functionality of uploading and processing new portfolio snapshots. However, it prevents proper migration of existing portfolio data to the new storage format.

## Priority
Medium - The bug affects data migration but not core functionality. Should be fixed before next major release to ensure proper data migration for existing users. 