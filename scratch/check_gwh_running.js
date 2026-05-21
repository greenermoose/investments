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

const text = fs.readFileSync('examples/Roth_Contributory_IRA_XXX348_Transactions_20260517-115542.csv', 'utf8');
let headerRowIndex = 0;
const lines = text.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('"Date"') && lines[i].includes('"Action"') && lines[i].includes('"Symbol"')) {
    headerRowIndex = i;
    break;
  }
}

const transactions = CSVParser.parse(text, headerRowIndex).filter(t => t.Date && t.Symbol === 'GWH');

function getTradeDate(dateStr) {
  const parts = dateStr.split(' as of ');
  return new Date(parts[1] ? parts[1] : parts[0]);
}

transactions.sort((a, b) => getTradeDate(a.date || a.Date) - getTradeDate(b.date || b.Date));

let runningQty = 0;
for (const tx of transactions) {
  const qty = tx.Quantity ? parseFloat(tx.Quantity.replace(/,/g, '')) : 0;
  const action = tx.Action.toLowerCase();
  
  if (action.includes('buy') || action.includes('reinvest') || action.includes('assigned')) {
    runningQty += qty;
  } else if (action.includes('sell')) {
    runningQty -= qty;
  }
  
  console.log(`${tx.Date} | ${tx.Action} | Qty: ${qty} | Running: ${runningQty} | Description: ${tx.Description}`);
}
