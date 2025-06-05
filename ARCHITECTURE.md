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
2. Files stored in IndexedDB via fileStorage
3. fileProcessing identifies and classifies file type
4. Based on classification:
   - Portfolio snapshots parsed by parseSnapshot
   - Transaction files parsed by parseTransactions
5. Normalized data stored in IndexedDB
6. Components fetch data via storage utilities
7. Context providers manage shared state
8. UI renders current state

## Module Organization

### /utils (Data Layer)
- **portfolioStorage.js** : Core IndexedDB operations
- **transactionEngine.js** : Transaction parsing/categorization
- **fileProcessing.js** : File type identification and classification
- **parseSnapshot.js** : Portfolio snapshot CSV parsing
- **parseTransactions.js** : Transaction JSON parsing
- **fileStorage.js** : File storage and deduplication
- **portfolioTracker.js** : Portfolio/transaction reconciliation
- **lotTracker.js** : Tax lot calculations
- **databaseUtils.js** : IndexedDB initialization
- **dataUtils.js** : Data formatting utilities
- **portfolioPerformanceMetrics.js** : Return calculations

### /components (UI Layer)
- **PortfolioManager.jsx**: Main app component
- **FileUploader.jsx**: Consolidated file upload (needs completion)
- **LotManager.jsx**: Tax lot management interface
- **TransactionViewer.jsx**: Transaction history display
- **AccountManagement.jsx**: Account administration
- **StorageManager.jsx**: Data storage management
- **SecurityDetail.jsx**: Individual security analysis
- **/performance**: Performance chart components

### /hooks (Business Logic)
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
- ~~Consolidate file upload components~~
- ~~Separate parsing from storage logic~~
- Add progress indicators
- Improve error messages
- Add validation for file formats
- Implement retry logic for failed parses

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

## Debugging System

The application uses a centralized debugging system through `src/utils/debugConfig.js`. This system provides granular control over which components and categories of debug messages are displayed.

### Configuration

Debug settings are controlled through a configuration object with the following structure:

```javascript
const DEBUG_CONFIG = {
  enabled: true,  // Master switch for all debugging
  components: {
    componentName: {
      enabled: true,  // Enable/disable all debugging for this component
      categories: {
        categoryName: true  // Enable/disable specific categories
      }
    }
  }
}
```

### Available Components and Categories

- **database**
  - initialization
  - operations
  - errors

- **portfolio**
  - loading
  - storage
  - calculations
  - updates

- **transactions**
  - loading
  - processing
  - validation
  - storage

- **ui**
  - rendering
  - interactions
  - state
  - effects
  - load
  - stats

- **assetAllocation**
  - calculations
  - rendering
  - dataProcessing
  - updates

- **pipeline**
  - parsing
  - processing
  - storage
  - classification
  - validation

### Usage

To use the debugging system in your code:

1. Import the debug logging function:
```javascript
import { debugLog } from '../utils/debugConfig';
```

2. Call the function with component and category:
```javascript
debugLog('componentName', 'categoryName', 'Message', { data: 'object' });
```

Example:
```javascript
debugLog('portfolio', 'storage', 'Saving portfolio snapshot:', {
  accountName: 'My Account',
  positionsCount: 10
});
```

### Helper Functions

The debugging system provides several helper functions:

- `isDebugEnabled(component, category)`: Check if debugging is enabled for a component/category
- `setDebugEnabled(component, category, enabled)`: Enable/disable debugging for a component/category
- `setAllDebugEnabled(enabled)`: Enable/disable all debugging
- `getDebugConfig()`: Get the current debug configuration

### Best Practices

1. Always use the centralized `debugLog` function instead of `console.log`
2. Use appropriate component and category names
3. Include relevant data objects for debugging context
4. Keep debug messages concise and meaningful
5. Use the configuration to control debug output in different environments

### Example Configuration

To enable only portfolio and pipeline debugging:

```javascript
const DEBUG_CONFIG = {
  enabled: true,
  components: {
    portfolio: {
      enabled: true,
      categories: {
        storage: true,
        loading: false,
        calculations: false,
        updates: false
      }
    },
    pipeline: {
      enabled: true,
      categories: {
        parsing: true,
        processing: true,
        storage: true
      }
    }
  }
}
```

This configuration will only show debug messages from the portfolio storage and pipeline components, while suppressing all other debug output.