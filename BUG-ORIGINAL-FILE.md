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
The issue is in how the file hash is being handled in the portfolio data structure. The file hash is:
1. Generated correctly during initial file upload
2. Stored in the file record
3. Passed through the processing pipeline in `transactionMetadata`
4. But not being properly validated or preserved in the final portfolio snapshot

The specific problems are:
1. No validation to ensure file hash is present before saving
2. File hash is stored in `transactionMetadata` but not in a dedicated field
3. The metadata object is being handled too loosely, allowing the hash to be lost

## Proposed Solution
1. Add a dedicated `sourceFile` field to the portfolio data structure
2. Add validation to ensure file hash is present
3. Ensure file hash is preserved during all data transformations
4. Add logging to track file hash through the pipeline

## Implementation Details
1. Modify `PortfolioRepository.saveSnapshot` to:
   ```javascript
   // Add validation
   if (!portfolio.transactionMetadata?.fileHash) {
     throw new Error('File hash is required for portfolio snapshot');
   }

   // Add dedicated source file field
   const portfolioData = {
     id: portfolioId,
     account: portfolio.account,
     date: portfolio.date,
     data: normalizedData,
     accountTotal: totals,
     sourceFile: {
       fileId: portfolio.transactionMetadata.fileId,
       fileHash: portfolio.transactionMetadata.fileHash
     },
     transactionMetadata: portfolio.transactionMetadata,
     createdAt: new Date()
   };
   ```

2. Update `PortfolioService.savePortfolioSnapshot` to:
   ```javascript
   // Add validation
   if (!transactionMetadata?.fileHash) {
     throw new Error('File hash is required for portfolio snapshot');
   }

   const portfolio = {
     account: accountName,
     date: timestamp,
     data: portfolioData,
     accountTotal,
     sourceFile: {
       fileId: transactionMetadata.fileId,
       fileHash: transactionMetadata.fileHash
     },
     transactionMetadata
   };
   ```

3. Update `PipelineOrchestrator.processFile` to:
   ```javascript
   // Add validation
   if (!storageResult.fileHash) {
     throw new Error('File hash is required for processing');
   }

   // Ensure file hash is passed through
   processingResult = await this.processor.processPortfolioSnapshot({
     parsedData,
     accountName: metadata.accountName,
     snapshotDate: metadata.date,
     fileId: storageResult.id,
     fileHash: storageResult.fileHash
   });
   ```

## Testing Plan
1. Upload a new portfolio snapshot
2. Verify file hash is generated and stored
3. Verify file hash is preserved in portfolio snapshot
4. Verify file hash can be retrieved when viewing portfolio
5. Test with multiple file types and sizes
6. Test with duplicate files

## Success Criteria
1. All portfolio snapshots maintain their original file reference
2. File hash is consistently present in portfolio metadata
3. Original files can be retrieved for all portfolios
4. No regression in existing functionality

## Notes
- This bug affects the core functionality of tracking portfolio data sources
- Fix should be implemented with careful consideration of existing data
- May require data migration for existing portfolios
- The fix adds a dedicated `sourceFile` field to make the file reference more explicit and less likely to be lost during data transformations 