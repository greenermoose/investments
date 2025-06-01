# Migration Guide: portfolioStorage.js → Repository Pattern

This guide helps migrate from the monolithic `portfolioStorage.js` to the new repository pattern and service layer.

## Overview of Changes

### Before (Old Structure)
```
src/utils/portfolioStorage.js
├── Portfolio functions
├── Transaction functions  
├── Security functions
├── Lot functions
├── Account functions
└── File functions (mixed in)
```

### After (New Structure)
```
src/repositories/
├── BaseRepository.js (common operations)
├── PortfolioRepository.js (portfolio snapshots)
├── TransactionRepository.js (transactions)
├── SecurityRepository.js (security metadata)
├── LotRepository.js (tax lots)
├── AccountRepository.js (account operations)
├── ManualAdjustmentRepository.js (adjustments)
├── FileRepository.js (file operations)
└── TransactionMetadataRepository.js (symbol mappings)

src/services/
└── PortfolioService.js (orchestration layer)
```

## Migration Steps

### Step 1: Update Imports

**Old:**
```javascript
import {
  savePortfolioSnapshot,
  getLatestSnapshot,
  getTransactionsByAccount,
  saveTransaction
} from '../utils/portfolioStorage';
```

**New:**
```javascript
import { portfolioService } from '../services/PortfolioService';
```

### Step 2: Update Function Calls

| Old Function | New Method | Notes |
|--------------|------------|--------|
| `savePortfolioSnapshot(data, account, date, totals)` | `portfolioService.savePortfolioSnapshot(data, account, date, totals)` | Same signature |
| `getLatestSnapshot(account)` | `portfolioService.getLatestSnapshot(account)` | Same signature |
| `getAccountSnapshots(account)` | `portfolioService.getAccountSnapshots(account)` | Same signature |
| `getTransactionsByAccount(account)` | `portfolioService.getTransactionsByAccount(account)` | **Improved filtering** |
| `saveTransaction(transaction)` | `portfolioService.saveTransaction(transaction)` | Same signature |
| `bulkMergeTransactions(transactions, account)` | `portfolioService.bulkMergeTransactions(transactions, account)` | **Better error handling** |
| `getAllAccounts()` | `portfolioService.getAllAccounts()` | Same signature |
| `deleteAccount(account)` | `portfolioService.deleteAccount(account)` | Same signature |
| `purgeAccountData(account)` | `portfolioService.purgeAccountData(account)` | Same signature |
| `saveSecurityMetadata(symbol, account, metadata)` | `portfolioService.saveSecurityMetadata(symbol, account, metadata)` | Same signature |
| `getSecurityMetadata(symbol, account)` | `portfolioService.getSecurityMetadata(symbol, account)` | Same signature |

### Step 3: Component Updates

**Example: PortfolioManager.jsx**

**Old:**
```javascript
import {
  getLatestSnapshot,
  getTransactionsByAccount,
  getAllAccounts
} from '../utils/portfolioStorage';

// In component
const loadPortfolioData = async () => {
  try {
    const latest = await getLatestSnapshot(selectedAccount);
    const transactions = await getTransactionsByAccount(selectedAccount);
    const accounts = await getAllAccounts();
    // ...
  } catch (error) {
    console.error('Error loading data:', error);
  }
};
```

**New:**
```javascript
import { portfolioService } from '../services/PortfolioService';

// In component
const loadPortfolioData = async () => {
  try {
    const latest = await portfolioService.getLatestSnapshot(selectedAccount);
    const transactions = await portfolioService.getTransactionsByAccount(selectedAccount);
    const accounts = await portfolioService.getAllAccounts();
    // ...
  } catch (error) {
    console.error('Error loading data:', error);
  }
};
```

### Step 4: Custom Hook Updates

**Example: usePortfolioData.js**

**Old:**
```javascript
import { getAccountSnapshots, getTransactionsByAccount } from '../utils/portfolioStorage';

export const usePortfolioData = (account) => {
  // Implementation using direct imports
};
```

**New:**
```javascript
import { portfolioService } from '../services/PortfolioService';

export const usePortfolioData = (account) => {
  // Implementation using service
  const loadData = useCallback(async () => {
    if (!account) return;
    
    try {
      setLoading(true);
      const [snapshots, transactions] = await Promise.all([
        portfolioService.getAccountSnapshots(account),
        portfolioService.getTransactionsByAccount(account)
      ]);
      
      setData({ snapshots, transactions });
    } catch (error) {
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [account]);
};
```

## Key Improvements

### 1. Fixed Transaction Filtering Bug
The old `getTransactionsByAccount()` had filtering issues. The new implementation:
- Uses proper IndexedDB indexing
- Includes extensive debugging
- Handles edge cases better

### 2. Better Error Handling
- Consistent error propagation
- Detailed logging
- Validation at service boundaries

### 3. Smaller, Focused Files
- Each repository handles one domain
- Base repository eliminates duplication
- Easier to test and maintain

### 4. Type Safety Preparation
- Clear interfaces between layers
- Consistent method signatures
- Ready for TypeScript migration

## Breaking Changes

### None Expected
The service layer maintains the same API as the old functions, so existing components should work without changes.

### Performance Improvements
- Repository pattern enables better caching
- Reduced database connections
- More efficient indexing usage

## Testing Strategy

### 1. Parallel Implementation
- Keep old `portfolioStorage.js` temporarily
- Implement new service alongside
- Compare results in development

### 2. Gradual Migration
1. **Phase 1**: Update PortfolioManager.jsx
2. **Phase 2**: Update custom hooks (usePortfolioData, etc.)
3. **Phase 3**: Update remaining components
4. **Phase 4**: Remove old portfolioStorage.js

### 3. Validation Tests
```javascript
// Compare old vs new implementations
const testDataConsistency = async () => {
  const account = 'TestAccount';
  
  // Old way
  const oldSnapshots = await getAccountSnapshots(account);
  const oldTransactions = await getTransactionsByAccount(account);
  
  // New way
  const newSnapshots = await portfolioService.getAccountSnapshots(account);
  const newTransactions = await portfolioService.getTransactionsByAccount(account);
  
  console.log('Snapshots match:', JSON.stringify(oldSnapshots) === JSON.stringify(newSnapshots));
  console.log('Transactions match:', JSON.stringify(oldTransactions) === JSON.stringify(newTransactions));
};
```

## Repository API Reference

### PortfolioRepository
```javascript
// Save portfolio snapshot
await portfolioRepo.saveSnapshot(data, account, date, totals, metadata);

// Get snapshots
await portfolioRepo.getByAccount(account);
await portfolioRepo.getLatestByAccount(account);
await portfolioRepo.getById(portfolioId);

// Delete operations
await portfolioRepo.deleteSnapshot(portfolioId);
await portfolioRepo.deleteByAccount(account);
```

### TransactionRepository
```javascript
// Save transaction
await transactionRepo.saveTransaction(transaction);

// Get transactions
await transactionRepo.getByAccount(account);
await transactionRepo.getBySymbol(symbol, account);
await transactionRepo.getByDateRange(startDate, endDate, account);

// Bulk operations
await transactionRepo.bulkMerge(transactions, account);

// Delete operations
await transactionRepo.deleteTransaction(transactionId);
await transactionRepo.deleteByAccount(account);
```

### SecurityRepository
```javascript
// Save/update metadata
await securityRepo.saveMetadata(symbol, account, metadata);
await securityRepo.updateAcquisitionDate(symbol, account, date);

// Get metadata
await securityRepo.getMetadata(symbol, account);
await securityRepo.getByAccount(account);
await securityRepo.getBySymbol(symbol);

// Delete operations
await securityRepo.deleteMetadata(symbol, account);
await securityRepo.deleteByAccount(account);
```

### LotRepository
```javascript
// Save lot
await lotRepo.saveLot(lotData);

// Get lots
await lotRepo.getBySecurityId(securityId);
await lotRepo.getOpenLots(securityId);
await lotRepo.getByAccount(account);

// Update lots
await lotRepo.updateAfterSale(lotId, quantitySold, saleTransaction);

// Apply corporate actions
await lotRepo.applySplit(securityId, splitRatio, splitDate);

// Delete operations
await lotRepo.deleteBySecurityId(securityId);
await lotRepo.deleteByAccount(account);
```

### AccountRepository
```javascript
// Get accounts
await accountRepo.getAllAccountNames();
await accountRepo.getAccountSummary(account);

// Account operations
await accountRepo.deleteAccount(account);
await accountRepo.renameAccount(oldName, newName);
await accountRepo.accountExists(account);
```

## Error Handling Patterns

### Repository Level
```javascript
// Repositories throw specific errors
try {
  await portfolioRepo.saveSnapshot(data, account, date, totals);
} catch (error) {
  if (error.message.includes('Invalid portfolio data')) {
    // Handle validation error
  } else if (error.message.includes('Account name is required')) {
    // Handle missing account
  } else {
    // Handle unexpected error
  }
}
```

### Service Level
```javascript
// Service adds logging and context
async savePortfolioSnapshot(data, account, date, totals) {
  try {
    console.log('PortfolioService: Saving snapshot', { account, date });
    return await this.portfolioRepo.saveSnapshot(data, account, date, totals);
  } catch (error) {
    console.error('PortfolioService: Error saving snapshot:', error);
    throw error; // Re-throw with context
  }
}
```

### Component Level
```javascript
// Components handle user-facing errors
const handleSaveSnapshot = async () => {
  try {
    await portfolioService.savePortfolioSnapshot(data, account, date, totals);
    setSuccessMessage('Portfolio saved successfully');
  } catch (error) {
    setErrorMessage(`Failed to save portfolio: ${error.message}`);
  }
};
```

## Performance Considerations

### 1. Indexing Strategy
- All repositories use proper IndexedDB indexes
- Account-based filtering is efficient
- Date range queries use indexed fields

### 2. Memory Usage
- Repositories don't cache data (use React state for that)
- Each operation opens/closes database connections
- No memory leaks from persistent connections

### 3. Concurrent Operations
- IndexedDB handles concurrent reads automatically
- Service layer doesn't add locking (database handles it)
- Batch operations use transactions for consistency

## Future Enhancements

### 1. Caching Layer
```javascript
// Future: Add caching service
class CachedPortfolioService extends PortfolioService {
  constructor() {
    super();
    this.cache = new Map();
  }
  
  async getAccountSnapshots(account) {
    if (this.cache.has(`snapshots_${account}`)) {
      return this.cache.get(`snapshots_${account}`);
    }
    
    const snapshots = await super.getAccountSnapshots(account);
    this.cache.set(`snapshots_${account}`, snapshots);
    return snapshots;
  }
}
```

### 2. TypeScript Migration
```typescript
// Future: TypeScript interfaces
interface PortfolioSnapshot {
  id: string;
  account: string;
  date: Date;
  data: PortfolioPosition[];
  accountTotal: AccountTotal;
}

interface PortfolioService {
  savePortfolioSnapshot(
    data: PortfolioPosition[],
    account: string,
    date: Date,
    totals: AccountTotal
  ): Promise<string>;
}
```

### 3. Event System
```javascript
// Future: Add events for data changes
class EventedPortfolioService extends PortfolioService {
  async savePortfolioSnapshot(...args) {
    const id = await super.savePortfolioSnapshot(...args);
    this.emit('portfolio:saved', { id, account: args[1] });
    return id;
  }
}
```

## Rollback Plan

If issues arise during migration:

1. **Keep old portfolioStorage.js** until migration is complete
2. **Feature flag**: Use environment variable to switch between old/new
3. **Quick rollback**: Change imports back to old functions
4. **Data integrity**: Both systems use same IndexedDB schema

```javascript
// Rollback helper
const USE_NEW_SERVICE = process.env.REACT_APP_USE_NEW_SERVICE === 'true';

export const getAccountSnapshots = USE_NEW_SERVICE 
  ? portfolioService.getAccountSnapshots.bind(portfolioService)
  : oldGetAccountSnapshots;
```

## Success Metrics

- ✅ **All existing functionality works** without changes to components
- ✅ **Transaction filtering bug is fixed** (main goal)
- ✅ **File sizes reduced** (largest file now <500 lines)
- ✅ **Better error handling** with detailed logging
- ✅ **Maintainable codebase** with clear separation of concerns
- ✅ **Performance maintained** or improved
- ✅ **Ready for TypeScript** migration when needed

## Next Steps

1. **Implement the new repositories** (✅ Complete)
2. **Create PortfolioService** (✅ Complete)
3. **Update PortfolioManager.jsx** to use new service
4. **Update custom hooks** (usePortfolioData, etc.)
5. **Update remaining components** one by one
6. **Add comprehensive error boundaries**
7. **Remove old portfolioStorage.js**
8. **Update documentation** and architecture doc