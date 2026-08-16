const fs = require('fs');
const path = require('path');

let dataDir = path.join(__dirname, '..', 'http', 'data');
if (!fs.existsSync(dataDir)) {
    dataDir = path.join(__dirname, '..', 'data');
}
const outputDir = path.join(__dirname, '..', 'http');
const outputFile = path.join(outputDir, 'sec-data.json');

function parseDate(dateStr) {
    return new Date(dateStr);
}

function getDays(f) {
    const start = parseDate(f.period_start);
    const end = parseDate(f.period_end);
    let days = Math.round((end - start) / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
        if (f.type === '10-K') return 365;
        if (f.type === '10-Q' || f.type === '8-K') return 90;
    }
    return days;
}

function hasOverlap(f1, f2) {
    const s1 = parseDate(f1.period_start);
    const e1 = parseDate(f1.period_end);
    const s2 = parseDate(f2.period_start);
    const e2 = parseDate(f2.period_end);
    return s1 < e2 && s2 < e1;
}

function processCompany(symbol, filings) {
    // Ensure filings have revenue and shares
    const validFilings = filings
        .filter(f => f.data && f.period_start && f.period_end)
        .map(f => {
            let days = getDays(f);
            let startStr = f.period_start;
            
            // If duration was inferred, calculate a synthetic start date
            if (f.period_start === f.period_end) {
                const end = parseDate(f.period_end);
                const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
                startStr = start.toISOString().split('T')[0];
            }

            return {
                ...f,
                period_start: startStr,
                days: days
            };
        });

    // Get latest shares outstanding
    let latestShares = null;
    let latestSharesDate = null;
    for (const f of validFilings) {
        if (f.data.shares_outstanding) {
            const d = parseDate(f.period_end);
            if (!latestSharesDate || d > latestSharesDate) {
                latestSharesDate = d;
                latestShares = f.data.shares_outstanding;
            }
        }
    }

    // Find combination of non-overlapping filings that give ~365 days
    // We want the most recent combination.
    validFilings.sort((a, b) => parseDate(b.period_end) - parseDate(a.period_end));

    let bestTtmRevenue = null;
    let bestTtmEnd = null;
    let bestTtmDiff = 999;

    // Helper to find TTM starting from a specific filing index
    for (let i = 0; i < validFilings.length; i++) {
        let currentDays = 0;
        let currentRevenue = 0;
        let selected = [];
        
        for (let j = i; j < validFilings.length; j++) {
            const f = validFilings[j];
            if (f.data.revenue === undefined || f.data.revenue === null) continue;

            // Check overlap with already selected
            let overlaps = false;
            for (const s of selected) {
                if (hasOverlap(f, s)) {
                    overlaps = true;
                    break;
                }
            }

            if (!overlaps) {
                // If adding this exceeds 380 days, skip it (unless it's the only one, e.g. 10-K)
                if (currentDays + f.days <= 390) {
                    selected.push(f);
                    currentDays += f.days;
                    currentRevenue += f.data.revenue;
                } else {
                    // Try to see if taking it would be closer to 365 than skipping
                    // but usually we strictly want <= 390 to avoid overcounting quarters
                }
            }
            
            if (currentDays >= 330 && currentDays <= 390) {
                // Valid TTM found!
                const ttmEnd = parseDate(selected[0].period_end);
                const diff = Math.abs(currentDays - 365);
                
                if (!bestTtmEnd || ttmEnd > bestTtmEnd || (ttmEnd.getTime() === bestTtmEnd.getTime() && diff < bestTtmDiff)) {
                    bestTtmEnd = ttmEnd;
                    bestTtmRevenue = currentRevenue;
                    bestTtmDiff = diff;
                }
                break; // We found a valid TTM for this starting point
            }
        }
    }

    return {
        shares_outstanding: latestShares,
        ttm_revenue: bestTtmRevenue
    };
}

function main() {
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
    const result = {};

    for (const file of files) {
        const filePath = path.join(dataDir, file);
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            if (data.symbol && data.filings) {
                const metrics = processCompany(data.symbol, data.filings);
                
                // Sanity check
                if (metrics.shares_outstanding && metrics.shares_outstanding < 10000) {
                    console.warn(`Warning: ${data.symbol} has suspiciously low shares outstanding: ${metrics.shares_outstanding}`);
                }
                if (metrics.ttm_revenue !== null && metrics.ttm_revenue < 100000) {
                    console.warn(`Warning: ${data.symbol} has suspiciously low TTM revenue: ${metrics.ttm_revenue}`);
                }
                if (metrics.shares_outstanding && metrics.shares_outstanding > 1e12) {
                    console.warn(`Warning: ${data.symbol} has suspiciously high shares outstanding: ${metrics.shares_outstanding}`);
                }
                if (metrics.ttm_revenue !== null && metrics.ttm_revenue > 1e13) {
                    console.warn(`Warning: ${data.symbol} has suspiciously high TTM revenue: ${metrics.ttm_revenue}`);
                }

                if (metrics.shares_outstanding || metrics.ttm_revenue) {
                    result[data.symbol] = metrics;
                }
            }
        } catch (e) {
            console.error(`Error processing ${file}: ${e.message}`);
        }
    }

    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.log(`Successfully wrote ${Object.keys(result).length} companies to ${outputFile}`);
}

main();
