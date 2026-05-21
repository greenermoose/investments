const fs = require('fs');

const CSVParser = {
  parse(csvText, headerRowIndex = 0) {
    const lines = csvText.split('\n');
    const headers = lines[headerRowIndex].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    const data = [];
    for (let i = headerRowIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = [];
      let current = '';
      let inQuotes = false;
      for (let j = 0; j < line.length; j++) {
        const c = line[j];
        if (c === '"') inQuotes = !inQuotes;
        else if (c === ',' && !inQuotes) {
          values.push(current);
          current = '';
        } else {
          current += c;
        }
      }
      values.push(current);
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] ? values[j].replace(/^"|"$/g, '').trim() : '';
      }
      data.push(row);
    }
    return data;
  }
};

const BrokerageParser = {
  parseTransactionsJSON(text) {
    const data = JSON.parse(text);
    let transactions = data.BrokerageTransactions || [];
    if (!Array.isArray(transactions) && data.BrokerageHistoryResponse && data.BrokerageHistoryResponse.BrokerageTransactions) {
        transactions = data.BrokerageHistoryResponse.BrokerageTransactions.BrokerageTransaction || [];
    }
    return transactions.map(t => ({
      date: t.Date || '',
      action: t.Action || '',
      symbol: t.Symbol || '',
      description: t.Description || '',
      quantity: t.Quantity ? parseFloat(t.Quantity.toString().replace(/,/g, '')) : 0,
      price: t.Price || '',
      amount: t.Amount || ''
    }));
  },
  parseTransactionsCSV(text) {
    let headerRowIndex = 0;
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('"Date"') && lines[i].includes('"Action"') && lines[i].includes('"Symbol"')) {
        headerRowIndex = i;
        break;
      }
    }
    const rawTransactions = CSVParser.parse(text, headerRowIndex);
    return rawTransactions.map(row => ({
      date: row['Date'] || '',
      action: row['Action'] || '',
      symbol: row['Symbol'] || '',
      description: row['Description'] || '',
      quantity: row['Quantity'] ? parseFloat(row['Quantity'].replace(/,/g, '')) : 0,
      price: row['Price'] || '',
      amount: row['Amount'] || ''
    })).filter(t => t.date);
  }
};

// Parse Positions
const posPath = 'examples/Roth Contributory IRA-Positions-2026-05-21-081837.csv';
const posText = fs.readFileSync(posPath, 'utf8');
let posHeaderIndex = 0;
const posLines = posText.split('\n');
for (let i = 0; i < posLines.length; i++) {
  if (posLines[i].includes('"Symbol"') && posLines[i].includes('"Description"')) {
    posHeaderIndex = i;
    break;
  }
}
const positions = CSVParser.parse(posText, posHeaderIndex);
const posMap = {};
for (const row of positions) {
  const symbol = row['Symbol'];
  if (!symbol || symbol === 'Positions Total') continue;
  const rawQty = row['Quantity'] || row['Qty'] || row['Qty (Quantity)'] || '0';
  const rawCost = row['Cost/Share'] || '0';
  posMap[symbol] = {
    symbol,
    quantity: parseFloat(rawQty.replace(/,/g, '')) || 0,
    costPerShare: parseFloat(rawCost.replace(/[^0-9.]/g, '')) || 0,
  };
}

// Load transactions
const csvTxText = fs.readFileSync('examples/Roth_Contributory_IRA_XXX348_Transactions_20260517-115542.csv', 'utf8');
const jsonTxText = fs.readFileSync('examples/Roth_Contributory_IRA_XXX348_Transactions_20260517-112219.json', 'utf8');

const rawCsvTx = BrokerageParser.parseTransactionsCSV(csvTxText);
const rawJsonTx = BrokerageParser.parseTransactionsJSON(jsonTxText);

function makeKey(tx) {
  const normPrice = parseFloat(tx.price.toString().replace(/[^0-9.-]/g, '')) || 0;
  const normAmount = parseFloat(tx.amount.toString().replace(/[^0-9.-]/g, '')) || 0;
  return `${tx.date}|${tx.action.toLowerCase().trim()}|${tx.symbol.trim()}|${tx.quantity}|${normPrice.toFixed(4)}|${normAmount.toFixed(4)}`;
}

function deduplicateTransactions(files) {
  const fileTxMaps = files.map(txList => {
    const map = new Map();
    for (const tx of txList) {
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
  for (const txList of files) {
    for (const tx of txList) {
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
}

const allTxRaw = deduplicateTransactions([rawCsvTx, rawJsonTx]);

function getTradeDate(dateStr) {
  const parts = dateStr.split(' as of ');
  return new Date(parts[1] ? parts[1] : parts[0]);
}

const normalizedTx = allTxRaw.map(tx => {
  const normPrice = parseFloat(tx.price.toString().replace(/[^0-9.-]/g, '')) || 0;
  const normAmount = parseFloat(tx.amount.toString().replace(/[^0-9.-]/g, '')) || 0;
  return {
    rawDate: tx.date,
    date: getTradeDate(tx.date),
    action: tx.action,
    symbol: tx.symbol.toUpperCase().trim(),
    quantity: tx.quantity,
    price: normPrice,
    amount: normAmount,
    description: tx.description
  };
});

// Sort trade date chronological. Buys before sells.
normalizedTx.sort((a, b) => {
  if (a.date - b.date !== 0) return a.date - b.date;
  const isBuyA = a.action.toLowerCase().includes('buy') || a.action.toLowerCase().includes('reinvest') || a.action.toLowerCase().includes('assigned');
  const isBuyB = b.action.toLowerCase().includes('buy') || b.action.toLowerCase().includes('reinvest') || b.action.toLowerCase().includes('assigned');
  if (isBuyA && !isBuyB) return -1;
  if (!isBuyA && isBuyB) return 1;
  return 0;
});

function runFifoForSymbol(sym) {
  const pos = posMap[sym] || { quantity: 0, costPerShare: 0 };
  const symTx = normalizedTx.filter(t => t.symbol === sym);

  // Pre-pass: calculate split ratios
  let runQty = 0;
  const splitRatios = new Map(); // tx index -> ratio
  
  for (let i = 0; i < symTx.length; i++) {
    const tx = symTx[i];
    const action = tx.action.toLowerCase();
    
    if (action.includes('buy') || action.includes('reinvest') || action.includes('assigned')) {
      runQty += tx.quantity;
    } else if (action.includes('sell')) {
      runQty -= tx.quantity;
    } else if (action.includes('split')) {
      let ratio = 1;
      if (runQty > 0) {
        if (action.includes('reverse')) {
          ratio = tx.quantity / runQty;
        } else {
          ratio = (runQty + tx.quantity) / runQty;
        }
      }
      splitRatios.set(i, ratio);
      // Adjust runQty
      if (action.includes('reverse')) {
        runQty = tx.quantity;
      } else {
        runQty += tx.quantity;
      }
    }
  }

  // Calculate split factors after each transaction index
  const splitFactorsAfter = new Array(symTx.length).fill(1);
  let currentFactor = 1;
  for (let i = symTx.length - 1; i >= 0; i--) {
    splitFactorsAfter[i] = currentFactor;
    if (splitRatios.has(i)) {
      currentFactor *= splitRatios.get(i);
    }
  }
  const totalSplitRatio = currentFactor;

  // Calculate finalTxQty (taking splits into account)
  let finalTxQty = 0;
  for (let i = 0; i < symTx.length; i++) {
    const tx = symTx[i];
    const action = tx.action.toLowerCase();
    const factor = splitFactorsAfter[i];
    
    if (action.includes('buy') || action.includes('reinvest') || action.includes('assigned')) {
      finalTxQty += tx.quantity * factor;
    } else if (action.includes('sell')) {
      finalTxQty -= tx.quantity * factor;
    }
  }

  // Initial pre-inception shares
  const preInceptionFinalQty = Math.max(0, pos.quantity - finalTxQty);
  const preInceptionInitialQty = preInceptionFinalQty / totalSplitRatio;
  const preInceptionPrice = pos.costPerShare * totalSplitRatio;

  // Run simulation
  let fifoLots = [];
  if (preInceptionInitialQty > 0) {
    fifoLots.push({
      qty: preInceptionInitialQty,
      price: preInceptionPrice,
      amount: preInceptionInitialQty * preInceptionPrice,
      date: 'Pre-inception'
    });
  }

  for (let i = 0; i < symTx.length; i++) {
    const tx = symTx[i];
    const action = tx.action.toLowerCase();

    if (action.includes('buy') || action.includes('reinvest') || action.includes('assigned')) {
      fifoLots.push({
        qty: tx.quantity,
        price: tx.price,
        amount: Math.abs(tx.amount),
        date: tx.rawDate
      });
    } else if (action.includes('sell')) {
      let rem = tx.quantity;
      while (rem > 0 && fifoLots.length > 0) {
        const lot = fifoLots[0];
        if (lot.qty <= rem) {
          rem -= lot.qty;
          fifoLots.shift();
        } else {
          lot.amount = lot.amount * ((lot.qty - rem) / lot.qty);
          lot.qty -= rem;
          rem = 0;
        }
      }
    } else if (action.includes('split')) {
      const ratio = splitRatios.get(i);
      for (const lot of fifoLots) {
        lot.qty *= ratio;
      }
    }
  }

  const finalFifoQty = fifoLots.reduce((s, l) => s + l.qty, 0);
  const finalFifoTotalCost = fifoLots.reduce((s, l) => s + l.amount, 0);
  const finalFifoCostPerShare = finalFifoQty > 0 ? finalFifoTotalCost / finalFifoQty : 0;

  return {
    symbol: sym,
    expectedQty: pos.quantity,
    reconciledQty: finalFifoQty,
    positionCost: pos.costPerShare,
    reconciledCost: finalFifoCostPerShare,
    totalSplitRatio,
    initialQty: preInceptionInitialQty
  };
}

const testSymbols = ['NVDA', 'GOOGL', 'TSLA', 'WMT', 'GWH', 'AAPL'];
for (const sym of testSymbols) {
  console.log(runFifoForSymbol(sym));
}
