// components/PortfolioAnalysis.jsx revision: 1
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrency, formatPercent } from '../utils/dataUtils';

const PortfolioAnalysis = ({ portfolioData, portfolioStats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Portfolio Diversification */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Portfolio Diversification</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={(() => {
                  // Group positions by percentage of portfolio
                  const positionsBySize = [
                    { name: 'Large (>5%)', value: 0 },
                    { name: 'Medium (1-5%)', value: 0 },
                    { name: 'Small (<1%)', value: 0 }
                  ];
                  
                  portfolioData.forEach(position => {
                    const percentOfPortfolio = position['% of Acct (% of Account)'];
                    
                    if (typeof percentOfPortfolio === 'number') {
                      if (percentOfPortfolio > 5) {
                        positionsBySize[0].value += position['Mkt Val (Market Value)'] || 0;
                      } else if (percentOfPortfolio >= 1) {
                        positionsBySize[1].value += position['Mkt Val (Market Value)'] || 0;
                      } else {
                        positionsBySize[2].value += position['Mkt Val (Market Value)'] || 0;
                      }
                    }
                  });
                  
                  return positionsBySize;
                })()}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell key="cell-0" fill="#FF8042" />
                <Cell key="cell-1" fill="#00C49F" />
                <Cell key="cell-2" fill="#0088FE" />
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4">
          <h3 className="font-semibold">Diversification Analysis</h3>
          <p className="text-gray-600 text-sm mt-2">
            This chart shows how your investments are distributed by position size. 
            A well-diversified portfolio typically has a balanced distribution to minimize risk.
          </p>
        </div>
      </div>
      
      {/* Performance Distribution */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Performance Distribution</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={(() => {
                  // Group positions by performance
                  const positionsByPerformance = [
                    { name: 'Strong Gain (>20%)', value: 0 },
                    { name: 'Moderate Gain (0-20%)', value: 0 },
                    { name: 'Loss', value: 0 }
                  ];
                  
                  portfolioData.forEach(position => {
                    const gainPercent = position['Gain % (Gain/Loss %)'];
                    
                    if (typeof gainPercent === 'number' && typeof position['Mkt Val (Market Value)'] === 'number') {
                      if (gainPercent > 20) {
                        positionsByPerformance[0].value += position['Mkt Val (Market Value)'];
                      } else if (gainPercent >= 0) {
                        positionsByPerformance[1].value += position['Mkt Val (Market Value)'];
                      } else {
                        positionsByPerformance[2].value += position['Mkt Val (Market Value)'];
                      }
                    }
                  });
                  
                  return positionsByPerformance;
                })()}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell key="cell-0" fill="#00C49F" />
                <Cell key="cell-1" fill="#0088FE" />
                <Cell key="cell-2" fill="#FF8042" />
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4">
          <h3 className="font-semibold">Performance Analysis</h3>
          <p className="text-gray-600 text-sm mt-2">
            This chart categorizes your investments by their performance. 
            It helps identify which portions of your portfolio are driving overall gains or losses.
          </p>
        </div>
      </div>
      
      {/* Portfolio Metrics */}
      <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
        <h2 className="text-xl font-semibold mb-4">Portfolio Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="text-gray-500 text-sm">Profitable Positions</h3>
            <p className="text-xl font-semibold">
              {portfolioData.filter(p => 
                typeof p['Gain % (Gain/Loss %)'] === 'number' && p['Gain % (Gain/Loss %)'] > 0
              ).length} / {portfolioData.length}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="text-gray-500 text-sm">Average Gain %</h3>
            <p className="text-xl font-semibold">
              {formatPercent(
                portfolioData
                  .filter(p => typeof p['Gain % (Gain/Loss %)'] === 'number')
                  .reduce((sum, p) => sum + p['Gain % (Gain/Loss %)'], 0) / 
                  portfolioData.filter(p => typeof p['Gain % (Gain/Loss %)'] === 'number').length || 0
              )}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="text-gray-500 text-sm">Best Performer</h3>
            <p className="text-xl font-semibold">
              {(() => {
                const bestPerformer = [...portfolioData]
                  .filter(p => typeof p['Gain % (Gain/Loss %)'] === 'number')
                  .sort((a, b) => b['Gain % (Gain/Loss %)'] - a['Gain % (Gain/Loss %)'])[0];
                
                return bestPerformer ? `${bestPerformer.Symbol} (${formatPercent(bestPerformer['Gain % (Gain/Loss %)'])})` : 'N/A';
              })()}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="text-gray-500 text-sm">Worst Performer</h3>
            <p className="text-xl font-semibold">
              {(() => {
                const worstPerformer = [...portfolioData]
                  .filter(p => typeof p['Gain % (Gain/Loss %)'] === 'number')
                  .sort((a, b) => a['Gain % (Gain/Loss %)'] - b['Gain % (Gain/Loss %)'])[0];
                
                return worstPerformer ? `${worstPerformer.Symbol} (${formatPercent(worstPerformer['Gain % (Gain/Loss %)'])})` : 'N/A';
              })()}
            </p>
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Recommendations</h3>
          <ul className="list-disc pl-5 text-gray-600">
            <li className="mb-1">
              Consider rebalancing positions that exceed 5% of your portfolio to reduce concentration risk.
            </li>
            <li className="mb-1">
              Review underperforming positions to determine if they still align with your investment strategy.
            </li>
            <li className="mb-1">
              Set up regular contributions to positions with strong fundamentals that are currently underweighted.
            </li>
            <li className="mb-1">
              Consider tax implications before selling profitable positions, especially those held less than a year.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PortfolioAnalysis;