# Bug Report: Missing Original Files in Storage Manager

## Issue Description
The Storage Manager displays a "Missing Original Files Detected" message indicating that there is one portfolio in the database without the original source files stored, despite being able to see the portfolio and that the Account Data indicates one snapshot.

## Symptoms
- Storage Manager shows "Missing Original Files Detected" warning
- One portfolio exists in the database
- Account Data shows one snapshot
- Diagnostics show total of 1 file and 1 CSV file

## Root Cause Analysis
The issue stems from inconsistencies in the file storage and portfolio reference generation system:

1. **Dual File Storage Implementation**
   - Two different file storage implementations exist:
     - `src/pipeline/storage/FileStorage.js` (class-based)
     - `src/utils/fileStorage.js` (function-based)
   - The pipeline was using the class-based version while components were using the function-based version
   - This led to files being saved in different ways and potential mismatches

2. **Inconsistent Portfolio Reference Generation**
   - Portfolio references were generated in multiple places with slightly different logic:
     - In `saveUploadedFile`: `${accountName}_${formattedDate}`
     - In `migrateFromOldStorage`: Same pattern but with different date formatting
     - In `PortfolioRepository.saveSnapshot`: `${accountName}_${date.getTime()}_${random}`
   - This inconsistency made it difficult to match files with their corresponding portfolios

3. **File Processing Pipeline Issues**
   - The `PipelineOrchestrator` was using its own `FileStorage` class while the file upload hook was using utility functions
   - File processing results were not being properly passed through the pipeline
   - Metadata extraction and file storage were happening in an inconsistent order

## Attempted Fix
The following changes were made to address these issues:

1. **Consolidated File Storage**
   - Removed the class-based `FileStorage` from the pipeline
   - Now using the utility-based file storage functions consistently
   - Added proper error handling for duplicate files

2. **Consistent Portfolio Reference Generation**
   - Added a new `generatePortfolioReference` function to ensure consistent reference generation
   - Using the same function in both file saving and migration checks
   - Ensuring proper date handling and formatting

3. **Improved Pipeline Flow**
   - Added metadata extraction before file storage
   - Better handling of file types and validation
   - Proper error propagation through the pipeline

4. **Better File Matching**
   - Using the same portfolio reference format everywhere
   - Improved file matching logic in migration checks
   - Better handling of missing files

## Status
The fix has been implemented but the issue persists. Further investigation is needed to:
1. Verify the actual database contents
2. Check if there are any remaining inconsistencies in file storage
3. Ensure the migration check is working correctly with the new changes

## Next Steps
1. Add database inspection tools to verify file and portfolio storage
2. Add more detailed logging during file processing
3. Consider adding a file recovery mechanism for missing files
4. Implement a database consistency check utility

## Related Files
- `src/pipeline/PipelineOrchestrator.js`
- `src/utils/fileStorage.js`
- `src/pipeline/storage/FileStorage.js`
- `src/components/StorageManager.jsx`
- `src/components/FileManager.jsx` 