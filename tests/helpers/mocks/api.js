// Mock API implementations for external services (market data, etc.)
import { vi } from 'vitest';

/**
 * Mock fetch for market data APIs
 */
export function setupAPIMocks() {
  const originalFetch = global.fetch;
  
  global.fetch = vi.fn((url, options) => {
    // Mock Alpha Vantage API
    if (url.includes('alphavantage.co')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          'Time Series (Daily)': {
            '2025-01-01': {
              '1. open': '150.00',
              '2. high': '155.00',
              '3. low': '148.00',
              '4. close': '152.00',
              '5. volume': '1000000'
            }
          },
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': '152.00',
            '09. change': '2.00',
            '10. change percent': '1.33%'
          }
        }),
        text: () => Promise.resolve(JSON.stringify({
          'Time Series (Daily)': {
            '2025-01-01': {
              '1. open': '150.00',
              '2. high': '155.00',
              '3. low': '148.00',
              '4. close': '152.00',
              '5. volume': '1000000'
            }
          }
        }))
      });
    }
    
    // Default: use original fetch or return error
    if (originalFetch) {
      return originalFetch(url, options);
    }
    
    return Promise.reject(new Error(`Unmocked fetch call to ${url}`));
  });
  
  return () => {
    global.fetch = originalFetch;
  };
}

/**
 * Mock market data responses
 */
export const mockMarketData = {
  historical: {
    'AAPL': {
      '2025-01-01': { open: 150.00, high: 155.00, low: 148.00, close: 152.00, volume: 1000000 },
      '2025-01-02': { open: 152.00, high: 157.00, low: 151.00, close: 155.00, volume: 1200000 }
    },
    'MSFT': {
      '2025-01-01': { open: 380.00, high: 385.00, low: 378.00, close: 382.00, volume: 2000000 },
      '2025-01-02': { open: 382.00, high: 388.00, low: 380.00, close: 385.00, volume: 2200000 }
    }
  },
  quotes: {
    'AAPL': { price: 152.00, change: 2.00, changePercent: 1.33 },
    'MSFT': { price: 382.00, change: 2.00, changePercent: 0.53 },
    'GOOGL': { price: 140.00, change: -1.00, changePercent: -0.71 }
  }
};

/**
 * Create a mock fetch response for market data
 */
export function createMockMarketDataResponse(symbol, type = 'quote') {
  if (type === 'quote') {
    const quote = mockMarketData.quotes[symbol] || { price: 100.00, change: 0, changePercent: 0 };
    return {
      ok: true,
      json: () => Promise.resolve({
        'Global Quote': {
          '01. symbol': symbol,
          '05. price': quote.price.toString(),
          '09. change': quote.change.toString(),
          '10. change percent': `${quote.changePercent}%`
        }
      })
    };
  }
  
  if (type === 'historical') {
    const historical = mockMarketData.historical[symbol] || {};
    const timeSeries = {};
    Object.keys(historical).forEach(date => {
      const data = historical[date];
      timeSeries[date] = {
        '1. open': data.open.toString(),
        '2. high': data.high.toString(),
        '3. low': data.low.toString(),
        '4. close': data.close.toString(),
        '5. volume': data.volume.toString()
      };
    });
    
    return {
      ok: true,
      json: () => Promise.resolve({
        'Time Series (Daily)': timeSeries
      })
    };
  }
  
  return {
    ok: false,
    status: 404,
    json: () => Promise.resolve({ error: 'Not found' })
  };
}

