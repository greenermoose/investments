const fs = require('fs');

const CSVParser = {
  parse(csvText, headerRowIndex = 0) {
    const lines = csvText.split(/\r?\n/);
    if (lines.length <= headerRowIndex) return [];
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
          values.push(current.trim());
          current = '';
        } else {
          current += c;
        }
      }
      values.push(current.trim());
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] !== undefined ? values[j].replace(/^"|"$/g, '').trim() : '';
      }
      data.push(row);
    }
    return data;
  }
};

const text = fs.readFileSync('examples/Roth_Contributory_IRA_XXX348_Transactions_20260517-115542.csv', 'utf8');
let headerRowIndex = 0;
const lines = text.split(/\r?\n/);
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('"Date"') && lines[i].includes('"Action"') && lines[i].includes('"Symbol"')) {
    headerRowIndex = i;
    break;
  }
}
const transactions = CSVParser.parse(text, headerRowIndex).filter(t => t.Date && t.Symbol === 'EOSE').map(row => ({
  date: row['Date'] || '',
  action: row['Action'] || '',
  symbol: row['Symbol'] || '',
  quantity: row['Quantity'] ? parseFloat(row['Quantity'].replace(/,/g, '')) : 0,
  price: row['Price'] ? parseFloat(row['Price'].replace(/[^0-9.]/g, '')) : 0,
  amount: row['Amount'] ? parseFloat(row['Amount'].replace(/[^0-9.-]/g, '')) : 0
}));

// Sort by trade date
function getTradeDate(dateStr) {
  const parts = dateStr.split(' as of ');
  return new Date(parts[1] ? parts[1] : parts[0]);
}
transactions.sort((a, b) => getTradeDate(a.date) - getTradeDate(b.date));

let fifoLots = [];

for (const tx of transactions) {
  const qty = tx.quantity;
  const action = tx.action.toLowerCase();
  
  if (action.includes('buy') || action.includes('reinvest')) {
    const cost = Math.abs(tx.amount);
    fifoLots.push({ qty, price: tx.price, amount: cost, date: tx.date });
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
  }
  
  console.log(`\nAfter Tx ${tx.date} - ${tx.action} ${qty} shares:`);
  console.log(JSON.stringify(fifoLots, null, 2));
}

const finalQty = fifoLots.reduce((s, l) => s + l.qty, 0);
const finalCost = fifoLots.reduce((s, l) => s + l.amount, 0);
console.log(`\nFinal simulated Qty: ${finalQty}`);
console.log(`Final simulated Avg Cost: $${finalQty > 0 ? finalCost / finalQty : 0}`);
