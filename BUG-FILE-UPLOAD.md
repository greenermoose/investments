# Portfolio Snapshot File Upload Bug

## Issue Description
When uploading a portfolio snapshot file, the system fails with an IndexedDB error: "Failed to execute 'get' on 'IDBObjectStore': The parameter is not a valid key."

## Error Details
```
PipelineOrchestrator.js:153 Pipeline processing error: Error: Processing failed: Failed to execute 'get' on 'IDBObjectStore': The parameter is not a valid key.
```

## Root Cause
The bug occurs in `PortfolioRepository.js` when saving and retrieving portfolio snapshots. There were two issues:

1. Using a Date object directly in the portfolio ID generation:
```javascript
const portfolioId = `${portfolio.accountName}-${portfolio.date}`;
```

2. Inconsistent ID formats between save and retrieve operations:
```javascript
// In saveSnapshot:
const portfolioId = `${portfolio.accountName}-${portfolio.date}`;

// In getByAccountAndDate:
const id = `${accountName}_${date.getTime()}`;
```

IndexedDB requires string keys, but we were using a Date object directly in the string template literal, which results in an invalid key format. Additionally, the inconsistent ID formats between save and retrieve operations would prevent successful retrieval of saved snapshots.

## Steps to Reproduce
1. Navigate to the welcome screen
2. Select a portfolio snapshot file (e.g., 'Roth_Contributory_IRA-Positions-2021-11-20-071958.CSV')
3. Attempt to upload the file
4. The upload fails with the IndexedDB error

## Fix
The fix involves two changes:

1. Properly formatting the date as an ISO string when creating the portfolio ID:
```javascript
const portfolioId = `${portfolio.accountName}-${portfolio.date.toISOString()}`;
```

2. Ensuring consistent ID format across all methods:
```javascript
// In getByAccountAndDate:
const id = `${accountName}-${date.toISOString()}`;
```

## Impact
- Affects all portfolio snapshot uploads
- Prevents users from adding new portfolio snapshots to their accounts
- May affect historical data analysis and portfolio tracking
- Could cause issues with retrieving existing snapshots due to ID format inconsistency

## Status
Fixed in version 0.4.69

## Related Files
- src/repositories/PortfolioRepository.js
- src/services/PortfolioService.js
- src/pipeline/portfolio/PortfolioProcessor.js 