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

## Attempted Fixes

### First Attempt (0.4.87)
1. Added a dedicated `sourceFile` field to the portfolio data structure in `PortfolioRepository.saveSnapshot`
2. Updated `PortfolioService.savePortfolioSnapshot` to properly handle source file data
3. Added stronger validation in `PortfolioProcessor.processPortfolioSnapshot`

The changes included:
- Creating a dedicated `sourceFile` object containing `fileId` and `fileHash`
- Adding validation to ensure file hash is present when file ID is provided
- Improving logging to track file reference data through the pipeline

### Second Attempt (0.4.89)
1. Updated UI components to properly handle and display source file information:
   - Modified `PortfolioManager.jsx` to pass source file information when loading snapshots
   - Updated `usePortfolioData.js` to store and expose source file information
   - Enhanced `PortfolioDisplay.jsx` to show source file information in the UI

The changes included:
- Adding source file state management in the portfolio context
- Ensuring source file information is passed through the component hierarchy
- Displaying source file information in the portfolio header

However, this fix did not resolve the issue. The problem persists, suggesting that:
1. The data transformation between layers may be losing the file reference
2. The file reference might be getting overwritten during data updates
3. There might be a race condition in how the data is loaded and displayed

## Next Steps

### 1. Investigate Data Flow
1. Add comprehensive logging throughout the data flow:
   - Log file reference data at each transformation step
   - Track when and where the file reference is lost
   - Monitor data structure changes during updates

2. Review data transformation layers:
   - Check `PortfolioService` data transformation methods
   - Verify `PortfolioRepository` data normalization
   - Examine UI layer data processing

### 2. Implement Data Integrity Checks
1. Add validation at key points:
   - When saving portfolio snapshots
   - During data retrieval
   - Before displaying in UI
   - After data updates

2. Create a file reference integrity check:
   - Verify file reference consistency
   - Validate file hash matches stored file
   - Check for missing or corrupted references

### 3. Improve Data Structure
1. Consider alternative data structures:
   - Separate file reference store
   - Direct file reference mapping
   - Immutable file reference objects

2. Add data versioning:
   - Track changes to file references
   - Maintain reference history
   - Enable reference recovery

### 4. Enhance Error Handling
1. Implement better error detection:
   - Add specific error types for file reference issues
   - Create validation error handlers
   - Improve error reporting

2. Add recovery mechanisms:
   - Automatic file reference recovery
   - Manual reference repair tools
   - Reference validation utilities

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