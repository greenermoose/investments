# Acceptance Tests: File Upload Functionality

## Overview
These tests verify that CSV and JSON file uploads work correctly in the browser.

## Prerequisites
- Application is running in browser (e.g., `http://localhost:8000`)
- Browser DevTools console is open to check for errors
- Sample CSV and JSON files are available in `examples/` directory

---

## Test 1: CSV Upload - Basic Functionality

### Steps
1. Open the application in browser
2. If no data is loaded, you should see "Welcome to Investment Portfolio Manager" screen
3. Click the "Upload CSV" button (or "Upload Files" → "Portfolio Snapshot")
4. File picker dialog should open
5. Select a CSV file from `examples/` directory (e.g., `Roth_Contributory_IRA-Positions-2021-11-20-071958.CSV`)
6. Click "Open" or select the file

### Expected Results
- [ ] File picker opens when button is clicked
- [ ] File can be selected
- [ ] Processing overlay appears with "Processing file..." message
- [ ] File is processed without errors (check browser console)
- [ ] Success message appears: "Successfully uploaded [filename]. Found X positions."
- [ ] Portfolio data loads and displays
- [ ] Portfolio header shows the portfolio date
- [ ] Positions are visible in the portfolio view

### Notes
- Check browser console for any errors
- Verify that IndexedDB contains the uploaded file (use DevTools → Application → IndexedDB)

---

## Test 2: CSV Upload - Error Handling

### Steps
1. Click "Upload CSV" button
2. Select an invalid file (e.g., a text file renamed to .csv, or an empty file)
3. Attempt to upload

### Expected Results
- [ ] Error message appears: "Failed to process CSV file: [error message]"
- [ ] Error message is clear and helpful
- [ ] Application does not crash
- [ ] User can try uploading again

---

## Test 3: CSV Upload - Duplicate File

### Steps
1. Upload a CSV file (use Test 1)
2. Wait for upload to complete
3. Upload the same file again

### Expected Results
- [ ] File is detected as duplicate (check console logs)
- [ ] Either: duplicate is skipped, or user is warned
- [ ] Application handles duplicate gracefully
- [ ] No duplicate portfolio snapshots are created

---

## Test 4: JSON Upload - Basic Functionality

### Steps
1. Click "Upload JSON" button (or "Upload Files" → "Transaction History")
2. File picker dialog should open
3. Select a JSON transaction file (if available)
4. Click "Open" or select the file

### Expected Results
- [ ] File picker opens when button is clicked
- [ ] File can be selected
- [ ] Processing overlay appears
- [ ] File is processed without errors
- [ ] Success message appears: "Successfully uploaded [filename]. Processed X transactions."
- [ ] Transactions are saved to database
- [ ] Transactions tab shows the uploaded transactions

### Notes
- If no JSON file is available, create a sample JSON file with the structure:
  ```json
  {
    "FromDate": "2024-01-01",
    "ToDate": "2024-12-31",
    "TotalTransactionsAmount": "$1,000.00",
    "BrokerageTransactions": [...]
  }
  ```

---

## Test 5: JSON Upload - Error Handling

### Steps
1. Click "Upload JSON" button
2. Select an invalid file (e.g., a CSV file, or malformed JSON)
3. Attempt to upload

### Expected Results
- [ ] Error message appears: "Failed to process JSON file: [error message]"
- [ ] Error message is clear and helpful
- [ ] Application does not crash
- [ ] User can try uploading again

---

## Test 6: Upload from Header Menu

### Steps
1. After initial upload, ensure portfolio is loaded
2. Click "Upload Files" button in the header
3. Dropdown menu should appear with options:
   - Portfolio Snapshot (CSV)
   - Transaction History (JSON)
4. Click "Portfolio Snapshot"
5. Upload a CSV file

### Expected Results
- [ ] Dropdown menu appears when clicking "Upload Files"
- [ ] Both options are visible and clickable
- [ ] Selecting "Portfolio Snapshot" opens CSV file picker
- [ ] Selecting "Transaction History" opens JSON file picker
- [ ] Upload process works correctly from header menu

---

## Test 7: File Size Validation

### Steps
1. Create a very large CSV file (>10MB) or JSON file (>50MB)
2. Attempt to upload

### Expected Results
- [ ] File size validation occurs
- [ ] Error message: "File size too large. Please upload a file smaller than XMB"
- [ ] Large file is rejected before processing
- [ ] Application does not attempt to process large file

---

## Test 8: Account Name Extraction

### Steps
1. Upload a CSV file with account name in filename (e.g., `Roth_Contributory_IRA-Positions-2021-11-20-071958.CSV`)
2. Check that account name is correctly extracted

### Expected Results
- [ ] Account name is extracted from filename
- [ ] Account name appears in account selector
- [ ] Portfolio is associated with correct account
- [ ] If account name cannot be extracted, default is used

---

## Test 9: Date Extraction

### Steps
1. Upload a CSV file with date in filename (e.g., `Roth_Contributory_IRA-Positions-2021-11-20-071958.CSV`)
2. Check that date is correctly extracted

### Expected Results
- [ ] Date is extracted from filename
- [ ] Portfolio date appears in header
- [ ] Date is used for portfolio snapshot
- [ ] If date cannot be extracted, current date is used

---

## Test 10: Multiple File Uploads

### Steps
1. Upload a CSV file
2. Wait for processing to complete
3. Upload another CSV file (different date)
4. Upload a JSON file

### Expected Results
- [ ] Multiple CSV files can be uploaded
- [ ] Each upload is processed independently
- [ ] JSON file can be uploaded after CSV
- [ ] All files are stored in IndexedDB
- [ ] Portfolio data updates correctly after each upload

---

## Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| Test 1: CSV Upload - Basic | ⬜ Pass / ⬜ Fail | |
| Test 2: CSV Upload - Error Handling | ⬜ Pass / ⬜ Fail | |
| Test 3: CSV Upload - Duplicate | ⬜ Pass / ⬜ Fail | |
| Test 4: JSON Upload - Basic | ⬜ Pass / ⬜ Fail | |
| Test 5: JSON Upload - Error Handling | ⬜ Pass / ⬜ Fail | |
| Test 6: Upload from Header | ⬜ Pass / ⬜ Fail | |
| Test 7: File Size Validation | ⬜ Pass / ⬜ Fail | |
| Test 8: Account Name Extraction | ⬜ Pass / ⬜ Fail | |
| Test 9: Date Extraction | ⬜ Pass / ⬜ Fail | |
| Test 10: Multiple Uploads | ⬜ Pass / ⬜ Fail | |

---

## Issues Found

List any issues discovered during testing:

1. 
2. 
3. 

---

## Browser Information

- Browser: 
- Version: 
- OS: 
- Date Tested: 

