# Bug Report: Portfolio Snapshot Processing Error

## Issue Description
When attempting to process multiple portfolio snapshots from different time periods, the system fails to process the second snapshot correctly. This occurs specifically when:
1. A portfolio snapshot from 2021 is uploaded and processed successfully
2. A subsequent portfolio snapshot from 2025 is uploaded for comparison
3. The second snapshot fails to process with the error: "Cannot read properties of undefined (reading 'map')"

## Error Details
```
"processed": true,
"success": false,
"error": "Cannot read properties of undefined (reading 'map')"
```

## Expected Behavior
- Both portfolio snapshots should process successfully
- The system should be able to handle snapshots from different time periods
- The processed data should be available for comparison between time points

## Steps to Reproduce
1. Upload a portfolio snapshot from 2021
2. Verify the snapshot processes successfully
3. Upload a second portfolio snapshot from 2025
4. Observe the processing error

## Impact
- Users cannot compare portfolio performance across different time periods
- Historical analysis capabilities are limited
- Data from newer snapshots is not being properly integrated into the system

## Technical Context
The error suggests that the code is attempting to call the `map` function on an undefined object, which typically indicates:
- Missing or malformed data structure
- Incomplete data processing pipeline
- Potential issues with data validation or transformation

## Related Files
- Examples of snapshots from various vintages are available in the examples folder
- Processing logic for snapshots should be reviewed

## Priority
High - This affects core functionality of comparing portfolio performance across time periods.

## Status
Open - Investigation needed 