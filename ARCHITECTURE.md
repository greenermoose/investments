# Investment Portfolio Manager - Architecture Summary

## Overview
A React-based investment portfolio management application that enables users to track their investment portfolios across multiple accounts. The app supports importing portfolio snapshots (CSV) and transaction history (JSON) from brokerages, with local-only data storage using IndexedDB.

## Core Features
- **Multi-Account Portfolio Management**: Track multiple investment accounts
- **Portfolio Snapshot Tracking**: Import and compare portfolio states over time
- **Transaction History**: Import and analyze buy/sell transactions
- **Tax Lot Tracking**: FIFO/LIFO/Specific ID lot tracking methods
- **Performance Analytics**: Calculate returns, track gains/losses
- **Data Reconciliation**: Match transactions to portfolio positions
- **File Storage**: Store original uploaded files for audit trail

## Technical Stack
- **Frontend**: React 18.2 with functional components and hooks
- **State Management**: React Context API with custom hooks
- **Storage**: IndexedDB (no server, all data local)
- **Styling**: Tailwind CSS with custom CSS modules
- **Charts**: Recharts for data visualization
- **File Parsing**: Papa Parse (CSV), native JSON parsing
- **Build Tool**: Vite

## Database Schema (IndexedDB)
- **portfolios**: Snapshots of portfolio state at specific dates
- **securities**: Metadata about securities (acquisition dates, etc.)
- **lots**: Tax lot information for cost basis tracking
- **transactions**: Buy/sell transaction history
- **uploaded_files**: Original uploaded files
- **manual_adjustments**: User corrections to data
- **transaction_metadata**: Symbol mappings, corporate actions

## Architecture Patterns

### Component Structure
- **Container Components**: PortfolioManager (main orchestrator)
- **Feature Components**: LotManager, TransactionViewer, FileManager, etc.
- **Shared Components**: Modals, tables, form controls
- **Layout Components**: Header, Footer, Tabs

### State Management
- **PortfolioContext**: Main app state (portfolio data, stats)
- **AcquisitionContext**: Handles new security acquisitions
- **NavigationContext**: Tab/view management
- **AccountContext**: Current account selection

### Data Flow
1. User uploads CSV/JSON files
2. Files parsed and validated
3. Data stored in IndexedDB
4. Components fetch data via storage utilities
5. Context providers manage shared state
6. UI renders current state

## Module Organization

### /utils (Data Layer) - ~8,000 lines total
- **portfolioStorage.js** (2,500 lines): Core IndexedDB operations
- **transactionEngine.js** (500 lines): Transaction parsing/categorization
- **fileProcessing.js** (600 lines): CSV/JSON parsing logic
- **fileStorage.js** (700 lines): File storage and deduplication
- **portfolioTracker.js** (600 lines): Portfolio/transaction reconciliation
- **lotTracker.js** (800 lines): Tax lot calculations
- **databaseUtils.js** (400 lines): IndexedDB initialization
- **dataUtils.js** (500 lines): Data formatting utilities
- **portfolioPerformanceMetrics.js** (500 lines): Return calculations

### /components (UI Layer) - ~12,000 lines total
- **PortfolioManager.jsx**: Main app component
- **FileUploader.jsx**: Consolidated file upload (needs completion)
- **LotManager.jsx**: Tax lot management interface
- **TransactionViewer.jsx**: Transaction history display
- **AccountManagement.jsx**: Account administration
- **StorageManager.jsx**: Data storage management
- **SecurityDetail.jsx**: Individual security analysis
- **/performance**: Performance chart components

### /hooks (Business Logic) - ~1,000 lines
- **usePortfolioData**: Portfolio data fetching/caching
- **useFileUpload**: File upload handling
- **useAcquisitionModal**: New security acquisition flow
- **usePortfolioNavigation**: Navigation state

## Current Technical Debt

### High Priority Issues
1. **Monolithic Storage Module**: portfolioStorage.js needs splitting
2. **Duplicate Upload Components**: Multiple file upload implementations
3. **Transaction Storage Bug**: Account filtering not working correctly
4. **Context Re-renders**: Excessive re-renders from context updates

### Medium Priority Issues
1. **Error Handling**: Inconsistent error handling patterns
2. **Type Safety**: No TypeScript, prone to runtime errors
3. **File Size**: Large component files (300-1000 lines)
4. **Test Coverage**: No unit tests

### Low Priority Issues
1. **Code Duplication**: Similar logic in multiple places
2. **Magic Numbers**: Hardcoded values throughout
3. **Console Logs**: Debug statements left in code

## Refactoring Strategy

### Phase 1: Data Layer (Weeks 1-2)
- Split portfolioStorage.js into domain modules
- Create repository pattern for data access
- Add consistent error handling
- Improve transaction filtering

### Phase 2: File Processing (Week 3)
- Consolidate file upload components
- Separate parsing from storage logic
- Add progress indicators
- Improve error messages

### Phase 3: Component Architecture (Week 4)
- Reduce component file sizes
- Extract reusable components
- Implement proper loading states
- Add error boundaries

### Phase 4: State Management (Week 5)
- Optimize context usage
- Implement selective subscriptions
- Add caching layer
- Reduce unnecessary re-renders

## API Contracts to Preserve

### Storage APIs
```javascript
savePortfolioSnapshot(data, account, date, totals)
getLatestSnapshot(account)
getAccountSnapshots(account)
saveTransaction(transaction)
getTransactionsByAccount(account)
```

### Context APIs
```javascript
usePortfolio() // portfolioData, isLoading, error
useAcquisition() // pendingAcquisitions, handleSubmit
useNavigation() // activeTab, changeTab
useAccount() // selectedAccount, setSelectedAccount
```

## Success Metrics
- Reduce largest file from 2,500 to <500 lines
- Achieve <2 second load time for 10,000 transactions
- Eliminate transaction filtering bug
- Reduce context re-renders by 80%
- Add error boundaries to prevent crashes

## Development Workflow
1. Always preserve IndexedDB schema compatibility
2. Test with real brokerage data files
3. Maintain backwards compatibility
4. Update architecture doc after changes
5. Use feature flags for major changes