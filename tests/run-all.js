#!/usr/bin/env node
/**
 * Test runner script
 * Runs all manual test scripts and generates a summary report
 * 
 * Usage: node tests/run-all.js
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testDir = join(__dirname, 'manual');
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Run a single test file
 */
function runTest(testFile) {
  return new Promise((resolve, reject) => {
    const testPath = join(testDir, testFile);
    const testProcess = spawn('node', [testPath], {
      stdio: 'pipe',
      shell: true
    });

    let stdout = '';
    let stderr = '';

    testProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    testProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    testProcess.on('close', (code) => {
      resolve({
        file: testFile,
        passed: code === 0,
        exitCode: code,
        stdout,
        stderr
      });
    });

    testProcess.on('error', (error) => {
      reject({ file: testFile, error });
    });
  });
}

/**
 * Get all test files
 */
async function getTestFiles() {
  try {
    const files = await readdir(testDir);
    return files
      .filter(file => file.startsWith('test-') && file.endsWith('.js'))
      .sort();
  } catch (error) {
    console.error('Error reading test directory:', error);
    return [];
  }
}

/**
 * Print test results
 */
function printResults(results) {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.cyan}Test Results Summary${colors.reset}`);
  console.log('='.repeat(60) + '\n');

  let total = 0;
  let passed = 0;
  let failed = 0;

  results.forEach(result => {
    total++;
    if (result.passed) {
      passed++;
      console.log(`${colors.green}✓${colors.reset} ${result.file}`);
    } else {
      failed++;
      console.log(`${colors.red}✗${colors.reset} ${result.file}`);
      if (result.stderr) {
        console.log(`  ${colors.red}Error:${colors.reset} ${result.stderr.trim()}`);
      }
    }
  });

  console.log('\n' + '-'.repeat(60));
  console.log(`Total: ${total}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  if (failed > 0) {
    console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  } else {
    console.log(`${colors.green}Failed: ${failed}${colors.reset}`);
  }
  console.log('-'.repeat(60) + '\n');

  return { total, passed, failed };
}

/**
 * Main function
 */
async function main() {
  console.log(`${colors.blue}Running all manual tests...${colors.reset}\n`);

  const testFiles = await getTestFiles();

  if (testFiles.length === 0) {
    console.log(`${colors.yellow}No test files found in ${testDir}${colors.reset}`);
    process.exit(0);
  }

  console.log(`Found ${testFiles.length} test file(s):\n`);
  testFiles.forEach(file => console.log(`  - ${file}`));
  console.log('');

  const results = [];
  for (const testFile of testFiles) {
    try {
      console.log(`${colors.cyan}Running ${testFile}...${colors.reset}`);
      const result = await runTest(testFile);
      results.push(result);
      
      // Print test output
      if (result.stdout) {
        console.log(result.stdout);
      }
    } catch (error) {
      results.push({
        file: testFile,
        passed: false,
        error: error.message || 'Unknown error'
      });
      console.error(`${colors.red}Error running ${testFile}:${colors.reset}`, error);
    }
  }

  const summary = printResults(results);

  // Print acceptance test reminder
  console.log(`${colors.yellow}Note:${colors.reset} Manual test scripts validate code logic only.`);
  console.log(`For full browser-based testing, run the acceptance tests:`);
  console.log(`  - tests/acceptance/upload-tests.md`);
  console.log(`  - tests/acceptance/portfolio-tests.md`);
  console.log(`  - tests/acceptance/navigation-tests.md`);
  console.log(`  - tests/acceptance/data-persistence-tests.md\n`);

  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});

