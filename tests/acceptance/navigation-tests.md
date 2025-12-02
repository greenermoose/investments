# Acceptance Tests: Navigation and UI

## Overview
These tests verify that navigation between different views works correctly and the UI is functional.

## Prerequisites
- Application is running in browser
- Portfolio data has been uploaded and is loaded

---

## Test 1: Tab Navigation

### Steps
1. With portfolio loaded, click through all tabs:
   - Account Management
   - Portfolio
   - Transactions
   - Lots
   - Storage Manager

### Expected Results
- [ ] All tabs are visible and clickable
- [ ] Clicking a tab switches to that view
- [ ] Active tab is highlighted/indicated
- [ ] Content updates when switching tabs
- [ ] No errors in console when switching tabs

---

## Test 2: Header Navigation

### Steps
1. Click "Upload Files" button in header
2. Click "Manage Storage" button (if visible)
3. Use account selector dropdown

### Expected Results
- [ ] Header buttons are visible and functional
- [ ] Upload dropdown opens and closes correctly
- [ ] Storage manager button navigates to storage tab
- [ ] Account selector works correctly

---

## Test 3: Back Navigation

### Steps
1. Navigate to a security detail view (click on a symbol)
2. Click back button or use browser back

### Expected Results
- [ ] Back button is visible in security detail view
- [ ] Clicking back returns to previous view
- [ ] Previous view state is preserved
- [ ] Browser back button also works

---

## Test 4: Responsive Design

### Steps
1. Resize browser window to mobile size (< 768px)
2. Resize to tablet size (768px - 1024px)
3. Resize to desktop size (> 1024px)

### Expected Results
- [ ] Layout adapts to screen size
- [ ] Navigation is accessible on mobile
- [ ] Content is readable on all sizes
- [ ] Buttons are clickable on touch devices
- [ ] No horizontal scrolling on mobile

---

## Test 5: Loading States

### Steps
1. Upload a file
2. Observe loading indicators

### Expected Results
- [ ] Loading spinner appears during file processing
- [ ] "Processing file..." message is visible
- [ ] Loading state prevents multiple uploads
- [ ] Loading indicator disappears when complete
- [ ] Error or success message appears after loading

---

## Test 6: Error Messages

### Steps
1. Try to upload an invalid file
2. Observe error handling

### Expected Results
- [ ] Error message appears in snackbar/alert
- [ ] Error message is clear and helpful
- [ ] Error message can be dismissed
- [ ] Application continues to function after error
- [ ] User can retry the action

---

## Test 7: Success Messages

### Steps
1. Successfully upload a file
2. Observe success notification

### Expected Results
- [ ] Success message appears after upload
- [ ] Success message shows file name and summary
- [ ] Success message auto-dismisses after a few seconds
- [ ] Success message can be manually dismissed
- [ ] Message doesn't block UI interaction

---

## Test 8: Modal Dialogs

### Steps
1. Open file upload modal
2. Test modal behavior

### Expected Results
- [ ] Modal opens when upload button is clicked
- [ ] Modal shows correct title (CSV or JSON)
- [ ] File input is visible and functional
- [ ] Cancel button closes modal
- [ ] Clicking outside modal closes it (if implemented)
- [ ] Modal closes after file selection

---

## Test 9: Dropdown Menus

### Steps
1. Click "Upload Files" dropdown
2. Test dropdown behavior

### Expected Results
- [ ] Dropdown opens on click
- [ ] Both options (CSV and JSON) are visible
- [ ] Options are clickable
- [ ] Dropdown closes after selection
- [ ] Dropdown closes when clicking outside

---

## Test 10: Keyboard Navigation

### Steps
1. Use Tab key to navigate through UI
2. Use Enter/Space to activate buttons
3. Use Escape to close modals

### Expected Results
- [ ] Tab key moves focus through interactive elements
- [ ] Focus is visible (outline/highlight)
- [ ] Enter/Space activates buttons
- [ ] Escape closes modals and dropdowns
- [ ] Keyboard navigation is logical and intuitive

---

## Test 11: Browser Refresh

### Steps
1. Upload a file and load portfolio
2. Refresh the browser (F5 or Ctrl+R)
3. Check if data persists

### Expected Results
- [ ] Portfolio data persists after refresh
- [ ] Last viewed account is loaded
- [ ] UI state is restored
- [ ] No errors on page load
- [ ] Data loads quickly

---

## Test 12: Multiple Windows/Tabs

### Steps
1. Open application in one tab
2. Open same application in another tab
3. Upload file in one tab
4. Check other tab

### Expected Results
- [ ] Both tabs can be open simultaneously
- [ ] Data is shared between tabs (IndexedDB)
- [ ] Changes in one tab reflect in other (may need refresh)
- [ ] No conflicts or errors

---

## Test 13: Deep Linking

### Steps
1. Navigate to a specific view (e.g., security detail)
2. Copy URL
3. Open URL in new tab/window

### Expected Results
- [ ] URL reflects current view (if routing implemented)
- [ ] Direct URL access works
- [ ] View loads correctly from URL
- [ ] Navigation state is preserved

---

## Test 14: Info Tooltips

### Steps
1. Hover over info icon in header
2. Check tooltip/menu content

### Expected Results
- [ ] Info icon is visible
- [ ] Hovering shows tooltip/menu
- [ ] Tooltip content is helpful
- [ ] Tooltip doesn't block interaction
- [ ] Tooltip closes when clicking away

---

## Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| Test 1: Tab Navigation | ⬜ Pass / ⬜ Fail | |
| Test 2: Header Navigation | ⬜ Pass / ⬜ Fail | |
| Test 3: Back Navigation | ⬜ Pass / ⬜ Fail | |
| Test 4: Responsive Design | ⬜ Pass / ⬜ Fail | |
| Test 5: Loading States | ⬜ Pass / ⬜ Fail | |
| Test 6: Error Messages | ⬜ Pass / ⬜ Fail | |
| Test 7: Success Messages | ⬜ Pass / ⬜ Fail | |
| Test 8: Modal Dialogs | ⬜ Pass / ⬜ Fail | |
| Test 9: Dropdown Menus | ⬜ Pass / ⬜ Fail | |
| Test 10: Keyboard Navigation | ⬜ Pass / ⬜ Fail | |
| Test 11: Browser Refresh | ⬜ Pass / ⬜ Fail | |
| Test 12: Multiple Tabs | ⬜ Pass / ⬜ Fail | |
| Test 13: Deep Linking | ⬜ Pass / ⬜ Fail | |
| Test 14: Info Tooltips | ⬜ Pass / ⬜ Fail | |

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

