const fs = require('fs');

const CSVParser = {
  parse(csvText, headerRowIndex = 0) {
    const lines = csvText.split(/\r?\n/);
    if (lines.length <= headerRowIndex) return [];
    
    // Parse headers
    const parseLine = (line) => {
      const values = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += c;
        }
      }
      values.push(current.trim());
      return values.map(v => v.replace(/^"|"$/g, '').trim());
    };

    const headers = parseLine(lines[headerRowIndex]);
    const data = [];
    
    for (let i = headerRowIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = parseLine(line);
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] !== undefined ? values[j] : '';
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
      quantity: t.Quantity ? parseFloat(t.Quantity) : 0,
      price: t.Price || '',
      amount: t.Amount || ''
    }));
  },
  
  parseTransactionsCSV(text) {
    let headerRowIndex = 0;
    const lines = text.split(/\r?\n/);
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
  },

  parseTransactionsXML(text) {
    // Basic regex-based XML parser for Node environment without DOMParser
    const transactions = [];
    const txRegex = /<BrokerageTransaction>([\s\S]*?)<\/BrokerageTransaction>/g;
    let match;
    while ((match = txRegex.exec(text)) !== null) {
      const content = match[1];
      const getTag = (tag) => {
        const tMatch = new RegExp(`<${tag}>(.*?)<\/${tag}>`).exec(content);
        return tMatch ? tMatch[1].trim() : '';
      };
      transactions.push({
        date: getTag('Date'),
        action: getTag('Action'),
        symbol: getTag('Symbol'),
        description: getTag('Description'),
        quantity: getTag('Quantity') ? parseFloat(getTag('Quantity')) : 0,
        price: getTag('Price'),
        amount: getTag('Amount')
      });
    }
    return transactions;
  }
};

function normalizeTransaction(tx) {
  const dateStr = tx.date || '';
  const parts = dateStr.split(' as of ');
  const settlementDateStr = parts[0].trim();
  const tradeDateStr = (parts[1] || parts[0]).trim();
  
  const formatDate = (dStr) => {
    if (!dStr) return '';
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const settlementDate = formatDate(settlementDateStr);
  const tradeDate = formatDate(tradeDateStr);

  const cleanNum = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    return parseFloat(val.toString().replace(/[^0-9.-]/g, '')) || 0;
  };

  return {
    rawDate: dateStr,
    tradeDate,
    settlementDate,
    action: (tx.action || '').trim(),
    symbol: (tx.symbol || '').trim().toUpperCase(),
    quantity: cleanNum(tx.quantity),
    price: cleanNum(tx.price),
    amount: cleanNum(tx.amount),
    description: (tx.description || '').trim()
  };
}

function deduplicateTransactions(files) {
  const fileTxMaps = files.map(txList => {
    const map = new Map();
    for (const tx of txList) {
      const norm = normalizeTransaction(tx);
      const key = `${norm.tradeDate}|${norm.settlementDate}|${norm.action}|${norm.symbol}|${norm.quantity.toFixed(4)}|${norm.price.toFixed(4)}|${norm.amount.toFixed(2)}`;
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
      const norm = normalizeTransaction(tx);
      const key = `${norm.tradeDate}|${norm.settlementDate}|${norm.action}|${norm.symbol}|${norm.quantity.toFixed(4)}|${norm.price.toFixed(4)}|${norm.amount.toFixed(2)}`;
      if (!keyToObj.has(key)) {
        keyToObj.set(key, tx);
      }
    }
  }

  const deduplicated = [];
  for (const [key, count] of globalTxCounts.entries()) {
    const originalTx = keyToObj.get(key);
    for (let i = 0; i < count; i++) {
      deduplicated.push(originalTx);
    }
  }
  return deduplicated;
}

// 1. Load files
const csvTxText = fs.readFileSync('examples/Roth_Contributory_IRA_XXX348_Transactions_20260517-115542.csv', 'utf8');
const jsonTxText = fs.readFileSync('examples/Roth_Contributory_IRA_XXX348_Transactions_20260517-112219.json', 'utf8');
const xmlTxText = fs.readFileSync('examples/Roth_Contributory_IRA_XXX348_Transactions_20260517-115554.xml', 'utf8');

const rawCsvTx = BrokerageParser.parseTransactionsCSV(csvTxText);
const rawJsonTx = BrokerageParser.parseTransactionsJSON(jsonTxText);
const rawXmlTx = BrokerageParser.parseTransactionsXML(xmlTxText);

console.log(`Raw transactions count - CSV: ${rawCsvTx.length}, JSON: ${rawJsonTx.length}, XML: ${rawXmlTx.length}`);

const allTxRaw = deduplicateTransactions([rawCsvTx, rawJsonTx, rawXmlTx]);
console.log(`Deduplicated transactions count: ${allTxRaw.length}`);

// Normalize and sort deduplicated transactions chronologically by trade date
const allTx = allTxRaw.map(normalizeTransaction);
allTx.sort((a, b) => {
  const dDiff = new Date(a.tradeDate) - new Date(b.tradeDate);
  if (dDiff !== 0) return dDiff;
  // If dates are identical, make sure buys execute before sells for the same date
  const aIsBuy = a.action.toLowerCase().includes('buy') || a.action.toLowerCase().includes('reinvest');
  const bIsBuy = b.action.toLowerCase().includes('buy') || b.action.toLowerCase().includes('reinvest');
  if (aIsBuy && !bIsBuy) return -1;
  if (!aIsBuy && bIsBuy) return 1;
  return 0;
});

// Load the 21st (latest) positions file
const posPath = 'examples/Roth Contributory IRA-Positions-2026-05-21-081837.csv';
const posText = fs.readFileSync(posPath, 'utf8');
let posHeaderIndex = 0;
const posLines = posText.split(/\r?\n/);
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

let report = "Full Reconciled FIFO Report (using 2026-05-21 positions and 3-way deduplication)\n\n";

for (const sym of Object.keys(posMap)) {
  const isOption = sym.includes(' ') && (sym.endsWith(' C') || sym.endsWith(' P'));
  if (isOption) continue;
  if (sym === 'Cash & Cash Investments' || sym === 'Cash' || sym === 'CASH') continue;

  const pos = posMap[sym];
  const symTx = allTx.filter(t => t.symbol === sym);

  // 1. Calculate net transaction quantity
  let netTxQty = 0;
  for (const tx of symTx) {
    const qty = tx.quantity;
    if (qty <= 0) continue;
    const action = tx.action.toLowerCase();
    
    if (action.includes('buy') || action.includes('reinvest') || action.includes('assigned')) {
      netTxQty += qty;
    } else if (action.includes('sell')) {
      netTxQty -= qty;
    } else if (action.includes('split')) {
      if (qty > 0) netTxQty += qty;
    }
  }

  // 2. Initial quantity pre-seeded is posQty - netTxQty
  const initialQty = Math.max(0, pos.quantity - netTxQty);

  // 3. FIFO running simulation
  let fifoLots = [];
  if (initialQty > 0) {
    fifoLots.push({
      qty: initialQty,
      price: pos.costPerShare,
      amount: initialQty * pos.costPerShare,
      date: 'Pre-inception'
    });
  }

  for (const tx of symTx) {
    const qty = tx.quantity;
    if (qty <= 0) continue;

    const action = tx.action.toLowerCase();
    if (action.includes('buy') || action.includes('reinvest') || action.includes('assigned')) {
      const cost = Math.abs(tx.amount);
      fifoLots.push({ qty, price: tx.price, amount: cost, date: tx.rawDate });
    } else if (action.includes('sell')) {
      let rem = qty;
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
      if (qty > 0) {
        const sumQty = fifoLots.reduce((s, l) => s + l.qty, 0);
        if (sumQty > 0) {
          const ratio = (sumQty + qty) / sumQty;
          for (const lot of fifoLots) {
            lot.qty *= ratio;
          }
        }
      }
    }
  }

  const finalFifoQty = fifoLots.reduce((s, l) => s + l.qty, 0);
  const finalFifoTotalCost = fifoLots.reduce((s, l) => s + l.amount, 0);
  const finalFifoCostPerShare = finalFifoQty > 0 ? finalFifoTotalCost / finalFifoQty : 0;

  const diff = Math.abs(finalFifoCostPerShare - pos.costPerShare);

  report += `Symbol: ${sym}\n`;
  report += `  Seeded Initial Qty: ${initialQty.toFixed(4)} at $${pos.costPerShare.toFixed(4)}\n`;
  report += `  Reconciled Final Qty: ${finalFifoQty.toFixed(4)} (Expected: ${pos.quantity.toFixed(4)})\n`;
  report += `  Position Cost/Share: $${pos.costPerShare.toFixed(4)}\n`;
  report += `  Reconciled FIFO Cost: $${finalFifoCostPerShare.toFixed(4)} (diff: $${diff.toFixed(4)})\n\n`;
}

fs.writeFileSync('scratch/compare_fifo_report.txt', report);
console.log('Report written to scratch/compare_fifo_report.txt');
