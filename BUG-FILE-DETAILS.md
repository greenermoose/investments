# Portfolio File Details Display Bug

## Description
When a portfolio snapshot is uploaded, the Portfolio File Details section incorrectly displays "No File Details Available" with the message "Upload a portfolio file to see details", even though a file has been uploaded.

## Expected Behavior
After uploading a portfolio snapshot, the Portfolio File Details section should display relevant information about the uploaded file, such as:
- File name
- Upload date/time
- File size
- File type
- Any other relevant metadata

## Current Behavior
The system incorrectly shows a "no file" state message even after a successful file upload:
```
No File Details Available
Upload a portfolio file to see details
```

## Steps to Reproduce
1. Navigate to the portfolio upload section
2. Upload a portfolio snapshot file
3. Observe the Portfolio File Details section
4. Notice that it shows "No File Details Available" despite the successful upload

## Impact
This bug affects user experience by:
- Providing incorrect feedback about the file upload status
- Hiding important file information that users expect to see
- Potentially causing confusion about whether the upload was successful

## Environment
- Application: Portfolio Management System
- Component: Portfolio File Details Display
- Status: Active

## Priority
Medium - Affects user experience but doesn't prevent core functionality

## Notes
- The file upload itself appears to work correctly
- Only the display of file details is affected
- This may be related to state management or data fetching after upload 