// components/PortfolioPerformance.jsx
import React, { useState, useEffect } from 'react';
import { 
  getAccountSnapshots,
  getTransactionsByAccount
} from '../utils/portfolioStorage';
import { portfolioService } from '../services/PortfolioService';
import { 
  calculateDateRangeReturns, 
  generateTimeSeriesData 
} from '../utils/portfolioPerformanceMetrics';
import { getEarliestAcquisitionDate } from '../utils/portfolioTracker';

// Import refactored components
import AcquisitionCoverage from './performance/AcquisitionCoverage';
import PositionAnalysis from './performance/PositionAnalysis';
import TransactionSection from './performance/TransactionSection';
import PerformanceCharts from './performance/PerformanceCharts';
import PerformanceExtremes from './performance/PerformanceExtremes';
import TopPerformers from './performance/TopPerformers';

const PortfolioPerformance = ({ portfolioData, portfolioStats, currentAccount, onViewTransactions }) => {
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [returnsPeriods, setReturnsPeriods] = useState([]);
  const [sectorAllocationHistory, setSectorAllocationHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acquisitionDateCoverage, setAcquisitionDateCoverage] = useState({
    transactionDerived: 0,
    manual: 0,
    missing: 0
  });
  const [transactionMismatches, setTransactionMismatches] = useState(0);
  const [bestWorstPeriods, setBestWorstPeriods] = useState({ best: null, worst: null });
  
  useEffect(() => {
    const loadHistoricalData = async () => {
      if (!currentAccount) {
        setIsLoading(false);
        return;
      }
      
      try {
        const snapshots = await getAccountSnapshots(currentAccount);
        const transactions = await getTransactionsByAccount(currentAccount);
        
        if (!snapshots || snapshots.length < 2) {
          setIsLoading(false);
          return;
        }
        
        // Sort snapshots by date
        const sortedSnapshots = snapshots.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Generate time series data
        const tsData = generateTimeSeriesData(sortedSnapshots);
        setTimeSeriesData(tsData);
        
        // Calculate returns for different periods
        const returns = calculateDateRangeReturns(sortedSnapshots);
        setReturnsPeriods(returns);
        
        // Generate sector allocation history
        const sectorHistory = generateSectorAllocationHistory(sortedSnapshots);
        setSectorAllocationHistory(sectorHistory);
        
        // Calculate best and worst periods
        const bestWorst = getBestWorstPeriods(tsData);
        setBestWorstPeriods(bestWorst);
        
        // Analyze acquisition date coverage
        await analyzeAcquisitionDateCoverage(sortedSnapshots[sortedSnapshots.length - 1], transactions);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading historical data:', error);
        setIsLoading(false);
      }
    };
    
    loadHistoricalData();
  }, [currentAccount]);
  
  const analyzeAcquisitionDateCoverage = async (latestSnapshot, transactions) => {
    const stats = {
      transactionDerived: 0,
      manual: 0,
      missing: 0
    };
    
    let mismatches = 0;
    
    // For each position in the latest snapshot
    for (const position of latestSnapshot.data) {
      const symbol = position.Symbol;
      
      // Get transaction-derived acquisition date
      const symbolTransactions = transactions.filter(t => t.symbol === symbol);
      const transactionDate = getEarliestAcquisitionDate(symbol, symbolTransactions);
      
      // Get manually entered acquisition date from metadata
      const metadata = await portfolioService.getSecurityMetadata(symbol, currentAccount);
      const manualDate = metadata?.acquisitionDate;
      
      if (transactionDate && manualDate) {
        // Both exist - check for mismatch
        if (Math.abs(transactionDate - manualDate) > 24 * 60 * 60 * 1000) { // More than 1 day difference
          mismatches++;
        }
        stats.transactionDerived++;
      } else if (transactionDate) {
        stats.transactionDerived++;
      } else if (manualDate) {
        stats.manual++;
      } else {
        stats.missing++;
      }
    }
    
    setAcquisitionDateCoverage(stats);
    setTransactionMismatches(mismatches);
  };
  
  const generateSectorAllocationHistory = (snapshots) => {
    const sectorHistory = snapshots.map(snapshot => {
      const sectorAllocation = {};
      let totalValue = 0;
      
      snapshot.data.forEach(position => {
        const sectorType = position['Security Type'] || 'Unknown';
        const marketValue = position['Mkt Val (Market Value)'] || 0;
        
        if (!sectorAllocation[sectorType]) {
          sectorAllocation[sectorType] = 0;
        }
        sectorAllocation[sectorType] += marketValue;
        totalValue += marketValue;
      });
      
      // Convert to percentages
      const percentages = {};
      Object.keys(sectorAllocation).forEach(sector => {
        percentages[sector] = totalValue > 0 ? (sectorAllocation[sector] / totalValue) * 100 : 0;
      });
      
      return {
        date: new Date(snapshot.date),
        ...percentages,
        totalValue
      };
    });
    
    return sectorHistory;
  };
  
  const getBestWorstPeriods = (data) => {
    if (!data || data.length < 2) return { best: null, worst: null };
    
    let bestPeriod = { start: null, end: null, return: -Infinity };
    let worstPeriod = { start: null, end: null, return: Infinity };
    
    for (let i = 0; i < data.length - 1; i++) {
      for (let j = i + 1; j < data.length; j++) {
        const startValue = data[i].portfolioValue;
        const endValue = data[j].portfolioValue;
        const periodReturn = ((endValue - startValue) / startValue) * 100;
        
        if (periodReturn > bestPeriod.return) {
          bestPeriod = {
            start: new Date(data[i].date),
            end: new Date(data[j].date),
            return: periodReturn
          };
        }
        
        if (periodReturn < worstPeriod.return) {
          worstPeriod = {
            start: new Date(data[i].date),
            end: new Date(data[j].date),
            return: periodReturn
          };
        }
      }
    }
    
    return { best: bestPeriod, worst: worstPeriod };
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-xl">Loading performance data...</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Acquisition Coverage Section */}
      <AcquisitionCoverage 
        acquisitionDateCoverage={acquisitionDateCoverage}
        transactionMismatches={transactionMismatches}
      />
      
      {/* Position Analysis Section */}
      <PositionAnalysis portfolioData={portfolioData} />
      
      {/* Performance Charts Section */}
      {timeSeriesData.length > 1 && (
        <PerformanceCharts 
          timeSeriesData={timeSeriesData}
          sectorAllocationHistory={sectorAllocationHistory}
          returnsPeriods={returnsPeriods}
        />
      )}
      
      {/* Best and Worst Periods */}
      <PerformanceExtremes bestWorstPeriods={bestWorstPeriods} />
      
      {/* Winners & Losers */}
      <TopPerformers portfolioData={portfolioData} />
      
      {/* Transaction Section */}
      <TransactionSection onViewTransactions={onViewTransactions} />
    </div>
  );
};

export default PortfolioPerformance;