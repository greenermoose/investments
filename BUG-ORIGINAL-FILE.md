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
After extensive investigation and multiple fix attempts, we've identified several layers of complexity in this issue:

1. Data Structure Inconsistency:
   - The file reference is stored in multiple places:
     a. `transactionMetadata.fileId` and `transactionMetadata.fileHash`
     b. A dedicated `sourceFile` object with `fileId`, `fileHash`, `fileName`, and `uploadDate`
   - This dual storage approach creates potential for inconsistency

2. Data Flow Issues:
   - The file reference passes through multiple layers:
     a. File upload layer (`FileUploader`)
     b. Service layer (`PortfolioService`)
     c. Repository layer (`PortfolioRepository`)
     d. UI layer (`PortfolioManager`, `PortfolioDisplay`)
   - Each layer may transform or normalize the data differently

3. State Management Complexity:
   - The file reference is managed in multiple state containers:
     a. Portfolio context
     b. Individual component state
     c. Repository storage
   - Synchronization between these states may be incomplete

## Attempted Fixes

### First Attempt (0.4.87)
1. Added a dedicated `sourceFile` field to the portfolio data structure
2. Updated `PortfolioService.savePortfolioSnapshot` to handle source file data
3. Added validation in `PortfolioProcessor.processPortfolioSnapshot`

The changes included:
- Creating a dedicated `sourceFile` object containing `fileId` and `fileHash`
- Adding validation to ensure file hash is present when file ID is provided
- Improving logging to track file reference data through the pipeline

### Second Attempt (0.4.89)
1. Updated UI components to handle and display source file information:
   - Modified `PortfolioManager.jsx` to pass source file information
   - Updated `usePortfolioData.js` to store and expose source file information
   - Enhanced `PortfolioDisplay.jsx` to show source file information

The changes included:
- Adding source file state management in the portfolio context
- Ensuring source file information is passed through the component hierarchy
- Displaying source file information in the portfolio header

### Third Attempt (Current)
1. Standardized the `sourceFile` structure across all layers:
   ```typescript
   interface SourceFile {
     fileId: string;      // Required
     fileHash: string;    // Required
     fileName: string | null;    // Optional
     uploadDate: string;  // Optional, defaults to current timestamp
   }
   ```

2. Added data validation and normalization:
   - Created `normalizeSourceFile` utility function
   - Added validation in repository and service layers
   - Improved error handling and logging

3. Enhanced data flow tracking:
   - Added comprehensive debug logging
   - Implemented data structure validation
   - Added state synchronization checks

However, the issue persists, suggesting that:
1. The data transformation between layers may still be losing the file reference
2. The file reference might be getting overwritten during data updates
3. There might be a race condition in how the data is loaded and displayed
4. The dual storage approach (transactionMetadata and sourceFile) may be causing conflicts

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