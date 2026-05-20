import { DatabaseService } from './DatabaseService.js';
import { BrokerageParser } from './BrokerageParser.js';

export const PortfolioProcessor = {
  /**
   * Processes an uploaded file (position or transaction), reconciles data across
   * existing files to identify the account, and updates the database with 
   * ownership history and quantities.
   */
  async processAllFiles(filesArray) {
    // 1. Separate positions and transactions
    const positionFiles = [];
    const transactionFiles = [];
    
    for (const file of filesArray) {
      const decoder = new TextDecoder();
      const text = decoder.decode(file.content);
      
      if (file.exportType === 'positions') {
        positionFiles.push({ file, text, data: BrokerageParser.parsePositions(text) });
      } else if (file.exportType === 'transactions') {
        transactionFiles.push({ file, text, data: BrokerageParser.parseTransactions(text) });
      }
    }
    
    // Group files by heuristic account
    const accounts = this._groupFilesByAccount(positionFiles, transactionFiles);
    
    // For each account, rebuild equity ownership
    for (const account of accounts) {
      await this._rebuildAccountEquities(account);
    }
  },

  _groupFilesByAccount(positionFiles, transactionFiles) {
    const accounts = [];
    
    // Helper to find or create an account bucket
    const getAccountBucket = (identifier, sampleSymbols) => {
      // Fuzzy match by name if identifier exists
      if (identifier) {
        const found = accounts.find(a => a.identifiers.some(id => id.includes(identifier) || identifier.includes(id)));
        if (found) {
          found.identifiers.push(identifier);
          return found;
        }
      }
      
      // Heuristic match by overlapping symbols
      if (sampleSymbols && sampleSymbols.length > 0) {
        for (const acc of accounts) {
           const overlap = acc.allSymbols.filter(s => sampleSymbols.includes(s));
           if (overlap.length >= Math.min(2, sampleSymbols.length)) { // Just a basic heuristic
              if (identifier) acc.identifiers.push(identifier);
              acc.allSymbols.push(...sampleSymbols);
              return acc;
           }
        }
      }
      
      // Create new
      const newAcc = {
        identifiers: identifier ? [identifier] : [],
        allSymbols: sampleSymbols ? [...sampleSymbols] : [],
        positionFiles: [],
        transactionFiles: []
      };
      accounts.push(newAcc);
      return newAcc;
    };

    // First process positions because they often have explicit names
    for (const pf of positionFiles) {
      let identifier = null;
      const firstLine = pf.text.split('\n')[0] || '';
      const match = firstLine.match(/Positions for account (.*?) as of/);
      if (match) {
        identifier = match[1].trim();
      }
      const symbols = pf.data.positions.map(p => p.symbol);
      const acc = getAccountBucket(identifier, symbols);
      acc.positionFiles.push(pf);
    }

    // Process transactions
    for (const tf of transactionFiles) {
      // Try to extract an identifier from filename, e.g., "Roth_Contributory_IRA_XXX348"
      let identifier = tf.file.name.replace(/_Transactions.*/, '').replace(/-Positions.*/, '').replace(/_/g, ' ').trim();
      
      const symbols = [...new Set(tf.data.transactions.map(t => t.symbol).filter(s => s))];
      const acc = getAccountBucket(identifier, symbols);
      acc.transactionFiles.push(tf);
    }

    return accounts;
  },

  async _rebuildAccountEquities(account) {
    // Collect all transactions, sort by date chronologically
    let allTx = [];
    for (const tf of account.transactionFiles) {
      allTx.push(...tf.data.transactions);
    }
    
    // Sort oldest to newest
    allTx.sort((a, b) => new Date(a.date.split(' as of ')[0]) - new Date(b.date.split(' as of ')[0]));
    
    // Process position snapshots
    let positionSnapshots = account.positionFiles.map(pf => pf.data);
    positionSnapshots.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Dictionary to hold running state of equities
    const equityState = {}; // { symbol: { quantity: 0, firstSeen: null, lastSeen: null, history: [] } }

    const ensureEquity = (symbol) => {
      if (!equityState[symbol]) {
        equityState[symbol] = {
          quantity: 0,
          firstSeen: null,
          lastSeen: null,
          history: [] // { start, end, quantity }
        };
      }
      return equityState[symbol];
    };

    // We will find the minimum date across all files to bound inferred dates
    let minDate = new Date();
    if (allTx.length > 0) minDate = new Date(allTx[0].date.split(' as of ')[0]);
    if (positionSnapshots.length > 0) {
      const posDate = new Date(positionSnapshots[0].date);
      if (posDate < minDate) minDate = posDate;
    }
    
    // 1. Process transactions
    for (const tx of allTx) {
      if (!tx.symbol) continue;
      const state = ensureEquity(tx.symbol);
      const date = tx.date.split(' as of ')[0];
      
      if (!state.firstSeen) {
        // First time seeing this symbol
        if (tx.action.includes('Sell')) {
          // Inferred ownership prior to this tx
          state.firstSeen = minDate.toISOString().split('T')[0];
        } else {
          state.firstSeen = new Date(date).toISOString().split('T')[0];
        }
      }
      
      state.lastSeen = new Date(date).toISOString().split('T')[0];
      
      // Update quantity
      const action = tx.action.toLowerCase();
      if (action.includes('buy') || action.includes('reinvest') || action.includes('assigned')) {
        state.quantity += tx.quantity;
      } else if (action.includes('sell')) {
        state.quantity -= tx.quantity;
      } else if (action.includes('split')) {
        // Heuristic: If it's a stock split, the 'quantity' might be the additional shares or the new total.
        // Assuming additional shares for now based on common CSV formats.
        state.quantity += tx.quantity;
      }
      
      // Keep track of history points if quantity hits 0
      if (state.quantity <= 0.001 && state.quantity >= -0.001) {
         state.quantity = 0;
         state.history.push({
             start: state.firstSeen,
             end: state.lastSeen,
             quantity: 0
         });
         state.firstSeen = null; // Reset for next buy
      }
    }
    
    // 2. Reconcile with latest Position snapshot
    // If we have a position snapshot after the last transaction, we trust the snapshot quantity.
    if (positionSnapshots.length > 0) {
      const latestSnapshot = positionSnapshots[positionSnapshots.length - 1];
      const snapshotDate = new Date(latestSnapshot.date).toISOString().split('T')[0];
      
      for (const pos of latestSnapshot.positions) {
         const state = ensureEquity(pos.symbol);
         if (!state.firstSeen) {
             state.firstSeen = minDate.toISOString().split('T')[0];
         }
         state.lastSeen = snapshotDate;
         // In a real robust system, we'd log the discrepancy. Here we trust the position file as absolute truth for this date.
         state.quantity = pos.quantity || state.quantity; // Assuming we add quantity to position parser later, otherwise we use tx quantity
         state.description = pos.description;
         state.assetType = pos.assetType;
      }
    }

    // 3. Save to Database
    for (const [symbol, state] of Object.entries(equityState)) {
      if (!symbol) continue;
      
      // Save current open interval if quantity > 0
      if (state.quantity > 0 && state.firstSeen) {
          state.history.push({
              start: state.firstSeen,
              end: null, // still owned
              quantity: state.quantity
          });
      }
      
      // Consolidate histories and update
      const existing = await DatabaseService.getEquity(symbol);
      let companyId = existing ? existing.companyId : null;
      let assetType = existing ? existing.assetType : state.assetType;
      let description = state.description;

      if (!companyId && state.assetType === 'Equity' && state.description) {
         companyId = state.description;
         await DatabaseService.saveCompany({ id: companyId, name: companyId });
      } else if (!companyId && state.assetType === 'Option') {
         const baseSymbol = symbol.split(' ')[0];
         const baseEquity = await DatabaseService.getEquity(baseSymbol);
         if (baseEquity && baseEquity.companyId) {
            companyId = baseEquity.companyId;
         }
      }

      const mergedHistory = existing && existing.history ? [...existing.history] : [];
      // Simplistic append for now
      mergedHistory.push(...state.history);

      const firstSeenAllTime = mergedHistory.reduce((min, h) => !min || h.start < min ? h.start : min, null);
      const lastSeenAllTime = mergedHistory.reduce((max, h) => !max || (h.end && h.end > max) ? h.end : max, null);

      await DatabaseService.saveEquity({
        symbol: symbol,
        companyId: companyId,
        assetType: assetType || 'Equity',
        description: description,
        firstSeenDate: firstSeenAllTime || state.firstSeen,
        lastSeenDate: state.quantity > 0 ? null : (lastSeenAllTime || state.lastSeen),
        quantity: state.quantity,
        history: mergedHistory
      });
    }
  }
};
