# Acceptance Tests: Data Persistence

## Overview
These tests verify that data is correctly stored in IndexedDB and persists across sessions.

## Prerequisites
- Application is running in browser
- Browser DevTools is open (Application → IndexedDB)
- No existing data (or clear data before testing)

---

## Test 1: Portfolio Data Persistence

### Steps
1. Upload a CSV file
2. Wait for processing to complete
3. Open DevTools → Application → IndexedDB
4. Check "portfolios" object store

### Expected Results
- [ ] Portfolio data is stored in IndexedDB
- [ ] Portfolio record contains:
  - [ ] ID
  - [ ] Account name
  - [ ] Date
  - [ ] Portfolio data array
  - [ ] Account total
- [ ] Data structure matches expected format
- [ ] All positions are stored

---

## Test 2: File Storage Persistence

### Steps
1. Upload a CSV file
2. Check "files" object store in IndexedDB

### Expected Results
- [ ] File record is created in "files" store
- [ ] File record contains:
  - [ ] File ID
  - [ ] Filename
  - [ ] Account name
  - [ ] File type (CSV/JSON)
  - [ ] File content
  - [ ] Upload date
  - [ ] Processed flag
- [ ] File hash is calculated and stored
- [ ] File metadata is correct

---

## Test 3: Transaction Data Persistence

### Steps
1. Upload a JSON transaction file
2. Check "transactions" object store in IndexedDB

### Expected Results
- [ ] Transaction records are created
- [ ] Each transaction contains:
  - [ ] Transaction ID
  - [ ] Date
  - [ ] Type (Buy/Sell)
  - [ ] Symbol
  - [ ] Quantity
  - [ ] Price
  - [ ] Account
- [ ] All transactions from JSON are stored
- [ ] Duplicate transactions are handled correctly

---

## Test 4: Account Data Persistence

### Steps
1. Upload CSV files with different account names
2. Check "accounts" object store (if exists)

### Expected Results
- [ ] Account records are created
- [ ] Each account has:
  - [ ] Account name
  - [ ] Associated portfolios
  - [ ] Metadata
- [ ] Multiple accounts can exist
- [ ] Account data is linked to portfolios

---

## Test 5: Data Persistence Across Refresh

### Steps
1. Upload a CSV file
2. Wait for processing
3. Refresh browser (F5)
4. Check if data is still present

### Expected Results
- [ ] Portfolio data persists after refresh
- [ ] Portfolio loads automatically
- [ ] All positions are visible
- [ ] Account selector shows uploaded account
- [ ] No data loss

---

## Test 6: Data Persistence Across Sessions

### Steps
1. Upload a CSV file
2. Close browser completely
3. Reopen browser and navigate to application
4. Check if data is still present

### Expected Results
- [ ] Portfolio data persists after browser close
- [ ] Application loads with last viewed portfolio
- [ ] All data is intact
- [ ] No errors on load

---

## Test 7: Multiple Portfolio Snapshots

### Steps
1. Upload CSV file from date 1
2. Upload CSV file from date 2 (same account)
3. Check portfolios store

### Expected Results
- [ ] Multiple portfolio records exist
- [ ] Each has unique ID
- [ ] Dates are different
- [ ] Both are associated with same account
- [ ] Can switch between snapshots

---

## Test 8: Duplicate File Detection

### Steps
1. Upload a CSV file
2. Note the file hash (check console or IndexedDB)
3. Upload the same file again
4. Check files store

### Expected Results
- [ ] Duplicate file is detected
- [ ] File hash matches existing file
- [ ] Duplicate is handled (either skipped or flagged)
- [ ] No duplicate file records created
- [ ] User is notified (if implemented)

---

## Test 9: Data Integrity

### Steps
1. Upload a CSV file
2. Manually verify data in IndexedDB matches CSV content
3. Check for data corruption

### Expected Results
- [ ] All positions from CSV are stored
- [ ] Numeric values are correct
- [ ] Text values are preserved
- [ ] Dates are stored correctly
- [ ] No data corruption or loss

---

## Test 10: Database Indexes

### Steps
1. Check IndexedDB structure in DevTools
2. Verify indexes exist

### Expected Results
- [ ] Indexes are created for:
  - [ ] Account name (portfolios store)
  - [ ] Date (portfolios store)
  - [ ] Symbol (transactions store)
  - [ ] File hash (files store)
  - [ ] Filename (files store)
- [ ] Indexes are functional
- [ ] Queries using indexes work correctly

---

## Test 11: Data Cleanup

### Steps
1. Upload multiple files
2. Use "Manage Storage" to delete data
3. Check IndexedDB

### Expected Results
- [ ] Data can be deleted
- [ ] Deletion removes records from IndexedDB
- [ ] Related data is cleaned up (if cascade delete implemented)
- [ ] Database structure remains intact
- [ ] Can upload new data after cleanup

---

## Test 12: Large Dataset Handling

### Steps
1. Upload a CSV file with many positions (100+)
2. Check IndexedDB performance

### Expected Results
- [ ] All positions are stored
- [ ] Storage operation completes in reasonable time
- [ ] No performance issues
- [ ] Data can be retrieved quickly
- [ ] UI remains responsive

---

## Test 13: Database Version Migration

### Steps
1. Check database version in DevTools
2. Verify version matches expected version

### Expected Results
- [ ] Database version is correct
- [ ] Version upgrades work (if version changes)
- [ ] Data migration works (if needed)
- [ ] No data loss during migration

---

## Test 14: Cross-Browser Compatibility

### Steps
1. Test in Chrome
2. Test in Firefox
3. Test in Safari (if available)
4. Test in Edge (if available)

### Expected Results
- [ ] Data persists in all browsers
- [ ] IndexedDB works in all browsers
- [ ] No browser-specific issues
- [ ] Data format is compatible

---

## Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| Test 1: Portfolio Persistence | ⬜ Pass / ⬜ Fail | |
| Test 2: File Storage | ⬜ Pass / ⬜ Fail | |
| Test 3: Transaction Persistence | ⬜ Pass / ⬜ Fail | |
| Test 4: Account Persistence | ⬜ Pass / ⬜ Fail | |
| Test 5: Refresh Persistence | ⬜ Pass / ⬜ Fail | |
| Test 6: Session Persistence | ⬜ Pass / ⬜ Fail | |
| Test 7: Multiple Snapshots | ⬜ Pass / ⬜ Fail | |
| Test 8: Duplicate Detection | ⬜ Pass / ⬜ Fail | |
| Test 9: Data Integrity | ⬜ Pass / ⬜ Fail | |
| Test 10: Database Indexes | ⬜ Pass / ⬜ Fail | |
| Test 11: Data Cleanup | ⬜ Pass / ⬜ Fail | |
| Test 12: Large Dataset | ⬜ Pass / ⬜ Fail | |
| Test 13: Version Migration | ⬜ Pass / ⬜ Fail | |
| Test 14: Cross-Browser | ⬜ Pass / ⬜ Fail | |

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

