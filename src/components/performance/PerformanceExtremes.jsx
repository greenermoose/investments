// components/performance/PerformanceExtremes.jsx
import React from 'react';
import { formatDate, formatPercent } from '../../utils/dataUtils';

/**
 * Component to display extreme performance periods (best and worst)
 */
const PerformanceExtremes = ({ bestWorstPeriods }) => {
  if (!bestWorstPeriods || (!bestWorstPeriods.best && !bestWorstPeriods.worst)) {
    return null;
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Best Performing Period</h2>
        {bestWorstPeriods.best && bestWorstPeriods.best.return !== -Infinity && (
          <div>
            <p className="text-2xl font-bold text-green-600">
              {formatPercent(bestWorstPeriods.best.return)}
            </p>
            <p className="text-gray-600">
              {formatDate(bestWorstPeriods.best.start)} to {formatDate(bestWorstPeriods.best.end)}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Duration: {Math.round((bestWorstPeriods.best.end - bestWorstPeriods.best.start) / (1000 * 60 * 60 * 24))} days
            </p>
          </div>
        )}
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Worst Performing Period</h2>
        {bestWorstPeriods.worst && bestWorstPeriods.worst.return !== Infinity && (
          <div>
            <p className="text-2xl font-bold text-red-600">
              {formatPercent(bestWorstPeriods.worst.return)}
            </p>
            <p className="text-gray-600">
              {formatDate(bestWorstPeriods.worst.start)} to {formatDate(bestWorstPeriods.worst.end)}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Duration: {Math.round((bestWorstPeriods.worst.end - bestWorstPeriods.worst.start) / (1000 * 60 * 60 * 24))} days
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceExtremes;