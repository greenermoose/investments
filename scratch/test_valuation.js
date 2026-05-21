import fs from 'fs';
import { BrokerageParser } from '../http/js/services/BrokerageParser.js';
import { PortfolioValuation } from '../http/js/services/PortfolioValuation.js';

const posText = fs.readFileSync('examples/Roth Contributory IRA-Positions-2026-05-17-112152.csv', 'utf8');
const txText = fs.readFileSync('examples/Roth_Contributory_IRA_XXX348_Transactions_20260517-115542.csv', 'utf8');

const posData = BrokerageParser.parsePositions(posText);
const txData = BrokerageParser.parseTransactions(txText);

// Valuation with only positions
const val1 = PortfolioValuation.calculateValuation([], posData);
console.log("Positions Only NLV:", val1.netLiquidationValue, "Cash:", val1.cashBalance, "PMV:", val1.portfolioMarketValue);
console.log("val1 SGOV lots:", val1.holdings.filter(h => h.symbol === 'SGOV').length);

// Valuation with both
const val2 = PortfolioValuation.calculateValuation(txData.transactions, posData);
console.log("Both NLV:", val2.netLiquidationValue, "Cash:", val2.cashBalance, "PMV:", val2.portfolioMarketValue);
console.log("val2 SGOV lots:", val2.holdings.filter(h => h.symbol === 'SGOV').map(h => h.quantity));

for (const h of val1.holdings) {
  const h2 = val2.holdings.find(x => x.symbol === h.symbol && x.quantity === h.quantity);
  // Compare market value
  const mv1 = h.marketValue;
  const h2s = val2.holdings.filter(x => x.symbol === h.symbol);
  const mv2 = h2s.reduce((sum, x) => sum + x.marketValue, 0);
  if (Math.abs(mv1 - mv2) > 0.01) {
    console.log(`Mismatch on ${h.symbol}: posOnly=${mv1}, both=${mv2}`);
  }
}

