# Bug Report: Portfolio Snapshots Losing Original File Reference

## Issue Description
Portfolio snapshots are incorrectly flagged as missing their original source file despite successful uploads and processing. This issue affects the display of file reference information in the UI and may impact data integrity.

## Root Cause Analysis
The root cause has been identified as a data structure inconsistency in how file references are handled across different layers of the application. Previously, file references were stored in both `transactionMetadata` and a dedicated `sourceFile` field, leading to potential inconsistencies.

A new `FileReference` type has been implemented to standardize file reference handling across the application. This type ensures consistent structure and validation of file references, eliminating the dual access pattern that was causing issues.

## Technical Details
- **Affected Components**:
  - PortfolioRepository
  - PortfolioService
  - usePortfolioData hook
  - PortfolioDisplay component

- **Data Structure**:
  - New `FileReference` type with required fields:
    - `fileId`: Unique identifier for the file
    - `fileHash`: Hash of the file contents
    - `fileName`: Name of the file (optional)
    - `uploadDate`: Date of file upload (optional)
  - File references are now stored exclusively in the `sourceFile` field
  - `transactionMetadata` no longer contains file reference fields

## Implementation Details
1. Created new `FileReference` type with validation and migration utilities
2. Updated `PortfolioService` to use the new type for file references
3. Modified `PortfolioRepository` to validate and store file references consistently
4. Updated `usePortfolioData` hook to handle file references properly
5. Enhanced `PortfolioDisplay` component to display file reference information

## Testing
- [ ] Verify file references are correctly saved with new snapshots
- [ ] Confirm file references are properly displayed in the UI
- [ ] Test migration of existing file references
- [ ] Validate error handling for invalid file references

## Status
- [x] Root cause identified
- [x] Solution implemented
- [ ] Testing completed
- [ ] Deployed to production

## Notes
- The new implementation ensures consistent handling of file references across all layers
- Migration utilities are provided to handle existing data
- Validation is performed at all levels to maintain data integrity 