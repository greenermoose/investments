// Test utility functions for manual testing scripts

/**
 * Assert that a condition is true, throw error if not
 * @param {boolean} condition - Condition to check
 * @param {string} message - Error message if condition is false
 */
export function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Assert that two values are equal
 * @param {*} actual - Actual value
 * @param {*} expected - Expected value
 * @param {string} message - Error message if values don't match
 */
export function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`Assertion failed: Expected ${expected}, got ${actual}. ${message}`);
  }
}

/**
 * Assert that two values are not equal
 * @param {*} actual - Actual value
 * @param {*} expected - Expected value
 * @param {string} message - Error message if values match
 */
export function assertNotEqual(actual, expected, message = '') {
  if (actual === expected) {
    throw new Error(`Assertion failed: Expected values to differ, but both are ${actual}. ${message}`);
  }
}

/**
 * Assert that a value is truthy
 * @param {*} value - Value to check
 * @param {string} message - Error message if value is falsy
 */
export function assertTruthy(value, message = '') {
  if (!value) {
    throw new Error(`Assertion failed: Expected truthy value, got ${value}. ${message}`);
  }
}

/**
 * Assert that a value is falsy
 * @param {*} value - Value to check
 * @param {string} message - Error message if value is truthy
 */
export function assertFalsy(value, message = '') {
  if (value) {
    throw new Error(`Assertion failed: Expected falsy value, got ${value}. ${message}`);
  }
}

/**
 * Assert that an array has a specific length
 * @param {Array} array - Array to check
 * @param {number} expectedLength - Expected length
 * @param {string} message - Error message if length doesn't match
 */
export function assertLength(array, expectedLength, message = '') {
  if (!Array.isArray(array)) {
    throw new Error(`Assertion failed: Expected array, got ${typeof array}. ${message}`);
  }
  if (array.length !== expectedLength) {
    throw new Error(`Assertion failed: Expected array length ${expectedLength}, got ${array.length}. ${message}`);
  }
}

/**
 * Assert that an array contains a specific item
 * @param {Array} array - Array to check
 * @param {*} item - Item to find
 * @param {string} message - Error message if item not found
 */
export function assertContains(array, item, message = '') {
  if (!Array.isArray(array)) {
    throw new Error(`Assertion failed: Expected array, got ${typeof array}. ${message}`);
  }
  if (!array.includes(item)) {
    throw new Error(`Assertion failed: Array does not contain ${item}. ${message}`);
  }
}

/**
 * Assert that a function throws an error
 * @param {Function} fn - Function to test
 * @param {string} expectedError - Expected error message (optional)
 * @param {string} message - Error message if function doesn't throw
 */
export function assertThrows(fn, expectedError = null, message = '') {
  try {
    fn();
    throw new Error(`Assertion failed: Expected function to throw an error. ${message}`);
  } catch (error) {
    if (expectedError && !error.message.includes(expectedError)) {
      throw new Error(`Assertion failed: Expected error to contain "${expectedError}", got "${error.message}". ${message}`);
    }
  }
}

/**
 * Run a test function and report results
 * @param {string} testName - Name of the test
 * @param {Function} testFn - Test function to run
 * @returns {Object} Test result with name, passed, and error
 */
export async function runTest(testName, testFn) {
  try {
    await testFn();
    return { name: testName, passed: true, error: null };
  } catch (error) {
    return { name: testName, passed: false, error: error.message };
  }
}

/**
 * Run multiple tests and report results
 * @param {Array<{name: string, fn: Function}>} tests - Array of test objects
 * @returns {Object} Test results summary
 */
export async function runTests(tests) {
  const results = [];
  for (const test of tests) {
    const result = await runTest(test.name, test.fn);
    results.push(result);
    if (result.passed) {
      console.log(`✓ ${test.name}`);
    } else {
      console.error(`✗ ${test.name}: ${result.error}`);
    }
  }
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  return {
    total: results.length,
    passed,
    failed,
    results
  };
}

/**
 * Format test results for display
 * @param {Object} summary - Test results summary
 * @returns {string} Formatted test results
 */
export function formatTestResults(summary) {
  let output = '\n=== Test Results ===\n';
  output += `Total: ${summary.total}\n`;
  output += `Passed: ${summary.passed}\n`;
  output += `Failed: ${summary.failed}\n\n`;
  
  if (summary.failed > 0) {
    output += 'Failed Tests:\n';
    summary.results
      .filter(r => !r.passed)
      .forEach(r => {
        output += `  - ${r.name}: ${r.error}\n`;
      });
  }
  
  return output;
}

