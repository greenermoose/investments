import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { formatCurrency, formatPercent, formatDate } from '../../utils/dataUtils';
import { calculatePortfolioStats } from '../../utils/portfolioPerformanceMetrics';

/**
 * Component for displaying an interactive timeline of portfolio snapshots
 * Allows users to click on points to view or compare snapshots
 */
const SnapshotTimeline = ({ 
  snapshots, 
  onSnapshotSelect, 
  onSnapshotCompare,
  selectedSnapshots = [],
  isComparing = false,
  metricData,
  activeMetric
}) => {
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
    .map(snapshot => {
      const stats = calculatePortfolioStats(snapshot.data);
      return {
        date: new Date(snapshot.date),
        totalValue: stats.totalValue,
        positions: snapshot.data?.length || 0,
        gainLoss: stats.totalGain,
        return: stats.gainPercent,
        snapshot,
        isSelected: selectedSnapshots.some(selected => selected.id === snapshot.id)
      };
    });

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const date = new Date(data.date);
      const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
      
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-md rounded">
          <p className="font-medium text-gray-900">{formattedDate}</p>
          {activeMetric === 'totalValue' && (
            <p className="text-sm text-gray-900 font-semibold">{formatCurrency(data.totalValue)}</p>
          )}
          {activeMetric === 'positions' && (
            <p className="text-sm text-gray-900 font-semibold">{data.positions} positions</p>
          )}
          {activeMetric === 'gainLoss' && (
            <p className={`text-sm font-semibold ${data.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(data.gainLoss)}
            </p>
          )}
          {activeMetric === 'return' && (
            <p className={`text-sm font-semibold ${data.return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(data.return)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const getMetricValue = (data) => {
    switch (activeMetric) {
      case 'totalValue':
        return data.totalValue;
      case 'positions':
        return data.positions;
      case 'gainLoss':
        return data.gainLoss;
      case 'return':
        return data.return;
      default:
        return data.totalValue;
    }
  };

  const getYAxisFormatter = (value) => {
    switch (activeMetric) {
      case 'totalValue':
      case 'gainLoss':
        return formatCurrency(value);
      case 'positions':
        return value;
      case 'return':
        return formatPercent(value);
      default:
        return formatCurrency(value);
    }
  };

  const handlePointClick = (data) => {
    if (data && data.snapshot) {
      if (isComparing) {
        onSnapshotCompare(data.snapshot);
      } else {
        onSnapshotSelect(data.snapshot);
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={timelineData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            onClick={(data) => {
              if (data && data.activePayload) {
                const snapshot = snapshots.find(s => new Date(s.date).getTime() === new Date(data.activePayload[0].payload.date).getTime());
                if (snapshot) {
                  if (isComparing) {
                    onSnapshotCompare(snapshot);
                  } else {
                    onSnapshotSelect(snapshot);
                  }
                }
              }
            }}
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
              tickFormatter={getYAxisFormatter}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ stroke: '#8884d8', strokeWidth: 1 }}
              isAnimationActive={false}
            />
            <Legend />
            
            {/* Line for the active metric */}
            <Line
              type="monotone"
              dataKey={activeMetric}
              stroke="#8884d8"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props;
                const isSelected = selectedSnapshots.some(selected => selected.id === payload.snapshot.id);
                return (
                  <circle
                    key={`dot-${payload.date}`}
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 8 : 4}
                    fill={isSelected ? "#ff7300" : "#8884d8"}
                    stroke={isSelected ? "#ff7300" : "#8884d8"}
                    strokeWidth={isSelected ? 3 : 2}
                    style={{ 
                      cursor: 'pointer',
                      filter: isSelected ? 'drop-shadow(0 0 2px rgba(255, 115, 0, 0.5))' : 'none'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePointClick(payload);
                    }}
                  />
                );
              }}
              activeDot={(props) => {
                const { cx, cy, payload } = props;
                const isSelected = selectedSnapshots.some(selected => selected.id === payload.snapshot.id);
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 10 : 8}
                    fill={isSelected ? "#ff7300" : "#8884d8"}
                    stroke={isSelected ? "#ff7300" : "#8884d8"}
                    strokeWidth={isSelected ? 3 : 2}
                    style={{ 
                      cursor: 'pointer',
                      filter: isSelected ? 'drop-shadow(0 0 3px rgba(255, 115, 0, 0.6))' : 'none'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePointClick(payload);
                    }}
                  />
                );
              }}
              name={activeMetric === 'totalValue' ? 'Portfolio Value' : 
                    activeMetric === 'positions' ? 'Number of Positions' :
                    activeMetric === 'gainLoss' ? 'Gain/Loss' : 'Return'}
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

      {isComparing && (
        <div className="mt-4 text-sm text-gray-600">
          {selectedSnapshots.length === 0 ? (
            <p>Click on two snapshots to compare them</p>
          ) : selectedSnapshots.length === 1 ? (
            <p>Select one more snapshot to complete the comparison</p>
          ) : (
            <p>Two snapshots selected. Click "Cancel Comparison" to view the comparison</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SnapshotTimeline; 