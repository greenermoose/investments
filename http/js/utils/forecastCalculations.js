// Forecast calculation utilities for price predictions

/**
 * Simple linear regression for trend projection
 * @param {Array} dataPoints - Array of {date, price} objects
 * @returns {Object} Regression parameters {slope, intercept, rSquared}
 */
export function calculateLinearRegression(dataPoints) {
  if (!dataPoints || dataPoints.length < 2) {
    return { slope: 0, intercept: 0, rSquared: 0 };
  }
  
  const n = dataPoints.length;
  const xValues = dataPoints.map((_, i) => i);
  const yValues = dataPoints.map(d => d.price);
  
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
  const sumYY = yValues.reduce((sum, y) => sum + y * y, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R-squared
  const yMean = sumY / n;
  const ssRes = yValues.reduce((sum, y, i) => {
    const predicted = slope * xValues[i] + intercept;
    return sum + Math.pow(y - predicted, 2);
  }, 0);
  const ssTot = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const rSquared = 1 - (ssRes / ssTot);
  
  return { slope, intercept, rSquared };
}

/**
 * Calculate moving average
 * @param {Array} dataPoints - Array of {date, price} objects
 * @param {number} window - Window size for moving average
 * @returns {Array} Array of moving average values
 */
export function calculateMovingAverage(dataPoints, window = 20) {
  if (!dataPoints || dataPoints.length < window) {
    return dataPoints.map(d => d.price);
  }
  
  return dataPoints.map((_, index) => {
    if (index < window - 1) {
      return dataPoints[index].price;
    }
    
    const windowData = dataPoints.slice(index - window + 1, index + 1);
    const sum = windowData.reduce((acc, d) => acc + d.price, 0);
    return sum / window;
  });
}

/**
 * Calculate standard deviation
 * @param {Array} values - Array of numbers
 * @returns {number} Standard deviation
 */
export function calculateStandardDeviation(values) {
  if (!values || values.length === 0) return 0;
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Calculate volatility (standard deviation of returns)
 * @param {Array} dataPoints - Array of {date, price} objects
 * @returns {number} Volatility
 */
export function calculateVolatility(dataPoints) {
  if (!dataPoints || dataPoints.length < 2) return 0;
  
  const returns = [];
  for (let i = 1; i < dataPoints.length; i++) {
    const prevPrice = dataPoints[i - 1].price;
    const currPrice = dataPoints[i].price;
    if (prevPrice > 0) {
      returns.push((currPrice - prevPrice) / prevPrice);
    }
  }
  
  return calculateStandardDeviation(returns);
}

/**
 * Generate forecast using linear regression
 * @param {Array} historicalData - Array of {date, price} objects
 * @param {number} daysAhead - Number of days to forecast
 * @returns {Array} Forecasted data points
 */
export function generateLinearForecast(historicalData, daysAhead = 30) {
  if (!historicalData || historicalData.length < 2) {
    return [];
  }
  
  const regression = calculateLinearRegression(historicalData);
  const lastIndex = historicalData.length - 1;
  const lastDate = historicalData[lastIndex].date;
  const lastPrice = historicalData[lastIndex].price;
  
  const forecast = [];
  for (let i = 1; i <= daysAhead; i++) {
    const daysFromLast = i;
    const predictedPrice = regression.slope * (lastIndex + daysFromLast) + regression.intercept;
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(forecastDate.getDate() + daysFromLast);
    
    forecast.push({
      date: forecastDate,
      price: predictedPrice,
      confidence: Math.max(0, Math.min(1, regression.rSquared))
    });
  }
  
  return forecast;
}

/**
 * Generate forecast using moving average projection
 * @param {Array} historicalData - Array of {date, price} objects
 * @param {number} daysAhead - Number of days to forecast
 * @param {number} window - Moving average window
 * @returns {Array} Forecasted data points
 */
export function generateMovingAverageForecast(historicalData, daysAhead = 30, window = 20) {
  if (!historicalData || historicalData.length < window) {
    return [];
  }
  
  const ma = calculateMovingAverage(historicalData, window);
  const lastMA = ma[ma.length - 1];
  const lastDate = historicalData[historicalData.length - 1].date;
  const recentTrend = lastMA - ma[ma.length - Math.min(10, ma.length)];
  
  const forecast = [];
  for (let i = 1; i <= daysAhead; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(forecastDate.getDate() + i);
    
    // Project forward with recent trend
    const projectedPrice = lastMA + (recentTrend * (i / 10));
    
    forecast.push({
      date: forecastDate,
      price: projectedPrice,
      confidence: 0.6 // Lower confidence for MA-based forecasts
    });
  }
  
  return forecast;
}

/**
 * Generate scenario forecasts (best case, base case, worst case)
 * @param {Array} historicalData - Array of {date, price} objects
 * @param {number} daysAhead - Number of days to forecast
 * @returns {Object} Object with bestCase, baseCase, worstCase arrays
 */
export function generateScenarioForecasts(historicalData, daysAhead = 30) {
  if (!historicalData || historicalData.length < 2) {
    return {
      bestCase: [],
      baseCase: [],
      worstCase: []
    };
  }
  
  const baseForecast = generateLinearForecast(historicalData, daysAhead);
  const volatility = calculateVolatility(historicalData);
  const lastPrice = historicalData[historicalData.length - 1].price;
  
  const scenarios = {
    baseCase: baseForecast,
    bestCase: [],
    worstCase: []
  };
  
  // Best case: +2 standard deviations
  // Worst case: -2 standard deviations
  const stdDevMultiplier = 2;
  
  baseForecast.forEach((point, index) => {
    const daysFromNow = index + 1;
    const volatilityAdjustment = lastPrice * volatility * stdDevMultiplier * Math.sqrt(daysFromNow / 365);
    
    scenarios.bestCase.push({
      date: point.date,
      price: point.price + volatilityAdjustment,
      confidence: point.confidence * 0.8
    });
    
    scenarios.worstCase.push({
      date: point.date,
      price: point.price - volatilityAdjustment,
      confidence: point.confidence * 0.8
    });
  });
  
  return scenarios;
}

