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
    file: {  // Main component for file operations
      enabled: true,
      categories: {
        storage: true,    // File storage operations
        processing: true, // File processing and classification
        parsing: true,    // Content parsing operations
        error: true      // Error handling
      }
    },
    portfolio: {
      enabled: true,
      categories: {
        loading: true,
        storage: true,
        calculations: true,
        updates: true
      }
    },
    transactions: {
      enabled: true,
      categories: {
        loading: true,
        processing: true,
        validation: true,
        storage: true
      }
    }
  }
}
```

### File Processing Stages

The file processing pipeline follows these stages, each with its own debugging messages:

1. **File Storage Stage**
   ```
   [file:storage] Starting file save
   [file:storage] Calculated file hash
   [file:storage] Generated file ID
   [file:storage] Saving file record
   [file:storage] File saved successfully
   ```

2. **File Processing Stage**
   ```
   [file:processing] Starting file processing
   [file:classification] Starting file classification
   [file:classification] Analyzing CSV content
   [file:classification] Found portfolio snapshot headers
   [file:processing] File classified
   [file:processing] Processing as portfolio snapshot
   [file:processing] File processing complete
   ```

3. **Content Parsing Stage**
   ```
   [file:parsing] Starting CSV parsing
   [file:parsing] Split content into lines
   [file:parsing] Found header row
   [file:parsing] Processing line
   [file:parsing] Parsed line as JSON
   [file:parsing] Created position object
   [file:parsing] CSV parsing complete
   ```

### Debug Message Structure

Each debug message follows this structure:
```javascript
debugLog(component, category, message, {
  // Context data
  filename: string,
  fileType: string,
  contentLength: number,
  lineNumber?: number,
  totalLines?: number,
  // Stage-specific data
  fileHash?: string,
  classification?: string,
  positionsFound?: number,
  skippedLines?: number,
  errorLines?: number,
  // Error data (if applicable)
  error?: string,
  stack?: string
});
```

### Available Components and Categories

- **file**
  - storage: File storage operations
  - processing: File processing and classification
  - parsing: Content parsing operations
  - error: Error handling

- **portfolio**
  - loading: Portfolio data loading
  - storage: Portfolio data storage
  - calculations: Performance calculations
  - updates: Portfolio updates

- **transactions**
  - loading: Transaction data loading
  - processing: Transaction processing
  - validation: Transaction validation
  - storage: Transaction storage

### Usage

To use the debugging system in your code:

1. Import the debug logging function:
```javascript
import { debugLog } from '../utils/debugConfig';
```

2. Call the function with component and category:
```javascript
debugLog('file', 'storage', 'Starting file save', {
  filename: 'portfolio.csv',
  fileType: 'csv',
  contentLength: 1024
});
```

### Best Practices

1. Always use the centralized `debugLog` function instead of `console.log`
2. Use appropriate component and category names
3. Include relevant context data in the debug object
4. Keep debug messages concise and meaningful
5. Use the configuration to control debug output in different environments
6. Include error information when logging errors
7. Track progress metrics (lines processed, positions found, etc.)
8. Maintain consistent message format across stages

### Example Configuration

To enable only file processing debugging:

```javascript
const DEBUG_CONFIG = {
  enabled: true,
  components: {
    file: {
      enabled: true,
      categories: {
        storage: true,
        processing: true,
        parsing: true,
        error: true
      }
    }
  }
}
```

This configuration will show all file processing debug messages while suppressing other debug output.

### Error Handling

The debugging system includes special handling for errors:

1. Always include error context:
```javascript
debugLog('file', 'error', 'Error processing file', {
  filename: 'portfolio.csv',
  error: error.message,
  stack: error.stack,
  contentLength: content.length
});
```

2. Track error statistics:
```javascript
debugLog('file', 'parsing', 'CSV parsing complete', {
  totalPositions: positions.length,
  totalLines: lines.length,
  skippedLines: skippedLines,
  errorLines: errorLines
});
```

3. Include recovery information:
```javascript
debugLog('file', 'processing', 'File processing complete', {
  filename: 'portfolio.csv',
  classification: 'portfolio_snapshot',
  success: result.success,
  error: result.error
});
```

This debugging system helps track the flow of data through the application and diagnose issues quickly.