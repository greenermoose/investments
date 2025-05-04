Implementation Plan
1. Overall UI/UX Approach

Account selector: I'll add it to the header next to the "Upload New Portfolio" button. This follows best practice of placing global navigation/selection controls at the top of the page.
Visual indicators: I'll use badges, icons, and color coding to show account status clearly.
Bulk operations: Checkboxes for multiple selection with batch action buttons.
Confirmation dialogs: Modal popups for all destructive actions with clear messaging.

2. Components to Create/Modify
New Components:

AccountSelector.jsx - Dropdown component in header for selecting which account to manage
AccountManagement.jsx - Main account management interface (new tab)
SnapshotCard.jsx - Individual snapshot card with delete option and bulk selection checkbox
DeleteConfirmationModal.jsx - Reusable confirmation modal for deletions
BackupManager.jsx - Component for exporting/importing all data

Modified Components:

PortfolioHeader.jsx - Add AccountSelector component
PortfolioManager.jsx - Add account management tab and route
PortfolioTabs.jsx - Add "Account Management" tab
PortfolioContext.jsx - Add account selection state management
usePortfolioData.js - Update to watch for selected account changes
usePortfolioNavigation.js - Add account management tab

3. Utility Functions to Add/Modify
New Functions in portfolioStorage.js:

deletePortfolioSnapshot() - Delete specific snapshot and related data
deleteAccount() - Remove entire account when no snapshots remain
exportAllData() - Export complete IndexedDB data
importAllData() - Import and restore IndexedDB data
getAccountSnapshots() - Update to handle empty accounts

New Functions in portfolioAnalyzer.js:

deleteSnapshotRelatedData() - Cascade delete securities/lots for a snapshot

4. Visual Indicators Design

Account status badges: Shows number of snapshots and date range
Empty state icon: Warning icon for accounts with no snapshots
Bulk selection UI: Checkbox with indeterminate state for partial selection
Color coding: Red for delete actions, yellow for warnings, green for success

5. Flow Design
Account Selection Flow:

User selects account from dropdown → Updates context state → Refreshes data

Deletion Flow:

Single delete: Click delete icon → Confirmation modal → Delete → Update UI
Bulk delete: Select checkboxes → Click bulk delete → Confirmation modal → Delete all → Update UI
Account deletion: Delete last snapshot → Warning modal about account removal → Confirm → Delete account

Backup Flow:

Export: Click export → Generate JSON file → Download
Import: Click import → Select file → Validate → Import → Refresh UI

6. Implementation Order:

Add account management utilities in portfolioStorage.js
Create AccountSelector.jsx and integrate into header
Create account management tab with AccountManagement.jsx
Add snapshot deletion functionality
Implement bulk operations
Add backup/restore functionality
Update all related context and hooks