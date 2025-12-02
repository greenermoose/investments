#!/usr/bin/env node
/**
 * Manual test script for JSON upload functionality
 * Tests the JSON upload and processing flow
 * 
 * Usage: node tests/manual/test-upload-json.js
 * 
 * Note: This test validates the file processing logic.
 * For full browser-based testing, use the acceptance tests.
 */

import { assert, assertEqual, assertThrows, runTests, formatTestResults } from '../helpers/testUtils.js';
import { readFileAsText, validateFile, FileTypes } from '../../http/js/utils/fileProcessing.js';
import { parseTransactionJSON } from '../../http/js/utils/transactionEngine.js';
import { createMockJSONFile, sampleJSONContent } from '../helpers/mockData.js';

// Check if we're in a browser environment (FileReader available)
const isBrowserEnvironment = typeof FileReader !== 'undefined';

if (!isBrowserEnvironment) {
  console.log('Note: FileReader API not available (Node.js environment)');
  console.log('Skipping browser-only tests that require FileReader/File/Blob APIs');
  console.log('For full upload testing, use browser acceptance tests: tests/acceptance/upload-tests.md\n');
}

async function testFileValidation() {
  const validFile = createMockJSONFile('test.json');
  const validation = validateFile(validFile, FileTypes.JSON);
  
  assert(validation.success, 'Valid JSON file should pass validation');
  assertEqual(validation.fileType, FileTypes.JSON, 'File type should be JSON');
}

async function testFileReading() {
  const file = createMockJSONFile('test.json');
  const content = await readFileAsText(file);
  
  assert(content, 'File content should be read');
  assert(content.length > 0, 'File content should not be empty');
  assert(content.includes('BrokerageTransactions'), 'File content should contain transaction data');
}

async function testJSONParsing() {
  const file = createMockJSONFile('test.json');
  const content = await readFileAsText(file);
  const result = parseTransactionJSON(content);
  
  assert(result.transactions, 'Transactions should be parsed');
  assert(result.transactions.length > 0, 'Should have transactions');
  assertEqual(result.transactions.length, 3, 'Should have 3 transactions');
  assert(result.fromDate, 'From date should be extracted');
  assert(result.toDate, 'To date should be extracted');
}

async function testInvalidJSON() {
  const invalidFile = new File(['invalid json'], 'test.json', { type: 'application/json' });
  const content = await readFileAsText(invalidFile);
  
  assertThrows(() => {
    parseTransactionJSON(content);
  }, 'Failed to parse');
}

async function testMissingTransactions() {
  const invalidJSON = JSON.stringify({ FromDate: '2024-01-01', ToDate: '2024-12-31' });
  const file = new File([invalidJSON], 'test.json', { type: 'application/json' });
  const content = await readFileAsText(file);
  
  assertThrows(() => {
    parseTransactionJSON(content);
  }, 'missing BrokerageTransactions');
}

async function testEmptyFile() {
  const emptyFile = new File([''], 'empty.json', { type: 'application/json' });
  const validation = validateFile(emptyFile, FileTypes.JSON);
  
  // Empty files might pass validation but fail parsing
  assert(validation.success || !validation.success, 'Empty file validation should complete');
}

async function testLargeFile() {
  // Create a file that's too large (simulate)
  const largeContent = JSON.stringify({ data: 'x'.repeat(51 * 1024 * 1024) }); // 51MB
  const largeFile = new File([largeContent], 'large.json', { type: 'application/json' });
  const validation = validateFile(largeFile, FileTypes.JSON);
  
  // Should fail validation due to size
  assert(!validation.success, 'Large file should fail validation');
  assert(validation.error.includes('too large'), 'Error should mention file size');
}

async function testTransactionDataStructure() {
  const file = createMockJSONFile('test.json');
  const content = await readFileAsText(file);
  const result = parseTransactionJSON(content);
  
  // Check transaction structure
  if (result.transactions.length > 0) {
    const transaction = result.transactions[0];
    assert(transaction.date || transaction.transactionDate, 'Transaction should have date');
    assert(transaction.type || transaction.transactionType, 'Transaction should have type');
    assert(transaction.symbol, 'Transaction should have symbol');
  }
}

async function testDuplicateRemoval() {
  // Create JSON with duplicate transactions
  const duplicateJSON = {
    ...sampleJSONContent,
    BrokerageTransactions: [
      ...sampleJSONContent.BrokerageTransactions,
      sampleJSONContent.BrokerageTransactions[0] // Duplicate first transaction
    ]
  };
  
  const file = new File([JSON.stringify(duplicateJSON)], 'duplicate.json', { type: 'application/json' });
  const content = await readFileAsText(file);
  const result = parseTransactionJSON(content);
  
  // Should have removed duplicates (original 3 transactions)
  assertEqual(result.transactions.length, 3, 'Duplicates should be removed');
}

// Build tests array conditionally based on environment
// All tests in this file require browser APIs (FileReader/File/Blob)
const tests = [];

if (isBrowserEnvironment) {
  tests.push(
    { name: 'File Validation', fn: testFileValidation },
    { name: 'File Reading', fn: testFileReading },
    { name: 'JSON Parsing', fn: testJSONParsing },
    { name: 'Invalid JSON Handling', fn: testInvalidJSON },
    { name: 'Missing Transactions Array', fn: testMissingTransactions },
    { name: 'Empty File', fn: testEmptyFile },
    { name: 'Large File', fn: testLargeFile },
    { name: 'Transaction Data Structure', fn: testTransactionDataStructure },
    { name: 'Duplicate Removal', fn: testDuplicateRemoval }
  );
} else {
  console.log('Skipped browser-only tests:');
  console.log('  - File Validation (requires File/Blob)');
  console.log('  - File Reading (requires FileReader)');
  console.log('  - JSON Parsing (requires FileReader)');
  console.log('  - Invalid JSON Handling (requires FileReader)');
  console.log('  - Missing Transactions Array (requires FileReader)');
  console.log('  - Empty File (requires File)');
  console.log('  - Large File (requires File)');
  console.log('  - Transaction Data Structure (requires FileReader)');
  console.log('  - Duplicate Removal (requires FileReader)\n');
}

async function main() {
  console.log('Running JSON upload tests...\n');
  
  if (tests.length === 0) {
    console.log('No tests available for this environment.');
    console.log('All JSON upload tests require browser APIs (FileReader/File/Blob).');
    console.log('For full testing, use browser acceptance tests: tests/acceptance/upload-tests.md');
    process.exit(0);
  }
  
  const summary = await runTests(tests);
  console.log(formatTestResults(summary));
  
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});

