// Market data fetcher utilities for Yahoo Finance and Alpha Vantage
// Note: These are client-side fetches that may be limited by CORS
// In production, you'd want a backend proxy for these APIs

/**
 * Fetch historical price data from Yahoo Finance
 * Uses yahoo-finance API endpoint (public, no API key needed)
 * @param {string} symbol - Stock symbol
 * @param {string} period - Time period ('1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max')
 * @returns {Promise<Array>} Array of price data points
 */
export async function fetchYahooFinanceHistory(symbol, period = '1y') {
  try {
    // Yahoo Finance API endpoint (using yahoo-finance2 compatible endpoint)
    // Note: This may require CORS proxy in production
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${period}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      throw new Error('No data returned from Yahoo Finance');
    }
    
    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const closes = result.indicators.quote[0].close || [];
    
    return timestamps.map((timestamp, index) => ({
      date: new Date(timestamp * 1000),
      price: closes[index],
      volume: result.indicators.quote[0].volume[index] || 0
    })).filter(item => item.price !== null && item.price !== undefined);
  } catch (error) {
    console.error('Error fetching Yahoo Finance data:', error);
    throw error;
  }
}

/**
 * Fetch current quote from Yahoo Finance
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Object>} Current quote data
 */
export async function fetchYahooFinanceQuote(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      throw new Error('No data returned from Yahoo Finance');
    }
    
    const result = data.chart.result[0];
    const meta = result.meta || {};
    const quote = result.indicators.quote[0];
    
    return {
      symbol: meta.symbol,
      price: meta.regularMarketPrice || quote.close[quote.close.length - 1],
      change: meta.regularMarketChange || 0,
      changePercent: meta.regularMarketChangePercent || 0,
      volume: meta.regularMarketVolume || 0,
      marketCap: meta.marketCap || null,
      currency: meta.currency || 'USD'
    };
  } catch (error) {
    console.error('Error fetching Yahoo Finance quote:', error);
    throw error;
  }
}

/**
 * Fetch data from Alpha Vantage API
 * @param {string} symbol - Stock symbol
 * @param {string} apiKey - Alpha Vantage API key
 * @param {string} function - API function ('TIME_SERIES_DAILY', 'TIME_SERIES_WEEKLY', etc.)
 * @returns {Promise<Array>} Array of price data points
 */
export async function fetchAlphaVantageData(symbol, apiKey, functionName = 'TIME_SERIES_DAILY') {
  if (!apiKey) {
    throw new Error('Alpha Vantage API key is required');
  }
  
  try {
    const url = `https://www.alphavantage.co/query?function=${functionName}&symbol=${symbol}&apikey=${apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check for API errors
    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }
    
    if (data['Note']) {
      throw new Error('API call frequency limit reached. Please try again later.');
    }
    
    // Parse time series data
    const timeSeriesKey = Object.keys(data).find(key => key.includes('Time Series'));
    if (!timeSeriesKey) {
      throw new Error('No time series data found');
    }
    
    const timeSeries = data[timeSeriesKey];
    return Object.keys(timeSeries).map(date => ({
      date: new Date(date),
      price: parseFloat(timeSeries[date]['4. close']),
      open: parseFloat(timeSeries[date]['1. open']),
      high: parseFloat(timeSeries[date]['2. high']),
      low: parseFloat(timeSeries[date]['3. low']),
      volume: parseFloat(timeSeries[date]['5. volume'])
    })).sort((a, b) => a.date - b.date);
  } catch (error) {
    console.error('Error fetching Alpha Vantage data:', error);
    throw error;
  }
}

/**
 * Get market data with fallback strategy
 * Tries Yahoo Finance first, falls back to Alpha Vantage if available
 * @param {string} symbol - Stock symbol
 * @param {string} period - Time period
 * @param {string} alphaVantageKey - Optional Alpha Vantage API key
 * @returns {Promise<Array>} Array of price data points
 */
export async function fetchMarketData(symbol, period = '1y', alphaVantageKey = null) {
  try {
    // Try Yahoo Finance first (no API key needed)
    return await fetchYahooFinanceHistory(symbol, period);
  } catch (yahooError) {
    console.warn('Yahoo Finance fetch failed, trying Alpha Vantage:', yahooError);
    
    if (alphaVantageKey) {
      try {
        // Try Alpha Vantage as fallback
        return await fetchAlphaVantageData(symbol, alphaVantageKey);
      } catch (alphaError) {
        console.error('Alpha Vantage fetch also failed:', alphaError);
        throw new Error('Unable to fetch market data from available sources');
      }
    } else {
      throw new Error('Yahoo Finance fetch failed and no Alpha Vantage API key provided');
    }
  }
}

/**
 * Cache for market data to reduce API calls
 */
const dataCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached data or fetch new
 * @param {string} symbol - Stock symbol
 * @param {string} period - Time period
 * @returns {Promise<Array>} Array of price data points
 */
export async function getCachedMarketData(symbol, period = '1y', alphaVantageKey = null) {
  const cacheKey = `${symbol}_${period}`;
  const cached = dataCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }
  
  const data = await fetchMarketData(symbol, period, alphaVantageKey);
  dataCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
  
  return data;
}

