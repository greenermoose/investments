/**
 * PortfolioValuation Service
 * Computes average cost basis, option liabilities, and asset valuations.
 */
export const PortfolioValuation = {
  /**
   * Parses standard option symbol formats, e.g., "BAM 06/18/2026 55.00 C"
   * @param {string} symbol 
   * @returns {Object} Parse details
   */
  parseOptionSymbol(symbol) {
    if (!symbol) return { isOption: false };
    
    // Match ticker, expiry date (MM/DD/YYYY), strike price (decimal), type (C/P)
    const match = symbol.match(/^([A-Z0-9.\-/]+)\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.]+)\s+([CP])$/i);
    if (match) {
      return {
        underlying: match[1].toUpperCase(),
        expiry: match[2],
        strike: parseFloat(match[3]),
        type: match[4].toUpperCase() === 'C' ? 'Call' : 'Put',
        isOption: true
      };
    }
    
    // Fallback split match
    const parts = symbol.split(' ');
    if (parts.length >= 4 && parts[1].includes('/') && !isNaN(parseFloat(parts[2]))) {
      return {
        underlying: parts[0].toUpperCase(),
        expiry: parts[1],
        strike: parseFloat(parts[2]),
        type: parts[3].toUpperCase() === 'C' ? 'Call' : 'Put',
        isOption: true
      };
    }

    return { isOption: false };
  },

  /**
   * Computes the current portfolio state from transaction history and position statements.
   * @param {Array} transactions - All transactions sorted chronologically
   * @param {Array} latestPositions - Positions from the latest upload
   * @returns {Object} Net portfolio state including cash, equities, options, and aggregations.
   */
  calculateValuation(transactions, latestPositions) {
    const holdings = {};
    const stockPrices = {};

    // 1. Establish stock and option prices from latest positions statement
    if (latestPositions && latestPositions.positions) {
      for (const pos of latestPositions.positions) {
        if (!pos.symbol) continue;
        stockPrices[pos.symbol] = pos.price || 0;
        
        // Also capture the underlying if it's an option
        const opt = this.parseOptionSymbol(pos.symbol);
        if (opt.isOption) {
          stockPrices[opt.underlying] = stockPrices[opt.underlying] || 0;
        }
      }
      
      // Look for a cash balance in the positions
      // Schwab positions exports often have "Cash & Cash Investments" or "Cash" or "Positions Total"
      const cashRow = latestPositions.positions.find(p => p.symbol === 'Cash & Cash Investments' || p.symbol.toLowerCase() === 'cash');
      if (cashRow) {
        stockPrices['CASH'] = cashRow.quantity || 0;
      }
    }

    // Initialize running state for each symbol
    const getHoldingsState = (symbol, assetType, desc = '') => {
      if (!holdings[symbol]) {
        const isOption = assetType === 'Option' || this.parseOptionSymbol(symbol).isOption;
        holdings[symbol] = {
          symbol,
          description: desc,
          assetType: isOption ? 'Option' : (assetType || 'Equity'),
          quantity: 0,
          totalCost: 0,
          averageCost: 0,
          realizedGain: 0
        };
      }
      return holdings[symbol];
    };

    // 2. Process all transactions chronologically to calculate average costs & realized gains
    for (const tx of transactions) {
      if (!tx.symbol) continue;
      
      const qty = Math.abs(parseFloat(tx.quantity)) || 0;
      const price = parseFloat(tx.price.replace(/[^0-9.]/g, '')) || 0;
      const amount = parseFloat(tx.amount.replace(/[^0-9.-]/g, '')) || 0; // Negative for buys/debits, positive for sells/credits
      const action = tx.action.toLowerCase();
      
      const opt = this.parseOptionSymbol(tx.symbol);
      const state = getHoldingsState(tx.symbol, opt.isOption ? 'Option' : 'Equity', tx.description);
      
      if (!opt.isOption) {
        // --- Stock / ETF Processing ---
        if (action.includes('buy') || action.includes('reinvest') || action.includes('assigned')) {
          // BUY: Add to quantity, add to total cost
          const cost = Math.abs(amount);
          state.totalCost += cost;
          state.quantity += qty;
          state.averageCost = state.quantity > 0 ? state.totalCost / state.quantity : 0;
        } else if (action.includes('sell')) {
          // SELL: Subtract from quantity, record realized gain
          const costBasisOfSold = state.averageCost * qty;
          const revenue = Math.abs(amount);
          state.realizedGain += (revenue - costBasisOfSold);
          
          state.quantity -= qty;
          if (state.quantity <= 0.0001) {
            state.quantity = 0;
            state.totalCost = 0;
            state.averageCost = 0;
          } else {
            state.totalCost = state.quantity * state.averageCost;
          }
        } else if (action.includes('split')) {
          // SPLIT: Adjust quantity
          if (qty > 0) {
            state.quantity += qty;
            state.averageCost = state.quantity > 0 ? state.totalCost / state.quantity : 0;
          }
        }
      } else {
        // --- Option Processing ---
        if (action.includes('sell') || action.includes('open')) {
          // SELL TO OPEN: quantity goes negative (liability)
          const premium = Math.abs(amount);
          state.totalCost += premium;
          state.quantity -= qty;
          state.averageCost = state.quantity < 0 ? state.totalCost / Math.abs(state.quantity) : 0;
        } else if (action.includes('buy') || action.includes('close')) {
          // BUY TO CLOSE: cover liability, record realized gain/loss
          const costToClose = Math.abs(amount);
          const premiumOfClosed = state.averageCost * qty;
          state.realizedGain += (premiumOfClosed - costToClose);
          
          state.quantity += qty;
          if (state.quantity >= -0.0001) {
            state.quantity = 0;
            state.totalCost = 0;
            state.averageCost = 0;
          } else {
            state.totalCost = Math.abs(state.quantity) * state.averageCost;
          }
        } else if (action.includes('expired') || action.includes('assigned')) {
          // EXPIRED / ASSIGNED: option closed, realize entire remaining premium
          const premiumOfExpired = Math.abs(state.quantity) * state.averageCost;
          state.realizedGain += premiumOfExpired;
          
          state.quantity = 0;
          state.totalCost = 0;
          state.averageCost = 0;
        }
      }
      
      // Update running stock price from transaction if we don't have positions data yet
      if (price > 0 && !opt.isOption) {
        stockPrices[tx.symbol] = price;
      }
    }
    // 3. Reconcile with latest Position snapshot quantities if available
    // If the latest position statement has a different quantity than our transaction ledger,
    // we use the position statement quantity as the absolute truth for the current snapshot.
    if (latestPositions && latestPositions.positions) {
      const snapshotSymbols = new Set(latestPositions.positions.map(p => p.symbol));

      for (const pos of latestPositions.positions) {
        if (!pos.symbol) continue;
        const opt = this.parseOptionSymbol(pos.symbol);
        const state = getHoldingsState(pos.symbol, pos.assetType || (opt.isOption ? 'Option' : 'Equity'), pos.description);
        
        state.quantity = pos.quantity;
        if (pos.price) {
          stockPrices[pos.symbol] = pos.price;
        }
        
        // If average cost is not calculated from transactions (e.g. no transaction history uploaded yet),
        // we can fallback to the "Cost/Share" in the positions file if available.
        if (state.averageCost === 0 && pos.costPerShare) {
          state.averageCost = pos.costPerShare;
          state.totalCost = Math.abs(state.quantity) * state.averageCost;
        }
      }

      // For any holding in our ledger NOT in the snapshot, set quantity to 0
      for (const [symbol, state] of Object.entries(holdings)) {
        if (symbol === 'Cash & Cash Investments' || symbol === 'Cash' || symbol === 'CASH') {
          continue;
        }
        if (!snapshotSymbols.has(symbol)) {
          state.quantity = 0;
          state.totalCost = 0;
          state.averageCost = 0;
        }
      }
    }

    // 4. Calculate current values, option drag, and exposures
    const activeHoldings = [];
    let portfolioMarketValue = 0;
    let portfolioCostBasis = 0;
    let optionDrag = 0;
    let totalCappedUpside = 0;
    let totalObligatedCash = 0;
    let totalObligationRisk = 0;
    let cashBalance = 0;

    for (const [symbol, state] of Object.entries(holdings)) {
      // Skip symbols that are closed (quantity == 0)
      if (Math.abs(state.quantity) < 0.0001) {
        continue;
      }

      const opt = this.parseOptionSymbol(symbol);
      const isOption = opt.isOption;
      
      // Determine current price
      const price = stockPrices[symbol] || 0;
      state.currentPrice = price;

      if (symbol === 'Cash & Cash Investments' || symbol === 'Cash' || symbol === 'CASH') {
        cashBalance += state.quantity;
        continue; // Handled separately
      }
      
      // Calculate Market Value & Cost Basis
      if (isOption) {
        // Option valuation: quantity is negative for short, positive for long
        // Market value = quantity * option price * 100
        state.marketValue = state.quantity * price * 100;
        state.totalCostBasis = state.quantity * state.averageCost * 100; // Negative for short, positive for long
        
        // For short options, drag is the liability (which is negative)
        if (state.quantity < 0) {
          optionDrag += Math.abs(state.marketValue);
          
          // Unrealized Gain/Loss = Premium Received - Current Price Liability
          // E.g., if we sold for $1 ($100 received) and current option price is $1.50 ($150 liability),
          // unrealized loss is -$50.
          state.unrealizedGainLoss = Math.abs(state.totalCostBasis) - Math.abs(state.marketValue);
        } else {
          // Long option: market value minus cost
          state.unrealizedGainLoss = state.marketValue - state.totalCostBasis;
        }
      } else {
        // Stock/ETF valuation
        state.marketValue = state.quantity * price;
        state.totalCostBasis = state.quantity * state.averageCost;
        state.unrealizedGainLoss = state.marketValue - state.totalCostBasis;
      }

      // Add to running portfolio value (if not SGOV, which is treated as Cash Baseline)
      if (symbol !== 'SGOV') {
        portfolioMarketValue += state.marketValue;
        if (state.quantity > 0) {
          portfolioCostBasis += state.totalCostBasis;
        }
      }

      // Option Specific Risk/Exposure Calculations
      if (isOption && state.quantity < 0) {
        state.isShortOption = true;
        state.strike = opt.strike;
        state.expiry = opt.expiry;
        state.optionType = opt.type;
        state.underlyingSymbol = opt.underlying;

        // Get underlying stock price
        const underlyingPrice = stockPrices[opt.underlying] || 0;
        state.underlyingPrice = underlyingPrice;

        if (opt.type === 'Call') {
          // Short Call Capped Upside
          // If stock price is above strike price, upside is capped.
          if (underlyingPrice > opt.strike) {
            state.cappedUpside = (underlyingPrice - opt.strike) * 100 * Math.abs(state.quantity);
            totalCappedUpside += state.cappedUpside;
          } else {
            state.cappedUpside = 0;
          }
        } else if (opt.type === 'Put') {
          // Short Put Collateral & Obligation Risk
          state.obligatedCollateral = opt.strike * 100 * Math.abs(state.quantity);
          totalObligatedCash += state.obligatedCollateral;

          // If stock price is below strike price, we have obligation risk (underwater asset acquisition)
          if (underlyingPrice > 0 && underlyingPrice < opt.strike) {
            state.obligationRisk = (opt.strike - underlyingPrice) * 100 * Math.abs(state.quantity);
            totalObligationRisk += state.obligationRisk;
          } else {
            state.obligationRisk = 0;
          }
        }
      }

      activeHoldings.push(state);
    }

    // If SGOV exists, we can treat it as a cash equivalent/Bucket 1 baseline for display
    const sgovHolding = activeHoldings.find(h => h.symbol === 'SGOV');
    const cashBaseline = cashBalance + (sgovHolding ? sgovHolding.marketValue : 0);

    // netLiquidationValue is cashBaseline (Cash + SGOV) + portfolioMarketValue (which excludes SGOV)
    const netLiquidationValue = cashBaseline + portfolioMarketValue;

    return {
      holdings: activeHoldings,
      cashBalance: cashBaseline,
      portfolioMarketValue,
      portfolioCostBasis,
      netLiquidationValue,
      optionDrag,
      totalCappedUpside,
      totalObligatedCash,
      totalObligationRisk,
      stockPrices
    };
  }
};
