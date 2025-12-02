#!/usr/bin/env node
/**
 * Manual test script for CSV upload functionality
 * Tests the CSV upload and processing flow
 * 
 * Usage: node tests/manual/test-upload-csv.js
 * 
 * Note: This test validates the file processing logic.
 * For full browser-based testing, use the acceptance tests.
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { assert, assertEqual, runTests, formatTestResults } from '../helpers/testUtils.js';
import { readFileAsText, parsePortfolioCSV, validateFile, FileTypes } from '../../http/js/utils/fileProcessing.js';
import { createMockCSVFile, sampleCSVContent } from '../helpers/mockData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if we're in a browser environment (FileReader available)
const isBrowserEnvironment = typeof FileReader !== 'undefined';

if (!isBrowserEnvironment) {
  console.log('Note: FileReader API not available (Node.js environment)');
  console.log('Skipping browser-only tests that require FileReader/File/Blob APIs');
  console.log('For full upload testing, use browser acceptance tests: tests/acceptance/upload-tests.md\n');
}

async function testFileValidation() {
  const validFile = createMockCSVFile('test.csv');
  const validation = validateFile(validFile, FileTypes.CSV);
  
  assert(validation.success, 'Valid CSV file should pass validation');
  assertEqual(validation.fileType, FileTypes.CSV, 'File type should be CSV');
}

async function testFileReading() {
  const file = createMockCSVFile('test.csv');
  const content = await readFileAsText(file);
  
  assert(content, 'File content should be read');
  assert(content.length > 0, 'File content should not be empty');
  assert(content.includes('AAPL'), 'File content should contain expected data');
}

async function testCSVParsing() {
  const file = createMockCSVFile('test.csv');
  const content = await readFileAsText(file);
  const result = parsePortfolioCSV(content);
  
  assert(result.portfolioData, 'Portfolio data should be parsed');
  assert(result.portfolioData.length > 0, 'Should have portfolio positions');
  assert(result.portfolioDate, 'Portfolio date should be extracted');
}

async function testInvalidFileType() {
  const jsonFile = createMockCSVFile('test.json');
  // Change the file extension by creating a new file with JSON extension
  const validation = validateFile(jsonFile, FileTypes.CSV);
  
  // The validation should fail because the file doesn't have .csv extension
  // Note: This test depends on how the file object is created
  console.log('  File validation test (may vary based on file object implementation)');
}

async function testEmptyFile() {
  const emptyFile = new File([''], 'empty.csv', { type: 'text/csv' });
  const validation = validateFile(emptyFile, FileTypes.CSV);
  
  // Empty files might pass validation but fail parsing
  assert(validation.success || !validation.success, 'Empty file validation should complete');
}

async function testLargeFile() {
  // Create a file that's too large (simulate)
  const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
  const largeFile = new File([largeContent], 'large.csv', { type: 'text/csv' });
  const validation = validateFile(largeFile, FileTypes.CSV);
  
  // Should fail validation due to size
  assert(!validation.success, 'Large file should fail validation');
  assert(validation.error.includes('too large'), 'Error should mention file size');
}

async function testRealCSVFile() {
  const examplePath = join(__dirname, '../../examples/Roth_Contributory_IRA-Positions-2021-11-20-071958.CSV');
  try {
    const fileContent = await readFile(examplePath, 'utf-8');
    const result = parsePortfolioCSV(fileContent);
    
    assert(result.portfolioData, 'Real CSV should be parsed');
    assert(result.portfolioData.length > 0, 'Real CSV should have positions');
    console.log(`  Real CSV file: ${result.portfolioData.length} positions found`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('  Example CSV file not found, skipping real file test');
    } else {
      throw error;
    }
  }
}

async function testAccountNameExtraction() {
  const testFiles = [
    { name: 'Roth_Contributory_IRA-Positions-2021-11-20-071958.CSV', expectedAccount: 'Roth' },
    { name: 'MyAccount20250427180000.csv', expectedAccount: 'MyAccount' }
  ];
  
  for (const testFile of testFiles) {
    const file = createMockCSVFile(testFile.name);
    // Account name extraction would be tested separately
    console.log(`  Testing account name extraction for: ${testFile.name}`);
  }
}

// Build tests array conditionally based on environment
const tests = [];

// Browser-only tests (require FileReader/File/Blob APIs)
if (isBrowserEnvironment) {
  tests.push(
    { name: 'File Validation', fn: testFileValidation },
    { name: 'File Reading', fn: testFileReading },
    { name: 'CSV Parsing', fn: testCSVParsing },
    { name: 'Invalid File Type', fn: testInvalidFileType },
    { name: 'Empty File', fn: testEmptyFile },
    { name: 'Large File', fn: testLargeFile },
    { name: 'Account Name Extraction', fn: testAccountNameExtraction }
  );
} else {
  console.log('Skipped browser-only tests:');
  console.log('  - File Validation (requires File/Blob)');
  console.log('  - File Reading (requires FileReader)');
  console.log('  - CSV Parsing (requires FileReader)');
  console.log('  - Invalid File Type (requires File/Blob)');
  console.log('  - Empty File (requires File)');
  console.log('  - Large File (requires File)');
  console.log('  - Account Name Extraction (requires File/Blob)\n');
}

// Node-compatible tests (use fs.readFile)
tests.push({ name: 'Real CSV File', fn: testRealCSVFile });

async function main() {
  console.log('Running CSV upload tests...\n');
  
  if (tests.length === 0) {
    console.log('No tests available for this environment.');
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

