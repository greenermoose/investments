# Bug Report: Portfolio Snapshots Losing Original File Reference

## Description
When uploading and processing portfolio snapshots, the system is incorrectly flagging portfolios as not having their original source file stored. This occurs despite the file being successfully uploaded and processed.

## Current Behavior
1. User uploads a portfolio snapshot file
2. File is processed and saved successfully
3. Portfolio snapshot is created and saved
4. When viewing the portfolio later, the system indicates the original source file is missing

## Expected Behavior
1. User uploads a portfolio snapshot file
2. File is processed and saved successfully
3. Portfolio snapshot is created and saved with a reference to the original file
4. When viewing the portfolio later, the system correctly shows the original source file

## Root Cause Analysis
The issue is more nuanced than initially thought. After code review, we found that:

1. File Hash Handling:
   - The file hash is correctly generated during initial file upload
   - The `PortfolioProcessor` has proper validation for both file hash and file ID
   - The `PipelineOrchestrator` correctly passes both `fileId` and `fileHash` through the pipeline
   - Extensive debug logging exists throughout the process to track the file hash

2. The Actual Problem:
   - The file hash is properly validated and passed through the pipeline
   - The issue occurs in the final storage layer where data structure transformation happens
   - In `PortfolioRepository.saveSnapshot`, the file hash is stored in `transactionMetadata` but:
     a. It's not stored in a way that's easily queryable by the UI layer
     b. The metadata structure makes it easy for the file reference to become "hidden"
     c. There's no clear separation between file reference data and other transaction metadata

## Attempted Fix
The first attempt to fix this issue involved:

1. Adding a dedicated `sourceFile` field to the portfolio data structure in `PortfolioRepository.saveSnapshot`
2. Updating `PortfolioService.savePortfolioSnapshot` to properly handle source file data
3. Adding stronger validation in `PortfolioProcessor.processPortfolioSnapshot`

The changes included:
- Creating a dedicated `sourceFile` object containing `fileId` and `fileHash`
- Adding validation to ensure file hash is present when file ID is provided
- Improving logging to track file reference data through the pipeline

However, this fix did not resolve the issue. The problem persists, suggesting that:
1. The UI layer may not be properly accessing the new `sourceFile` field
2. There might be a data transformation issue in the UI layer
3. The file reference might be getting lost during data retrieval

## Next Steps
1. Investigate the UI layer to understand how it's accessing portfolio data:
   - Review the portfolio data retrieval flow
   - Check how the UI determines if a file reference exists
   - Verify the data structure expected by the UI

2. Add data migration for existing portfolios:
   - Create a migration script to move file references from `transactionMetadata` to `sourceFile`
   - Add validation to ensure all portfolios have proper file references
   - Update any UI code that relies on the old data structure

3. Implement additional safeguards:
   - Add file reference validation in the UI layer
   - Create a file reference integrity check utility
   - Add monitoring for missing file references

4. Improve error handling and user feedback:
   - Add clear error messages when file references are missing
   - Implement automatic file reference recovery where possible
   - Add user notifications for file reference issues

## Success Criteria
1. All portfolio snapshots maintain their original file reference
2. File hash is consistently present in portfolio metadata
3. Original files can be retrieved for all portfolios
4. No regression in existing functionality
5. Clear error messages when file references are missing
6. Successful migration of existing portfolio data

## Notes
- This bug affects the core functionality of tracking portfolio data sources
- Fix should be implemented with careful consideration of existing data
- May require data migration for existing portfolios
- The fix adds a dedicated `sourceFile` field to make the file reference more explicit and less likely to be lost during data transformations
- The system already has migration utilities (`migrateFromOldStorage`) that can help with file hash matching during the transition 