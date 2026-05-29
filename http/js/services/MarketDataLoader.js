import { db } from './Database.js';

export class MarketDataLoader {
    
    static async fetchQuote(symbol) {
        try {
            const cached = await db.get('market_quotes', symbol);
            if (cached && (Date.now() - cached.timestamp < 15 * 60 * 1000)) { // 15 min cache
                return cached.data;
            }

            console.log(`Fetching quote for ${symbol}...`);
            const response = await fetch(`/api/yfinance/quote?ticker=${encodeURIComponent(symbol)}`);
            if (!response.ok) throw new Error(`Failed to fetch quote: ${response.statusText}`);
            const data = await response.json();
            
            await db.put('market_quotes', { symbol, data, timestamp: Date.now() });
            return data;
        } catch (error) {
            console.error(`Error fetching quote for ${symbol}:`, error);
            throw error;
        }
    }

    static async fetchHistory(symbol) {
        try {
            const cached = await db.get('historical_prices', symbol);
            if (cached && (Date.now() - cached.timestamp < 12 * 60 * 60 * 1000)) { // 12 hour cache
                return cached.data;
            }

            console.log(`Fetching history for ${symbol}...`);
            const response = await fetch(`/api/yfinance/history?ticker=${encodeURIComponent(symbol)}`);
            if (!response.ok) throw new Error(`Failed to fetch history: ${response.statusText}`);
            const data = await response.json();
            
            await db.put('historical_prices', { symbol, data, timestamp: Date.now() });
            return data;
        } catch (error) {
            console.error(`Error fetching history for ${symbol}:`, error);
            throw error;
        }
    }

    static async fetchOptions(symbol) {
        try {
            const cached = await db.get('options_chains', symbol);
            if (cached && (Date.now() - cached.timestamp < 15 * 60 * 1000)) { // 15 min cache
                return cached.data;
            }

            console.log(`Fetching options for ${symbol}...`);
            const response = await fetch(`/api/yfinance/options?ticker=${encodeURIComponent(symbol)}`);
            if (!response.ok) throw new Error(`Failed to fetch options: ${response.statusText}`);
            const data = await response.json();
            
            await db.put('options_chains', { symbol, data, timestamp: Date.now() });
            return data;
        } catch (error) {
            console.error(`Error fetching options for ${symbol}:`, error);
            throw error;
        }
    }
}
