# Performance Tab Enhancement Guide

## Overview

The enhanced Performance tab now provides comprehensive portfolio analysis across multiple time periods using historical data from multiple portfolio exports. The tab automatically analyzes all uploaded CSV files to provide trend analysis, performance metrics, and risk assessment.

## Features

### 1. Portfolio Value Over Time

**Time-Series Chart**
- Visualizes portfolio value across all uploaded snapshots
- Interactive area chart with gradient fill
- Time range filtering: 1M, 3M, 6M, 1Y, All
- Tooltips show exact values and dates

### 2. Portfolio Returns Summary

**Period Performance**
- 1 Month, 3 Months, 6 Months, 1 Year, All Time returns
- Color-coded (green for gains, red for losses)
- Shows starting and ending values
- Automatic calculation based on closest snapshots

### 3. Best and Worst Performing Periods

**Performance Extremes**
- Identifies highest and lowest performing periods
- Shows date ranges and returns
- Calculates duration in days
- Helps understand portfolio cyclicality

### 4. Asset Allocation Over Time

**Sector Evolution**
- Stacked area chart showing allocation changes
- Tracks percentage distribution by security type
- Interactive legend to filter sectors
- Shows how portfolio composition evolved

### 5. Current Day Performance

**Daily Snapshot**
- Shows today's portfolio movement
- Based on day change values in latest snapshot
- Simple before/after visualization

### 6. Top Gainers and Losers

**Current Holdings Performance**
- Top 5 best and worst performers
- Based on current snapshot
- Shows both percentage and dollar gains/losses

## Technical Implementation

### Data Processing

1. **Historical Data Loading**
   - Retrieves all snapshots for current account
   - Sorts by date for chronological analysis
   - Handles missing or incomplete data gracefully

2. **Return Calculations**
   - Period-specific return calculations
   - Handles floating-point precision in date matching
   - Calculates annualized returns for longer periods

3. **Risk Metrics**
   - Volatility calculations
   - Maximum drawdown detection
   - Best/worst period identification
   - Portfolio concentration metrics

### Performance Considerations

- Lazy loading of historical data
- Efficient time-series data generation
- Minimal re-renders with proper state management
- Optimized chart rendering for large datasets

## Usage Guidelines

### Uploading Multiple Portfolios

1. Export portfolio data from brokerage with dates in filename
2. Upload files using the "Upload New Portfolio" button
3. Files automatically processed and stored
4. Performance tab updates automatically

### Interpreting Charts

- **Portfolio Value**: Overall trend and growth
- **Returns**: Period-specific performance metrics
- **Asset Allocation**: Diversification changes
- **Extremes**: Risk and reward analysis

### Best Practices

1. Upload portfolios regularly for accurate trending
2. Use time range filters for focused analysis
3. Monitor sector allocation for diversification
4. Review best/worst periods for pattern recognition

## Future Enhancements

Potential additions to consider:
- Benchmark comparison (S&P 500, etc.)
- Risk-adjusted return metrics (Sharpe ratio)
- Portfolio correlation analysis
- Dividend and income tracking
- Tax-loss harvesting opportunities
- Monte Carlo projections

## Troubleshooting

Common issues and solutions:
- **No historical data**: Upload additional portfolio snapshots
- **Gaps in timeline**: Upload missing period exports
- **Incorrect returns**: Verify date extraction from filenames
- **Missing sectors**: Check CSV format consistency