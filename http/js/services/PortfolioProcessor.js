import { DatabaseService } from './DatabaseService.js';
import { BrokerageParser } from './BrokerageParser.js';
import { PortfolioValuation } from './PortfolioValuation.js';

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
         await DatabaseService.saveCompany({ id: companyId, name: companyId });
      } else if (!companyId && state.assetType === 'Option') {
         const baseSymbol = state.symbol.split(' ')[0];
         const baseEquity = await DatabaseService.getEquity(baseSymbol);
         if (baseEquity && baseEquity.companyId) {
            companyId = baseEquity.companyId;
         }
      }

      await DatabaseService.saveEquity({
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
      updatedAt: new Date().toISOString()
    };
    await DatabaseService.savePortfolioSummary(summary);
  }
};
