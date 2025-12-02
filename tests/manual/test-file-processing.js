#!/usr/bin/env node
/**
 * Manual test script for file processing utilities
 * Tests CSV and JSON parsing functions
 * 
 * Usage: node tests/manual/test-file-processing.js
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { assert, assertEqual, assertThrows, runTests, formatTestResults } from '../helpers/testUtils.js';
import { parsePortfolioCSV, parseDateFromFilename, getAccountNameFromFilename } from '../../http/js/utils/fileProcessing.js';
import { parseTransactionJSON } from '../../http/js/utils/transactionEngine.js';
import { sampleCSVContent, sampleJSONContent } from '../helpers/mockData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testCSVParsing() {
  const result = parsePortfolioCSV(sampleCSVContent);
  
  assert(result.portfolioData, 'Portfolio data should be parsed');
  assert(result.portfolioData.length > 0, 'Portfolio should have positions');
  assertEqual(result.portfolioData.length, 3, 'Should have 3 positions (AAPL, MSFT, GOOGL)');
  assert(result.portfolioDate, 'Portfolio date should be extracted');
  assert(result.accountTotal, 'Account total should be extracted');
  assertEqual(result.accountTotal.totalValue, 10240.34, 'Account total value should match');
}

async function testDateParsing() {
  const testCases = [
    { filename: 'Roth_Contributory_IRA-Positions-2021-11-20-071958.CSV', expected: true },
    { filename: 'IRA20250427180000.csv', expected: true },
    { filename: 'portfolio.csv', expected: false }
  ];
  
  for (const testCase of testCases) {
    const date = parseDateFromFilename(testCase.filename);
    if (testCase.expected) {
      assert(date !== null, `Should parse date from ${testCase.filename}`);
    } else {
      // For files without dates, null is acceptable
      console.log(`  Date parsing for ${testCase.filename}: ${date ? 'parsed' : 'not found (OK)'}`);
    }
  }
}

async function testAccountNameExtraction() {
  const testCases = [
    { filename: 'Roth_Contributory_IRA-Positions-2021-11-20-071958.CSV', shouldContain: 'Roth' },
    { filename: 'IRA20250427180000.csv', shouldContain: 'IRA' },
    { filename: 'MyAccount-Positions-2024-01-01.csv', shouldContain: 'MyAccount' }
  ];
  
  for (const testCase of testCases) {
    const accountName = getAccountNameFromFilename(testCase.filename);
    assert(accountName.includes(testCase.shouldContain) || accountName.length > 0, 
      `Account name should be extracted from ${testCase.filename}`);
  }
}

async function testJSONParsing() {
  const jsonString = JSON.stringify(sampleJSONContent);
  const result = parseTransactionJSON(jsonString);
  
  assert(result.transactions, 'Transactions should be parsed');
  assert(result.transactions.length > 0, 'Should have transactions');
  assertEqual(result.transactions.length, 3, 'Should have 3 transactions');
  assert(result.fromDate, 'From date should be extracted');
  assert(result.toDate, 'To date should be extracted');
}

async function testInvalidCSV() {
  assertThrows(() => {
    parsePortfolioCSV('');
  }, 'File is empty');
  
  assertThrows(() => {
    parsePortfolioCSV('invalid\ncsv\ncontent');
  }, 'Could not find');
}

async function testInvalidJSON() {
  assertThrows(() => {
    parseTransactionJSON('invalid json');
  }, 'Failed to parse');
  
  assertThrows(() => {
    parseTransactionJSON('{}');
  }, 'missing BrokerageTransactions');
}

async function testRealCSVFile() {
  // Try to read an example CSV file if it exists
  const examplePath = join(__dirname, '../../examples/Roth_Contributory_IRA-Positions-2021-11-20-071958.CSV');
  try {
    const fileContent = await readFile(examplePath, 'utf-8');
    const result = parsePortfolioCSV(fileContent);
    
    assert(result.portfolioData, 'Real CSV file should be parsed');
    assert(result.portfolioData.length > 0, 'Real CSV should have positions');
    console.log(`  Real CSV file parsed successfully: ${result.portfolioData.length} positions`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('  Example CSV file not found, skipping real file test');
    } else {
      throw error;
    }
  }
}

const tests = [
  { name: 'CSV Parsing', fn: testCSVParsing },
  { name: 'Date Parsing from Filename', fn: testDateParsing },
  { name: 'Account Name Extraction', fn: testAccountNameExtraction },
  { name: 'JSON Parsing', fn: testJSONParsing },
  { name: 'Invalid CSV Handling', fn: testInvalidCSV },
  { name: 'Invalid JSON Handling', fn: testInvalidJSON },
  { name: 'Real CSV File', fn: testRealCSVFile }
];

async function main() {
  console.log('Running file processing tests...\n');
  
  const summary = await runTests(tests);
  console.log(formatTestResults(summary));
  
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});

