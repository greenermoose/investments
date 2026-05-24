import { DatabaseService } from './DatabaseService.js';

export const SecApiService = {
  /**
   * Fetch company fundamentals from the proxy.
   * If available in IndexedDB and less than 24h old, return cached version.
   */
  async getFundamentals(ticker) {
    try {
      const cached = await DatabaseService.getCompanyFundamentals(ticker);
      if (cached && cached.lastUpdated) {
        const lastUpdated = new Date(cached.lastUpdated);
        const now = new Date();
        const diffMs = now - lastUpdated;
        // If cached within the last 24 hours, return it
        if (diffMs < 24 * 60 * 60 * 1000) {
          console.log(`Returning cached SEC data for ${ticker}`);
          return cached.data;
        }
      }

      console.log(`Fetching SEC data for ${ticker} from proxy...`);
      const response = await fetch(`/api/sec/data?ticker=${ticker}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch SEC data: ${response.status} ${response.statusText}`);
      }
      const rawData = await response.json();
      
      const normalizedData = this.normalizeSecData(rawData);
      
      // Store in DB
      await DatabaseService.saveCompanyFundamentals(ticker, normalizedData);
      
      return normalizedData;
    } catch (error) {
      console.error(`SecApiService error for ${ticker}:`, error);
      throw error;
    }
  },

  normalizeSecData(rawData) {
    const facts = rawData.facts;
    if (!facts) return [];

    const periodsMap = new Map();

    const addDataPoints = (conceptData, metricName) => {
      if (!conceptData || !conceptData.units) return;
      
      // Use the first unit key (usually 'USD' or 'shares')
      const unitKey = Object.keys(conceptData.units)[0];
      if (!unitKey) return;

      const items = conceptData.units[unitKey];
      
      items.forEach(item => {
        // Only look at annual or quarterly (skip small period adjustments if possible, or just take everything and group by end date)
        if (!item.end) return;
        
        // We focus on 10-K and 10-Q forms where possible, but we'll group by period end date
        const periodKey = item.end;
        if (!periodsMap.has(periodKey)) {
          periodsMap.set(periodKey, {
            date: item.end,
            period: `${item.fy} ${item.fp || ''}`.trim(),
            shares: null,
            revenue: null,
            assets: null,
            liabilities: null
          });
        }
        
        const periodData = periodsMap.get(periodKey);
        // Only update if it's null or this is a '10-K'/'10-Q' (which is more reliable)
        if (periodData[metricName] === null || ['10-K', '10-Q', '20-F', '40-F'].includes(item.form)) {
            periodData[metricName] = item.val;
            // Prefer the fy/fp from the most recent/official filing for this date
            if (item.fy) {
                periodData.period = `${item.fy} ${item.fp || ''}`.trim();
            }
        }
      });
    };

    // US GAAP Tags
    const usGaap = facts['us-gaap'];
    if (usGaap) {
      addDataPoints(usGaap.Revenues || usGaap.SalesRevenueNet || usGaap.RevenueFromContractWithCustomerExcludingAssessedTax, 'revenue');
      addDataPoints(usGaap.Assets, 'assets');
      addDataPoints(usGaap.Liabilities, 'liabilities');
    }

    // IFRS Full Tags (Canadian/Foreign)
    const ifrs = facts['ifrs-full'];
    if (ifrs) {
      addDataPoints(ifrs.Revenue, 'revenue');
      addDataPoints(ifrs.Assets, 'assets');
      addDataPoints(ifrs.Liabilities, 'liabilities');
    }

    // DEI (Document and Entity Information) for Shares Outstanding
    const dei = facts['dei'];
    if (dei) {
      addDataPoints(dei.EntityCommonStockSharesOutstanding, 'shares');
    }

    // Convert map to sorted array (newest first)
    const dataArray = Array.from(periodsMap.values());
    dataArray.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Filter out data older than 10 years and ensure we have at least some data point
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    
    return dataArray.filter(d => new Date(d.date) >= tenYearsAgo && (d.revenue !== null || d.assets !== null || d.shares !== null));
  }
};
