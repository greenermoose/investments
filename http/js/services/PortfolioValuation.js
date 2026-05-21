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

    // Helper to parse dates
    const parseDateString = (dateStr) => {
      if (!dateStr) return null;
      const cleaned = dateStr.split(' as of ')[0].trim();
      const d = new Date(cleaned);
      return isNaN(d.getTime()) ? null : d;
    };

    // Helper to extract clean date string "YYYY-MM-DD"
    const getCleanDateStr = (dateStr) => {
      const d = parseDateString(dateStr);
      if (!d) return null;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

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
      const cashRow = latestPositions.positions.find(p => p.symbol === 'Cash & Cash Investments' || p.symbol.toLowerCase() === 'cash');
      if (cashRow) {
        stockPrices['CASH'] = cashRow.quantity || 0;
      }
    }

    // 2. Clone and Sort Transactions
    const sortedTx = transactions.map(tx => ({
      ...tx,
      parsedDate: parseDateString(tx.date) || new Date(0)
    }));

    sortedTx.sort((a, b) => {
      if (a.parsedDate - b.parsedDate !== 0) {
        return a.parsedDate - b.parsedDate;
      }
      const isBuyA = a.action.toLowerCase().includes('buy') || a.action.toLowerCase().includes('reinvest') || a.action.toLowerCase().includes('assigned');
      const isBuyB = b.action.toLowerCase().includes('buy') || b.action.toLowerCase().includes('reinvest') || b.action.toLowerCase().includes('assigned');
      if (isBuyA && !isBuyB) return -1;
      if (!isBuyA && isBuyB) return 1;
      return 0;
    });

    // 3. Pre-calculate option premiums for assignment adjustments
    const putPremiums = {};
    for (const tx of sortedTx) {
      const opt = this.parseOptionSymbol(tx.symbol);
      if (opt.isOption && opt.type === 'Put') {
        const key = `${opt.underlying}|${opt.expiry}|${opt.strike}`;
        const price = parseFloat(tx.price.toString().replace(/[^0-9.]/g, '')) || 0;
        if (tx.action.toLowerCase().includes('sell') || tx.action.toLowerCase().includes('open')) {
          putPremiums[key] = (putPremiums[key] || 0) + price;
        }
      }
    }

    // Helper to check put assignment premium adjustment
    const getPutAssignmentPremium = (tx) => {
      const price = parseFloat(tx.price.toString().replace(/[^0-9.]/g, '')) || 0;
      const assignedPut = sortedTx.find(t => {
        if (t.parsedDate.getTime() !== tx.parsedDate.getTime()) return false;
        const tAction = t.action.toLowerCase();
        if (!tAction.includes('assigned')) return false;
        const opt = this.parseOptionSymbol(t.symbol);
        if (!opt.isOption || opt.type !== 'Put') return false;
        if (opt.underlying !== tx.symbol) return false;
        return Math.abs(opt.strike - price) < 0.05;
      });
      if (assignedPut) {
        const opt = this.parseOptionSymbol(assignedPut.symbol);
        const key = `${opt.underlying}|${opt.expiry}|${opt.strike}`;
        return putPremiums[key] || 0;
      }
      return 0;
    };

    // Group sorted transactions by symbol
    const txBySymbol = {};
    for (const tx of sortedTx) {
      if (!tx.symbol) continue;
      if (!txBySymbol[tx.symbol]) {
        txBySymbol[tx.symbol] = [];
      }
      txBySymbol[tx.symbol].push(tx);
    }

    // Map of position details for lookup
    const posMap = {};
    if (latestPositions && latestPositions.positions) {
      for (const pos of latestPositions.positions) {
        if (!pos.symbol || pos.symbol === 'Positions Total') continue;
        const rawQty = pos.quantity || 0;
        const rawCostShare = pos.costPerShare || pos.averageCost || 0;
        posMap[pos.symbol] = {
          symbol: pos.symbol,
          quantity: rawQty,
          costPerShare: rawCostShare,
          description: pos.description || ''
        };
      }
    }

    // We will collect all symbols from transactions and positions statement
    const allSymbols = new Set([
      ...Object.keys(txBySymbol),
      ...Object.keys(posMap)
    ]);

    for (const symbol of allSymbols) {
      if (symbol === 'Cash & Cash Investments' || symbol === 'Cash' || symbol === 'CASH') {
        continue;
      }

      const symTx = txBySymbol[symbol] || [];
      const pos = posMap[symbol] || null;
      const opt = this.parseOptionSymbol(symbol);
      const isOption = opt.isOption;

      // Determine Description
      let description = '';
      if (pos) {
        description = pos.description;
      } else if (symTx.length > 0) {
        description = symTx[0].description || '';
      }

      const state = {
        symbol,
        description,
        assetType: isOption ? 'Option' : 'Equity',
        quantity: 0,
        averageCost: 0,
        totalCostBasis: 0,
        marketValue: 0,
        unrealizedGainLoss: 0,
        realizedGain: 0,
        firstBoughtDate: null,
        lastSoldDate: null
      };

      if (!isOption) {
        // --- Stock / ETF FIFO Simulation ---
        // 1. Trace split ratio and net transaction quantity
        let totalSplitRatio = 1;
        let netTxQty = 0;
        for (const tx of symTx) {
          const qty = Math.abs(parseFloat(tx.quantity)) || 0;
          if (qty <= 0) continue;
          const action = tx.action.toLowerCase();

          if (action.includes('buy') || action.includes('reinvest') || action.includes('assigned')) {
            netTxQty += qty;
          } else if (action.includes('sell')) {
            netTxQty -= qty;
          } else if (action.includes('split')) {
            if (!action.includes('reverse')) {
              netTxQty += qty;
            }
          }
        }

        const expectedFinalQty = pos ? pos.quantity : 0;
        const initialQty = Math.max(0, expectedFinalQty - netTxQty);

        // Calculate running split ratio
        let runningQtyForSplits = initialQty;
        for (const tx of symTx) {
          const qty = Math.abs(parseFloat(tx.quantity)) || 0;
          if (qty <= 0) continue;
          const action = tx.action.toLowerCase();

          if (action.includes('buy') || action.includes('reinvest') || action.includes('assigned')) {
            runningQtyForSplits += qty;
          } else if (action.includes('sell')) {
            runningQtyForSplits -= qty;
          } else if (action.includes('split')) {
            if (!action.includes('reverse')) {
              if (runningQtyForSplits > 0) {
                const ratio = (runningQtyForSplits + qty) / runningQtyForSplits;
                totalSplitRatio *= ratio;
                runningQtyForSplits += qty;
              }
            } else {
              if (qty > 0 && runningQtyForSplits > 0) {
                const ratio = qty / runningQtyForSplits;
                totalSplitRatio *= ratio;
                runningQtyForSplits = qty;
              } else if (qty < 0 && runningQtyForSplits > 0) {
                const newQty = Math.max(0, runningQtyForSplits + qty);
                const ratio = newQty / runningQtyForSplits;
                totalSplitRatio *= ratio;
                runningQtyForSplits = newQty;
              }
            }
          }
        }

        // Initialize FIFO lots
        let fifoLots = [];
        if (initialQty > 0 && pos) {
          const preInceptionPrice = pos.costPerShare * totalSplitRatio;
          fifoLots.push({
            qty: initialQty,
            price: preInceptionPrice,
            amount: initialQty * preInceptionPrice,
            date: 'Pre-inception'
          });
          state.firstBoughtDate = 'Pre-inception';
        }

        // Process transactions
        for (const tx of symTx) {
          const qty = Math.abs(parseFloat(tx.quantity)) || 0;
          if (qty <= 0) continue;

          let price = parseFloat(tx.price.toString().replace(/[^0-9.]/g, '')) || 0;
          let amount = parseFloat(tx.amount.toString().replace(/[^0-9.-]/g, '')) || 0;
          const action = tx.action.toLowerCase();
          const tradeDateStr = getCleanDateStr(tx.date);

          if (action.includes('buy') || action.includes('reinvest') || action.includes('assigned')) {
            let cost = Math.abs(amount);
            const premiumAdj = getPutAssignmentPremium(tx);
            if (premiumAdj > 0) {
              price = Math.max(0, price - premiumAdj);
              cost = price * qty;
            }

            fifoLots.push({
              qty,
              price,
              amount: cost,
              date: tradeDateStr
            });

            if (!state.firstBoughtDate) {
              state.firstBoughtDate = tradeDateStr;
            }
          } else if (action.includes('sell')) {
            let revenue = Math.abs(amount);
            let rem = qty;
            let costBasisOfSold = 0;

            while (rem > 0 && fifoLots.length > 0) {
              const lot = fifoLots[0];
              if (lot.qty <= rem) {
                costBasisOfSold += lot.amount;
                rem -= lot.qty;
                fifoLots.shift();
              } else {
                const lotCostSold = lot.amount * (rem / lot.qty);
                costBasisOfSold += lotCostSold;
                lot.amount -= lotCostSold;
                lot.qty -= rem;
                rem = 0;
              }
            }

            state.realizedGain += (revenue - costBasisOfSold);
            state.lastSoldDate = tradeDateStr;
          } else if (action.includes('split')) {
            let ratio = 1;
            if (!action.includes('reverse')) {
              const sumQty = fifoLots.reduce((s, l) => s + l.qty, 0);
              if (sumQty > 0) {
                ratio = (sumQty + qty) / sumQty;
              }
            } else {
              const sumQty = fifoLots.reduce((s, l) => s + l.qty, 0);
              if (sumQty > 0) {
                if (qty > 0) {
                  ratio = qty / sumQty;
                } else if (qty < 0) {
                  ratio = Math.max(0, sumQty + qty) / sumQty;
                }
              }
            }

            for (const lot of fifoLots) {
              lot.qty *= ratio;
              lot.price = lot.qty > 0 ? lot.amount / lot.qty : 0;
            }
          }
          
          if (price > 0 && !stockPrices[symbol]) {
            stockPrices[symbol] = price;
          }
        }

        state.quantity = fifoLots.reduce((s, l) => s + l.qty, 0);
        state.totalCostBasis = fifoLots.reduce((s, l) => s + l.amount, 0);
        state.averageCost = state.quantity > 0 ? state.totalCostBasis / state.quantity : 0;

        // Reconcile with latest positions statement quantity if available
        if (latestPositions) {
          if (pos) {
            state.quantity = pos.quantity;
            if (state.quantity > 0 && state.averageCost === 0) {
              state.averageCost = pos.costPerShare;
              state.totalCostBasis = state.quantity * state.averageCost;
            }
          } else {
            // If not in latest positions, it is a historical holding
            state.quantity = 0;
            state.totalCostBasis = 0;
            state.averageCost = 0;
          }
        }

      } else {
        // --- Option FIFO Simulation ---
        for (const tx of symTx) {
          const qty = Math.abs(parseFloat(tx.quantity)) || 0;
          if (qty <= 0) continue;

          let price = parseFloat(tx.price.toString().replace(/[^0-9.]/g, '')) || 0;
          let amount = parseFloat(tx.amount.toString().replace(/[^0-9.-]/g, '')) || 0;
          const action = tx.action.toLowerCase();
          const tradeDateStr = getCleanDateStr(tx.date);

          if (!state.firstBoughtDate) {
            state.firstBoughtDate = tradeDateStr;
          }

          if (action.includes('sell') || action.includes('open')) {
            const premium = Math.abs(amount);
            state.totalCostBasis += premium;
            state.quantity -= qty;
            state.averageCost = state.quantity < 0 ? state.totalCostBasis / Math.abs(state.quantity) : 0;
            state.lastSoldDate = tradeDateStr;
          } else if (action.includes('buy') || action.includes('close')) {
            const costToClose = Math.abs(amount);
            const premiumOfClosed = state.averageCost * qty;
            state.realizedGain += (premiumOfClosed - costToClose);

            state.quantity += qty;
            if (state.quantity >= -0.0001) {
              state.quantity = 0;
              state.totalCostBasis = 0;
              state.averageCost = 0;
            } else {
              state.totalCostBasis = Math.abs(state.quantity) * state.averageCost;
            }
            state.lastSoldDate = tradeDateStr;
          } else if (action.includes('expired') || action.includes('assigned')) {
            const premiumOfExpired = Math.abs(state.quantity) * state.averageCost;
            state.realizedGain += premiumOfExpired;

            state.quantity = 0;
            state.totalCostBasis = 0;
            state.averageCost = 0;
            state.lastSoldDate = tradeDateStr;
          }
        }

        // Reconcile with latest positions statement quantity for options if available
        if (latestPositions) {
          if (pos) {
            state.quantity = pos.quantity;
            if (pos.costPerShare) {
              state.averageCost = pos.costPerShare;
              state.totalCostBasis = Math.abs(state.quantity) * state.averageCost;
            }
          } else {
            state.quantity = 0;
            state.totalCostBasis = 0;
            state.averageCost = 0;
          }
        }
      }

      holdings[symbol] = state;
    }

    // 4. Calculate current values, option drag, and exposures
    const allHoldings = [];
    let portfolioMarketValue = 0;
    let portfolioCostBasis = 0;
    let optionDrag = 0;
    let totalCappedUpside = 0;
    let totalObligatedCash = 0;
    let totalObligationRisk = 0;
    let cashBalance = 0;

    // Handle CASH balance from positions
    const posCashVal = stockPrices['CASH'] || 0;
    cashBalance += posCashVal;

    for (const [symbol, state] of Object.entries(holdings)) {
      const opt = this.parseOptionSymbol(symbol);
      const isOption = opt.isOption;
      
      const price = stockPrices[symbol] || 0;
      state.currentPrice = price;

      if (Math.abs(state.quantity) < 0.0001) {
        state.marketValue = 0;
        state.unrealizedGainLoss = 0;
        allHoldings.push(state);
        continue;
      }

      // Calculate Market Value & Cost Basis
      if (isOption) {
        state.marketValue = state.quantity * price * 100;
        state.totalCostBasis = state.quantity * state.averageCost * 100;
        
        if (state.quantity < 0) {
          optionDrag += Math.abs(state.marketValue);
          state.unrealizedGainLoss = Math.abs(state.totalCostBasis) - Math.abs(state.marketValue);
        } else {
          state.unrealizedGainLoss = state.marketValue - state.totalCostBasis;
        }
      } else {
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

        const underlyingPrice = stockPrices[opt.underlying] || 0;
        state.underlyingPrice = underlyingPrice;

        if (opt.type === 'Call') {
          if (underlyingPrice > opt.strike) {
            state.cappedUpside = (underlyingPrice - opt.strike) * 100 * Math.abs(state.quantity);
            totalCappedUpside += state.cappedUpside;
          } else {
            state.cappedUpside = 0;
          }
        } else if (opt.type === 'Put') {
          state.obligatedCollateral = opt.strike * 100 * Math.abs(state.quantity);
          totalObligatedCash += state.obligatedCollateral;

          if (underlyingPrice > 0 && underlyingPrice < opt.strike) {
            state.obligationRisk = (opt.strike - underlyingPrice) * 100 * Math.abs(state.quantity);
            totalObligationRisk += state.obligationRisk;
          } else {
            state.obligationRisk = 0;
          }
        }
      }

      allHoldings.push(state);
    }

    const sgovHolding = allHoldings.find(h => h.symbol === 'SGOV');
    const cashBaseline = cashBalance + (sgovHolding ? sgovHolding.marketValue : 0);
    const netLiquidationValue = cashBaseline + portfolioMarketValue;

    return {
      holdings: allHoldings,
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
