import { db } from './Database.js';

export class SecDataLoader {
    static async loadData() {
        try {
            // First, check if data is already in IndexedDB to avoid unnecessary fetching
            const existing = await db.getAll('sec_data');
            if (existing && existing.length > 0) {
                console.log(`Loaded ${existing.length} SEC records from IndexedDB.`);
                return existing;
            }

            // If not, fetch from the server
            console.log('Fetching SEC data from server...');
            const response = await fetch('/sec-data.json');
            
            if (!response.ok) {
                throw new Error(`Failed to fetch SEC data: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Bulk insert into IndexedDB
            const symbols = Object.keys(data);
            for (const symbol of symbols) {
                const record = {
                    symbol: symbol,
                    ...data[symbol]
                };
                await db.put('sec_data', record);
            }

            console.log(`Successfully stored ${symbols.length} SEC records in IndexedDB.`);
            return await db.getAll('sec_data');

        } catch (error) {
            console.error('Error in SecDataLoader:', error);
            throw error;
        }
    }

    static async getCompanyData(symbol) {
        return await db.get('sec_data', symbol);
    }
}
