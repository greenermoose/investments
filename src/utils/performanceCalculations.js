// utils/performanceCalculations.js
/**
 * Calculates portfolio performance metrics over different time periods
 */

/**
 * Generates time series data from portfolio snapshots
 * @param {Array} snapshots - Array of portfolio snapshots
 * @returns {Array} Time series data points
 */
export const generateTimeSeriesData = (snapshots) => {
    return snapshots.map(snapshot => {
      const portfolioValue = snapshot.accountTotal?.totalValue || 
        snapshot.data.reduce((sum, position) => {
          const value = position['Mkt Val (Market Value)'] || 0;
          return sum + value;
        }, 0);
      
      const totalGain = snapshot.accountTotal?.totalGain ||
        snapshot.data.reduce((sum, position) => {
          const gain = position['Gain $ (Gain/Loss $)'] || 0;
          return sum + gain;
        }, 0);
      
      const totalCost = portfolioValue - totalGain;
      const returnPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
      
      return {
        date: snapshot.date,
        portfolioValue,
        totalGain,
        totalCost,
        returnPercent
      };
    });
  };
  
  /**
   * Calculates returns for different date ranges
   * @param {Array} snapshots - Array of portfolio snapshots
   * @returns {Array} Return data for different periods
   */
  export const calculateDateRangeReturns = (snapshots) => {
    if (!snapshots || snapshots.length < 2) return [];
    
    const periods = [
      { label: '1 Month', months: 1 },
      { label: '3 Months', months: 3 },
      { label: '6 Months', months: 6 },
      { label: '1 Year', months: 12 },
      { label: 'All Time', months: null }
    ];
    
    const currentDate = new Date();
    const latestSnapshot = snapshots[snapshots.length - 1];
    
    const returns = periods.map(period => {
      let startSnapshot = null;
      
      if (period.months === null) {
        // All time - use first snapshot
        startSnapshot = snapshots[0];
      } else {
        // Find snapshot closest to the target date
        const targetDate = new Date();
        targetDate.setMonth(currentDate.getMonth() - period.months);
        
        for (let i = 0; i < snapshots.length; i++) {
          const snapshotDate = new Date(snapshots[i].date);
          if (snapshotDate <= targetDate) {
            startSnapshot = snapshots[i];
          } else {
            break;
          }
        }
      }
      
      if (!startSnapshot) return null;
      
      const startValue = startSnapshot.accountTotal?.totalValue || 0;
      const endValue = latestSnapshot.accountTotal?.totalValue || 0;
      const returnPercent = startValue > 0 ? ((endValue - startValue) / startValue) * 100 : 0;
      
      return {
        label: period.label,
        startValue,
        endValue,
        return: returnPercent,
        startDate: startSnapshot.date,
        endDate: latestSnapshot.date
      };
    }).filter(Boolean);
    
    return returns;
  };
  
  /**
   * Calculates annualized return for a given period
   * @param {number} totalReturn - Total return percentage
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {number} Annualized return percentage
   */
  export const calculateAnnualizedReturn = (totalReturn, startDate, endDate) => {
    const years = (endDate - startDate) / (365.25 * 24 * 60 * 60 * 1000);
    if (years <= 0) return 0;
    
    return ((Math.pow(1 + (totalReturn / 100), 1 / years) - 1) * 100);
  };
  
  /**
   * Calculates Sharpe ratio for portfolio performance
   * @param {Array} returns - Array of period returns
   * @param {number} riskFreeRate - Annual risk-free rate (default 3%)
   * @returns {number} Sharpe ratio
   */
  export const calculateSharpeRatio = (returns, riskFreeRate = 3) => {
    if (!returns || returns.length < 2) return null;
    
    // Calculate mean return
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    
    // Calculate standard deviation
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return null;
    
    // Annualized Sharpe ratio
    return ((meanReturn - riskFreeRate) / stdDev) * Math.sqrt(12);
  };
  
  /**
   * Calculates portfolio volatility
   * @param {Array} returns - Array of period returns
   * @returns {Object} Volatility statistics
   */
  export const calculateVolatility = (returns) => {
    if (!returns || returns.length < 2) return null;
    
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    
    // Calculate standard deviation
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    // Annualized volatility
    const annualizedVolatility = stdDev * Math.sqrt(12);
    
    return {
      monthlyStdDev: stdDev,
      annualizedVolatility,
      meanReturn
    };
  };
  
  /**
   * Calculates portfolio beta relative to a benchmark
   * @param {Array} portfolioReturns - Portfolio returns
   * @param {Array} benchmarkReturns - Benchmark returns (e.g., S&P 500)
   * @returns {number} Portfolio beta
   */
  export const calculateBeta = (portfolioReturns, benchmarkReturns) => {
    if (!portfolioReturns || !benchmarkReturns || portfolioReturns.length !== benchmarkReturns.length) {
      return null;
    }
    
    const portfolioMean = portfolioReturns.reduce((sum, r) => sum + r, 0) / portfolioReturns.length;
    const benchmarkMean = benchmarkReturns.reduce((sum, r) => sum + r, 0) / benchmarkReturns.length;
    
    let covariance = 0;
    let benchmarkVariance = 0;
    
    for (let i = 0; i < portfolioReturns.length; i++) {
      covariance += (portfolioReturns[i] - portfolioMean) * (benchmarkReturns[i] - benchmarkMean);
      benchmarkVariance += Math.pow(benchmarkReturns[i] - benchmarkMean, 2);
    }
    
    covariance /= portfolioReturns.length;
    benchmarkVariance /= benchmarkReturns.length;
    
    if (benchmarkVariance === 0) return null;
    
    return covariance / benchmarkVariance;
  };
  
  /**
   * Calculates maximum drawdown
   * @param {Array} values - Array of portfolio values
   * @returns {Object} Maximum drawdown information
   */
  export const calculateMaxDrawdown = (values) => {
    if (!values || values.length < 2) return null;
    
    let peak = values[0];
    let maxDrawdown = 0;
    let peakDate = null;
    let troughDate = null;
    let currentDateIndex = 0;
    
    for (let i = 0; i < values.length; i++) {
      if (values[i] > peak) {
        peak = values[i];
        currentDateIndex = i;
      }
      
      const drawdown = ((values[i] - peak) / peak) * 100;
      if (drawdown < maxDrawdown) {
        maxDrawdown = drawdown;
        peakDate = currentDateIndex;
        troughDate = i;
      }
    }
    
    return {
      maxDrawdown,
      peakValue: peak,
      peakIndex: peakDate,
      troughIndex: troughDate
    };
  };
  
  /**
   * Calculates sector performance contribution
   * @param {Object} startingSnapshot - Starting portfolio snapshot
   * @param {Object} endingSnapshot - Ending portfolio snapshot
   * @returns {Array} Sector contribution data
   */
  export const calculateSectorContribution = (startingSnapshot, endingSnapshot) => {
    const sectorContributions = {};
    const startValue = startingSnapshot.accountTotal?.totalValue || 0;
    
    // Process ending snapshot to get current sector values
    endingSnapshot.data.forEach(position => {
      const sector = position['Security Type'] || 'Unknown';
      const marketValue = position['Mkt Val (Market Value)'] || 0;
      const gain = position['Gain $ (Gain/Loss $)'] || 0;
      
      if (!sectorContributions[sector]) {
        sectorContributions[sector] = {
          marketValue: 0,
          totalGain: 0,
          positions: 0
        };
      }
      
      sectorContributions[sector].marketValue += marketValue;
      sectorContributions[sector].totalGain += gain;
      sectorContributions[sector].positions += 1;
    });
    
    // Calculate contribution as percentage
    const contributions = Object.entries(sectorContributions).map(([sector, data]) => {
      const contribution = startValue > 0 ? (data.totalGain / startValue) * 100 : 0;
      return {
        sector,
        contribution,
        marketValue: data.marketValue,
        totalGain: data.totalGain,
        positions: data.positions
      };
    });
    
    return contributions.sort((a, b) => b.contribution - a.contribution);
  };
  
  /**
   * Calculates portfolio turnover rate
   * @param {Array} snapshots - Array of portfolio snapshots
   * @param {Object} options - Calculation options
   * @returns {number} Annual turnover rate
   */
  export const calculateTurnoverRate = (snapshots, options = {}) => {
    if (!snapshots || snapshots.length < 2) return null;
    
    const period = options.annualize ? 12 : 1; // Annualize by default
    let totalTrades = 0;
    let totalValue = 0;
    let totalPeriods = 0;
    
    for (let i = 1; i < snapshots.length; i++) {
      const previousSnapshot = snapshots[i - 1];
      const currentSnapshot = snapshots[i];
      
      const previousPositions = new Map();
      const currentPositions = new Map();
      
      // Build position maps
      previousSnapshot.data.forEach(pos => {
        previousPositions.set(pos.Symbol, pos['Mkt Val (Market Value)'] || 0);
      });
      
      currentSnapshot.data.forEach(pos => {
        currentPositions.set(pos.Symbol, pos['Mkt Val (Market Value)'] || 0);
      });
      
      // Calculate sold and bought values
      let soldValue = 0;
      let boughtValue = 0;
      let startingValue = previousSnapshot.accountTotal?.totalValue || 0;
      let endingValue = currentSnapshot.accountTotal?.totalValue || 0;
      let avgValue = (startingValue + endingValue) / 2;
      
      // Find sold positions
      previousPositions.forEach((value, symbol) => {
        if (!currentPositions.has(symbol)) {
          soldValue += value;
        }
      });
      
      // Find bought positions
      currentPositions.forEach((value, symbol) => {
        if (!previousPositions.has(symbol)) {
          boughtValue += value;
        }
      });
      
      // Calculate turnover for this period
      if (avgValue > 0) {
        totalTrades += Math.min(soldValue, boughtValue);
        totalValue += avgValue;
        totalPeriods += 1;
      }
    }
    
    if (totalValue === 0 || totalPeriods === 0) return null;
    
    const averageTurnover = (totalTrades / totalValue) / totalPeriods;
    return averageTurnover * period; // Annualized
  };
  
  /**
   * Calculates portfolio concentration metrics
   * @param {Object} snapshot - Portfolio snapshot
   * @returns {Object} Concentration metrics
   */
  export const calculateConcentration = (snapshot) => {
    if (!snapshot || !snapshot.data) return null;
    
    const positions = [...snapshot.data]
      .filter(pos => pos['Mkt Val (Market Value)'] > 0)
      .sort((a, b) => b['Mkt Val (Market Value)'] - a['Mkt Val (Market Value)']);
    
    const totalValue = positions.reduce((sum, pos) => sum + pos['Mkt Val (Market Value)'], 0);
    
    // Calculate concentration ratios
    const top5Value = positions.slice(0, 5).reduce((sum, pos) => sum + pos['Mkt Val (Market Value)'], 0);
    const top10Value = positions.slice(0, 10).reduce((sum, pos) => sum + pos['Mkt Val (Market Value)'], 0);
    
    // Calculate Herfindahl-Hirschman Index (HHI)
    let hhi = 0;
    positions.forEach(pos => {
      const marketShare = pos['Mkt Val (Market Value)'] / totalValue;
      hhi += Math.pow(marketShare, 2);
    });
    
    return {
      top5Concentration: totalValue > 0 ? (top5Value / totalValue) * 100 : 0,
      top10Concentration: totalValue > 0 ? (top10Value / totalValue) * 100 : 0,
      herfindahlIndex: hhi,
      numberOfPositions: positions.length,
      largestPosition: positions[0] ? {
        symbol: positions[0].Symbol,
        value: positions[0]['Mkt Val (Market Value)'],
        percentage: totalValue > 0 ? (positions[0]['Mkt Val (Market Value)'] / totalValue) * 100 : 0
      } : null
    };
  };
  
  /**
   * Calculates risk metrics
   * @param {Array} timeSeriesData - Time series data
   * @returns {Object} Risk metrics
   */
  export const calculateRiskMetrics = (timeSeriesData) => {
    if (!timeSeriesData || timeSeriesData.length < 2) return null;
    
    // Calculate periodic returns
    const returns = [];
    for (let i = 1; i < timeSeriesData.length; i++) {
      const previousValue = timeSeriesData[i - 1].portfolioValue;
      const currentValue = timeSeriesData[i].portfolioValue;
      if (previousValue > 0) {
        returns.push(((currentValue - previousValue) / previousValue) * 100);
      }
    }
    
    if (returns.length === 0) return null;
    
    // Calculate basic risk metrics
    const volatility = calculateVolatility(returns);
    const maxDrawdown = calculateMaxDrawdown(timeSeriesData.map(d => d.portfolioValue));
    
    // Calculate Value at Risk (VaR) at 95% confidence level
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const varIndex = Math.floor(sortedReturns.length * 0.05);
    const var95 = sortedReturns[varIndex];
    
    // Calculate Conditional Value at Risk (CVaR)
    const cvar95 = sortedReturns.slice(0, varIndex + 1).reduce((sum, ret) => sum + ret, 0) / (varIndex + 1);
    
    return {
      volatility,
      maxDrawdown,
      var95,
      cvar95,
      periodicReturns: returns
    };
  };
  
  /**
   * Generates portfolio performance report
   * @param {Array} snapshots - Array of portfolio snapshots
   * @returns {Object} Comprehensive performance report
   */
  export const generatePerformanceReport = (snapshots) => {
    if (!snapshots || snapshots.length < 2) return null;
    
    const timeSeriesData = generateTimeSeriesData(snapshots);
    const returns = calculateDateRangeReturns(snapshots);
    const riskMetrics = calculateRiskMetrics(timeSeriesData);
    const latestSnapshot = snapshots[snapshots.length - 1];
    const concentration = calculateConcentration(latestSnapshot);
    const turnoverRate = calculateTurnoverRate(snapshots);
    
    // Calculate annualized returns for longer periods
    const allTimeReturn = returns.find(r => r.label === 'All Time');
    const annualizedReturn = allTimeReturn ? 
      calculateAnnualizedReturn(
        allTimeReturn.return,
        new Date(allTimeReturn.startDate),
        new Date(allTimeReturn.endDate)
      ) : null;
    
    return {
      timeSeriesData,
      returns,
      riskMetrics,
      concentration,
      turnoverRate,
      annualizedReturn,
      summary: {
        totalReturn: allTimeReturn?.return,
        annualizedReturn,
        volatility: riskMetrics?.volatility?.annualizedVolatility,
        maxDrawdown: riskMetrics?.maxDrawdown?.maxDrawdown,
        sharpeRatio: riskMetrics?.volatility ? 
          calculateSharpeRatio(riskMetrics.periodicReturns) : null
      }
    };
  };