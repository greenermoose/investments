#!/usr/bin/env node
/**
 * Manual test script for portfolio display functionality
 * Tests portfolio data structure and calculations
 * 
 * Usage: node tests/manual/test-portfolio-display.js
 * 
 * Note: This test validates data structures and calculations.
 * For full browser-based UI testing, use the acceptance tests.
 */

import { assert, assertEqual, runTests, formatTestResults } from '../helpers/testUtils.js';
import { samplePortfolioData, sampleAccountTotal } from '../helpers/mockData.js';

async function testPortfolioDataStructure() {
  assert(samplePortfolioData.length > 0, 'Portfolio should have data');
  
  const position = samplePortfolioData[0];
  assert(position.Symbol, 'Position should have Symbol');
  assert(position.Description, 'Position should have Description');
  assert(position['Qty (Quantity)'], 'Position should have Quantity');
  assert(position['Mkt Val (Market Value)'], 'Position should have Market Value');
}

async function testPortfolioCalculations() {
  // Test that portfolio values are numeric
  for (const position of samplePortfolioData) {
    assert(typeof position['Mkt Val (Market Value)'] === 'number', 
      'Market Value should be a number');
    assert(typeof position['Gain $ (Gain/Loss $)'] === 'number', 
      'Gain should be a number');
  }
}

async function testAccountTotal() {
  assert(sampleAccountTotal, 'Account total should exist');
  assert(typeof sampleAccountTotal.totalValue === 'number', 'Total value should be a number');
  assert(typeof sampleAccountTotal.totalGain === 'number', 'Total gain should be a number');
  assert(typeof sampleAccountTotal.gainPercent === 'number', 'Gain percent should be a number');
}

async function testPositionFiltering() {
  // Test that positions are properly filtered (no Account Total, Cash, etc.)
  const symbols = samplePortfolioData.map(p => p.Symbol);
  
  assert(!symbols.includes('Account Total'), 'Should not include Account Total');
  assert(!symbols.includes('Cash & Cash Investments'), 'Should not include Cash');
  assert(symbols.includes('AAPL'), 'Should include AAPL');
  assert(symbols.includes('MSFT'), 'Should include MSFT');
}

async function testDataTypes() {
  for (const position of samplePortfolioData) {
    // Check that numeric fields are numbers
    assert(typeof position['Qty (Quantity)'] === 'number', 'Quantity should be number');
    assert(typeof position.Price === 'number', 'Price should be number');
    assert(typeof position['Mkt Val (Market Value)'] === 'number', 'Market Value should be number');
    
    // Check that text fields are strings
    assert(typeof position.Symbol === 'string', 'Symbol should be string');
    assert(typeof position.Description === 'string', 'Description should be string');
  }
}

async function testPortfolioStats() {
  // Calculate total value from positions
  const calculatedTotal = samplePortfolioData.reduce((sum, pos) => {
    return sum + (pos['Mkt Val (Market Value)'] || 0);
  }, 0);
  
  // Note: This might not match accountTotal exactly due to rounding
  // but should be close
  assert(calculatedTotal > 0, 'Calculated total should be positive');
  console.log(`  Calculated total: $${calculatedTotal.toFixed(2)}`);
  console.log(`  Account total: $${sampleAccountTotal.totalValue.toFixed(2)}`);
}

async function testGainLossCalculations() {
  for (const position of samplePortfolioData) {
    const gain = position['Gain $ (Gain/Loss $)'];
    const gainPercent = position['Gain % (Gain/Loss %)'];
    
    // Gain values should be numbers (can be negative)
    assert(typeof gain === 'number', 'Gain $ should be a number');
    assert(typeof gainPercent === 'number', 'Gain % should be a number');
    
    // If we have both gain and market value, we can verify the percentage
    if (gain !== 0 && position['Mkt Val (Market Value)']) {
      const expectedPercent = (gain / (position['Mkt Val (Market Value)'] - gain)) * 100;
      // Allow for rounding differences
      assert(Math.abs(gainPercent - expectedPercent) < 1, 
        'Gain percentage should be approximately correct');
    }
  }
}

const tests = [
  { name: 'Portfolio Data Structure', fn: testPortfolioDataStructure },
  { name: 'Portfolio Calculations', fn: testPortfolioCalculations },
  { name: 'Account Total', fn: testAccountTotal },
  { name: 'Position Filtering', fn: testPositionFiltering },
  { name: 'Data Types', fn: testDataTypes },
  { name: 'Portfolio Stats', fn: testPortfolioStats },
  { name: 'Gain/Loss Calculations', fn: testGainLossCalculations }
];

async function main() {
  console.log('Running portfolio display tests...\n');
  
  const summary = await runTests(tests);
  console.log(formatTestResults(summary));
  
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});

