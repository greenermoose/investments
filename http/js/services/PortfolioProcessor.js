import { DatabaseService } from './DatabaseService.js';
import { BrokerageParser } from './BrokerageParser.js';
import { PortfolioValuation } from './PortfolioValuation.js';
import { SecApiService } from './SecApiService.js';

export const PortfolioProcessor = {
  /**
   * Processes an uploaded file (position or transaction), reconciles data across
   * existing files to identify the account, and updates the database with 
   * ownership history and quantities.
   */
  async processAllFiles(filesArray, onProgress) {
    if (onProgress) onProgress("Starting file processing...");
    // Clear old computed equities to prevent stale entries
    await DatabaseService.clearEquities();

    // 1. Separate positions and transactions
    if (onProgress) onProgress("Parsing positions and transactions...");
    const positionFiles = [];
    const transactionFiles = [];
    
    // Helper to parse dates
    const parseDateString = (dateStr) => {
      if (!dateStr) return null;
      const cleaned = dateStr.split(' as of ')[0].trim();
      const d = new Date(cleaned);
      return isNaN(d.getTime()) ? null : d;
    };

    let maxDateObj = null;
    let cutoffDate = null;

    for (const file of filesArray) {
      const decoder = new TextDecoder();
      const text = decoder.decode(file.content);
      
      if (file.exportType === 'positions') {
        const parsed = BrokerageParser.parsePositions(text);
        positionFiles.push({ file, text, data: parsed });
        
        const d = parseDateString(parsed.date);
        if (d && (!maxDateObj || d > maxDateObj)) {
          maxDateObj = d;
        }
      } else if (file.exportType === 'transactions') {
        const parsed = BrokerageParser.parseTransactions(text);
        transactionFiles.push({ file, text, data: parsed });
        
        const d = parseDateString(parsed.endDate);
        if (d && (!maxDateObj || d > maxDateObj)) {
          maxDateObj = d;
        }
        
        if (parsed.transactions && parsed.transactions.length > 0) {
          for (const tx of parsed.transactions) {
            const td = parseDateString(tx.date);
            if (td && (!maxDateObj || td > maxDateObj)) {
              maxDateObj = td;
            }
          }
        }
      }
    }

    if (maxDateObj) {
      const year = maxDateObj.getFullYear();
      const month = String(maxDateObj.getMonth() + 1).padStart(2, '0');
      const day = String(maxDateObj.getDate()).padStart(2, '0');
      cutoffDate = `${year}-${month}-${day}`;
    }
    
    // Group files by heuristic account
    const accounts = this._groupFilesByAccount(positionFiles, transactionFiles);
    
    // For each account, rebuild equity ownership
    for (let i = 0; i < accounts.length; i++) {
      if (onProgress) onProgress(`Rebuilding equity ownership for account ${i + 1} of ${accounts.length}...`);
      await this._rebuildAccountEquities(accounts[i], cutoffDate);
    }

    // Process background SEC data fetching for dirty companies
    await this._fetchSecDataForDirtyCompanies(onProgress);
  },

  async _fetchSecDataForDirtyCompanies(onProgress) {
    try {
      const companies = await DatabaseService.getAllCompanies();
      const dirtyCompanies = companies.filter(c => c.isSecDataClean === false);
      
      if (dirtyCompanies.length > 0 && onProgress) {
         onProgress(`Found ${dirtyCompanies.length} companies needing SEC data...`);
      }
      
      for (let i = 0; i < dirtyCompanies.length; i++) {
        const comp = dirtyCompanies[i];
        if (!comp.symbol) {
            comp.isSecDataClean = true;
            await DatabaseService.saveCompany(comp);
            continue;
        }
        
        if (onProgress) {
           onProgress(`Fetching SEC data for ${comp.name} (${comp.symbol})... [${i + 1}/${dirtyCompanies.length}]`);
        }
        
        try {
          await SecApiService.getFundamentals(comp.symbol);
        } catch (err) {
          console.warn(`Could not fetch SEC data for ${comp.symbol} (${comp.name}):`, err);
        } finally {
          comp.isSecDataClean = true;
          await DatabaseService.saveCompany(comp);
        }
      }
    } catch (e) {
      console.error("Error in background SEC data fetching:", e);
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

  _deduplicateTransactions(transactionFiles) {
    const makeKey = (tx) => {
      const normPrice = parseFloat(tx.price.toString().replace(/[^0-9.-]/g, '')) || 0;
      const normAmount = parseFloat(tx.amount.toString().replace(/[^0-9.-]/g, '')) || 0;
      const dateClean = tx.date.split(' as of ')[0].trim();
      return `${dateClean}|${tx.action.toLowerCase().trim()}|${tx.symbol.trim()}|${tx.quantity}|${normPrice.toFixed(4)}|${normAmount.toFixed(4)}`;
    };

    const fileTxMaps = transactionFiles.map(tf => {
      const map = new Map();
      for (const tx of tf.data.transactions) {
        const key = makeKey(tx);
        map.set(key, (map.get(key) || 0) + 1);
      }
      return map;
    });

    const globalTxCounts = new Map();
    for (const map of fileTxMaps) {
      for (const [key, count] of map.entries()) {
        const currentMax = globalTxCounts.get(key) || 0;
        if (count > currentMax) {
          globalTxCounts.set(key, count);
        }
      }
    }

    const keyToObj = new Map();
    for (const tf of transactionFiles) {
      for (const tx of tf.data.transactions) {
        const key = makeKey(tx);
        if (!keyToObj.has(key)) {
          keyToObj.set(key, tx);
        }
      }
    }

    const deduplicated = [];
    for (const [key, count] of globalTxCounts.entries()) {
      const txObj = keyToObj.get(key);
      for (let i = 0; i < count; i++) {
        deduplicated.push(txObj);
      }
    }
    return deduplicated;
  },

  async _rebuildAccountEquities(account, cutoffDate) {
    // Collect all transactions, deduplicate
    const allTx = this._deduplicateTransactions(account.transactionFiles);
    
    // Process position snapshots
    let positionSnapshots = account.positionFiles.map(pf => pf.data);
    positionSnapshots.sort((a, b) => new Date(a.date) - new Date(b.date));
    const latestSnapshot = positionSnapshots[positionSnapshots.length - 1] || null;
    
    // Run the valuation engine
    const valuation = PortfolioValuation.calculateValuation(allTx, latestSnapshot);

    // Save each holding to the Database
    for (const state of valuation.holdings) {
      if (!state.symbol) continue;

      const existing = await DatabaseService.getEquity(state.symbol);
      let companyId = existing ? existing.companyId : null;
      let description = state.description || (existing ? existing.description : '');

      if (!companyId && state.assetType === 'Equity' && description) {
         companyId = description;
      } else if (!companyId && state.assetType === 'Option') {
         const baseSymbol = state.symbol.split(' ')[0];
         const baseEquity = await DatabaseService.getEquity(baseSymbol);
         if (baseEquity && baseEquity.companyId) {
            companyId = baseEquity.companyId;
         }
      }

      if (companyId) {
         const existingComp = await DatabaseService.getCompany(companyId);
         if (existingComp) {
            existingComp.isSecDataClean = false;
            if (state.assetType === 'Equity') existingComp.symbol = state.symbol;
            await DatabaseService.saveCompany(existingComp);
         } else {
            await DatabaseService.saveCompany({ 
              id: companyId, 
              name: companyId, 
              symbol: state.assetType === 'Equity' ? state.symbol : null,
              isSecDataClean: false 
            });
         }
      }

      await DatabaseService.saveEquity({
        id: state.id,
        symbol: state.symbol,
        companyId: companyId,
        assetType: state.assetType || 'Equity',
        description: description,
        quantity: state.quantity,
        averageCost: state.averageCost,
        totalCostBasis: state.totalCostBasis,
        marketValue: state.marketValue,
        currentPrice: state.currentPrice,
        unrealizedGainLoss: state.unrealizedGainLoss,
        isShortOption: state.isShortOption || false,
        strike: state.strike || null,
        expiry: state.expiry || null,
        optionType: state.optionType || null,
        underlyingSymbol: state.underlyingSymbol || null,
        underlyingPrice: state.underlyingPrice || null,
        cappedUpside: state.cappedUpside || 0,
        obligatedCollateral: state.obligatedCollateral || 0,
        obligationRisk: state.obligationRisk || 0,
        realizedGain: state.realizedGain || 0,
        firstBoughtDate: state.firstBoughtDate || null,
        lastSoldDate: state.lastSoldDate || null,
        isClosed: state.isClosed || false,
        updatedAt: new Date().toISOString()
      });
    }

    // Save portfolio summary to database
    const summary = {
      netLiquidationValue: valuation.netLiquidationValue,
      cashBalance: valuation.cashBalance,
      portfolioMarketValue: valuation.portfolioMarketValue,
      portfolioCostBasis: valuation.portfolioCostBasis,
      optionDrag: valuation.optionDrag,
      totalCappedUpside: valuation.totalCappedUpside,
      totalObligatedCash: valuation.totalObligatedCash,
      totalObligationRisk: valuation.totalObligationRisk,
      cutoffDate: cutoffDate,
      updatedAt: new Date().toISOString()
    };
    await DatabaseService.savePortfolioSummary(summary);
  }
};
