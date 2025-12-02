# Acceptance Tests: Portfolio Display and Management

## Overview
These tests verify that portfolio data displays correctly and portfolio management features work.

## Prerequisites
- Application is running in browser
- At least one portfolio CSV file has been uploaded
- Portfolio data is loaded and visible

---

## Test 1: Portfolio Overview Display

### Steps
1. Upload a CSV file and wait for it to load
2. View the portfolio overview (default tab)

### Expected Results
- [ ] Portfolio header shows portfolio date
- [ ] Portfolio statistics are displayed:
  - [ ] Total portfolio value
  - [ ] Total gain/loss (dollar amount)
  - [ ] Gain/loss percentage
- [ ] Asset allocation is shown (if available)
- [ ] Top holdings are displayed
- [ ] All values are formatted correctly (currency, percentages)

---

## Test 2: Positions Tab

### Steps
1. Navigate to "Positions" tab
2. View the positions table

### Expected Results
- [ ] All positions from CSV are displayed
- [ ] Table columns are visible:
  - [ ] Symbol
  - [ ] Description
  - [ ] Quantity
  - [ ] Price
  - [ ] Market Value
  - [ ] Gain/Loss
- [ ] Data is sorted (default sort)
- [ ] Values are formatted correctly
- [ ] No duplicate positions
- [ ] Account Total row is excluded (if present in CSV)

---

## Test 3: Position Sorting

### Steps
1. Go to Positions tab
2. Click on column headers to sort

### Expected Results
- [ ] Clicking a column header sorts by that column
- [ ] Sort order toggles (ascending/descending)
- [ ] Sort indicator is visible
- [ ] All positions are reordered correctly
- [ ] Sorting works for all sortable columns

---

## Test 4: Position Filtering

### Steps
1. Go to Positions tab
2. Use any filter controls (if available)

### Expected Results
- [ ] Filters are available and functional
- [ ] Filtered results update correctly
- [ ] Filter can be cleared
- [ ] Multiple filters can be applied

---

## Test 5: Position Details

### Steps
1. Go to Positions tab
2. Click on a position/symbol

### Expected Results
- [ ] Clicking a symbol navigates to security detail view
- [ ] Security detail shows:
  - [ ] Symbol and description
  - [ ] Current position information
  - [ ] Transaction history (if available)
  - [ ] Lot information (if available)
- [ ] Back button returns to portfolio view

---

## Test 6: Portfolio Statistics Calculation

### Steps
1. View portfolio overview
2. Manually verify statistics match CSV data

### Expected Results
- [ ] Total portfolio value matches sum of all positions
- [ ] Total gain/loss matches sum of individual gains/losses
- [ ] Gain percentage is calculated correctly
- [ ] Asset allocation percentages add up to 100% (approximately)

---

## Test 7: Account Selector

### Steps
1. Upload multiple CSV files with different account names
2. Use account selector in header

### Expected Results
- [ ] Account selector appears in header
- [ ] All accounts are listed
- [ ] Selecting an account loads that account's portfolio
- [ ] Portfolio data updates correctly
- [ ] Current account is highlighted/indicated

---

## Test 8: Portfolio Date Display

### Steps
1. View portfolio with date from filename
2. Check date display in header

### Expected Results
- [ ] Portfolio date is displayed in header
- [ ] Date format is readable (e.g., "April 27, 2025")
- [ ] Date matches the date from CSV file or filename
- [ ] Date updates when new portfolio is loaded

---

## Test 9: Export Portfolio Data

### Steps
1. Go to Positions tab
2. Click "Export CSV" button (if available)

### Expected Results
- [ ] Export button is visible and clickable
- [ ] Clicking export downloads a CSV file
- [ ] Downloaded file contains current portfolio data
- [ ] File format matches expected CSV structure
- [ ] All positions are included in export

---

## Test 10: Portfolio Performance Metrics

### Steps
1. View portfolio overview
2. Check performance metrics

### Expected Results
- [ ] Top performers are identified
- [ ] Underperformers are identified
- [ ] Performance percentages are accurate
- [ ] Metrics are calculated correctly

---

## Test 11: Multiple Portfolio Snapshots

### Steps
1. Upload multiple CSV files from different dates
2. Navigate between snapshots (if history feature exists)

### Expected Results
- [ ] Multiple snapshots are stored
- [ ] Can view different snapshots
- [ ] Snapshot dates are displayed
- [ ] Data updates when switching snapshots
- [ ] History comparison works (if available)

---

## Test 12: Empty Portfolio Handling

### Steps
1. Clear all data (or use fresh browser)
2. Try to view portfolio without data

### Expected Results
- [ ] Appropriate message is shown when no data
- [ ] Upload prompts are visible
- [ ] Application does not crash
- [ ] User can upload data to get started

---

## Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| Test 1: Portfolio Overview | ⬜ Pass / ⬜ Fail | |
| Test 2: Positions Tab | ⬜ Pass / ⬜ Fail | |
| Test 3: Position Sorting | ⬜ Pass / ⬜ Fail | |
| Test 4: Position Filtering | ⬜ Pass / ⬜ Fail | |
| Test 5: Position Details | ⬜ Pass / ⬜ Fail | |
| Test 6: Statistics Calculation | ⬜ Pass / ⬜ Fail | |
| Test 7: Account Selector | ⬜ Pass / ⬜ Fail | |
| Test 8: Portfolio Date Display | ⬜ Pass / ⬜ Fail | |
| Test 9: Export Portfolio | ⬜ Pass / ⬜ Fail | |
| Test 10: Performance Metrics | ⬜ Pass / ⬜ Fail | |
| Test 11: Multiple Snapshots | ⬜ Pass / ⬜ Fail | |
| Test 12: Empty Portfolio | ⬜ Pass / ⬜ Fail | |

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

