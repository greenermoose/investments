import React, { useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { formatCurrency, formatDate } from '../../utils/dataUtils';
import { Compare, X as XIcon } from 'lucide-react';

/**
 * Component for displaying an interactive timeline of portfolio snapshots
 * Allows users to click on points to view or compare snapshots
 */
const SnapshotTimeline = ({ 
  snapshots, 
  onSnapshotSelect, 
  onSnapshotCompare,
  selectedSnapshots = [],
  isComparing = false 
}) => {
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!snapshots || snapshots.length < 2) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-500">Insufficient data for timeline visualization</p>
        <p className="text-sm text-gray-400 mt-2">Upload more portfolio snapshots to see the timeline</p>
      </div>
    );
  }

  // Prepare data for the chart
  const timelineData = snapshots
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(snapshot => ({
      date: new Date(snapshot.date),
      portfolioValue: snapshot.accountTotal?.totalValue || 0,
      snapshot,
      isSelected: selectedSnapshots.includes(snapshot)
    }));

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium">{formatDate(data.date)}</p>
          <p className="text-gray-600">Value: {formatCurrency(data.portfolioValue)}</p>
          {isComparisonMode && (
            <button
              onClick={() => onSnapshotCompare(data.snapshot)}
              className={`mt-2 px-3 py-1 text-sm rounded transition-colors ${
                data.isSelected 
                  ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
              disabled={data.isSelected}
            >
              {data.isSelected ? 'Selected' : 'Select for Comparison'}
            </button>
          )}
        </div>
      );
    }
    return null;
  };

  const handlePointClick = (data) => {
    if (data && data.activePayload) {
      const snapshot = data.activePayload[0].payload.snapshot;
      if (isComparisonMode) {
        onSnapshotCompare(snapshot);
      } else {
        onSnapshotSelect(snapshot);
      }
    }
  };

  const toggleComparisonMode = () => {
    setIsComparisonMode(!isComparisonMode);
    if (isComparisonMode) {
      // Clear selections when exiting comparison mode
      onSnapshotCompare(null);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Portfolio Timeline</h2>
        <div className="flex items-center space-x-4">
          {isComparisonMode && (
            <div className="text-sm text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              Comparison Mode
            </div>
          )}
          <button
            onClick={toggleComparisonMode}
            className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isComparisonMode
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isComparisonMode ? (
              <>
                <XIcon className="h-4 w-4 mr-1" />
                Exit Comparison
              </>
            ) : (
              <>
                <Compare className="h-4 w-4 mr-1" />
                Compare Snapshots
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={timelineData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            onClick={handlePointClick}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => {
                const d = new Date(date);
                return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
              }}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Portfolio Value Line */}
            <Line
              type="monotone"
              dataKey="portfolioValue"
              stroke="#8884d8"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={payload.isSelected ? 6 : 4}
                    fill={payload.isSelected ? "#ff7300" : "#8884d8"}
                    stroke={payload.isSelected ? "#ff7300" : "#8884d8"}
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 6 }}
              name="Portfolio Value"
            />
            
            {/* Reference lines for selected snapshots */}
            {selectedSnapshots.map((snapshot, index) => (
              <ReferenceLine
                key={snapshot.id}
                x={new Date(snapshot.date)}
                stroke={index === 0 ? "#ff7300" : "#00C49F"}
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{
                  value: (() => {
                    const d = new Date(snapshot.date);
                    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
                  })(),
                  position: 'top',
                  fill: index === 0 ? "#ff7300" : "#00C49F"
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {isComparisonMode && (
        <div className="mt-4 text-sm text-gray-600">
          {selectedSnapshots.length === 0 ? (
            <p>Click on two snapshots to compare them</p>
          ) : selectedSnapshots.length === 1 ? (
            <p>Select one more snapshot to complete the comparison</p>
          ) : (
            <p>Two snapshots selected. Click "Exit Comparison" to view the comparison</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SnapshotTimeline; 