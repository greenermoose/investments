# Testing Documentation

This directory contains the testing framework for the Investment Portfolio Manager application.

## Overview

The testing framework consists of:

1. **Manual Test Scripts** - Node.js scripts that test code logic and utilities
2. **Acceptance Tests** - Manual checklists for browser-based testing
3. **Test Helpers** - Utility functions and mock data for testing

## Directory Structure

```
tests/
├── helpers/
│   ├── testUtils.js      # Test assertion utilities
│   ├── mockData.js       # Sample data for testing
│   └── dbHelpers.js     # Database testing helpers
├── manual/
│   ├── test-file-processing.js
│   ├── test-upload-csv.js
│   ├── test-upload-json.js
│   ├── test-portfolio-display.js
│   └── test-database-operations.js
├── acceptance/
│   ├── upload-tests.md
│   ├── portfolio-tests.md
│   ├── navigation-tests.md
│   └── data-persistence-tests.md
├── run-all.js            # Test runner script
└── README.md             # This file
```

## Running Tests

### Run All Manual Tests

```bash
node tests/run-all.js
```

This will run all test scripts in the `manual/` directory and provide a summary.

### Run Individual Tests

```bash
# Test file processing utilities
node tests/manual/test-file-processing.js

# Test CSV upload functionality
node tests/manual/test-upload-csv.js

# Test JSON upload functionality
node tests/manual/test-upload-json.js

# Test portfolio display logic
node tests/manual/test-portfolio-display.js

# Test database operations
node tests/manual/test-database-operations.js
```

### Running Acceptance Tests

Acceptance tests are manual checklists that should be followed in a browser:

1. Start the application (e.g., `python3 -m http.server 8000` in the `http/` directory)
2. Open the application in a browser
3. Open the appropriate acceptance test file (`.md` files in `acceptance/`)
4. Follow the test steps and check off items as you complete them
5. Document any issues found

## Test Types

### Manual Test Scripts

These are Node.js scripts that test:
- File parsing logic (CSV and JSON)
- Data validation
- Utility functions
- Data structures

**Limitations:**
- Cannot test browser-specific features (IndexedDB, DOM manipulation)
- Cannot test Vue component interactions
- Cannot test UI behavior

**Use Cases:**
- Validating parsing logic
- Testing data transformations
- Verifying utility functions
- Quick regression testing

### Acceptance Tests

These are manual checklists for browser-based testing:
- Full user workflows
- UI interactions
- Data persistence
- Cross-browser compatibility

**Use Cases:**
- Pre-release testing
- Regression testing after changes
- User acceptance testing
- Browser compatibility testing

## Test Helpers

### testUtils.js

Provides assertion functions:
- `assert(condition, message)` - Basic assertion
- `assertEqual(actual, expected, message)` - Equality check
- `assertThrows(fn, expectedError)` - Exception testing
- `runTest(name, fn)` - Run a single test
- `runTests(tests)` - Run multiple tests

### mockData.js

Provides sample data:
- `sampleCSVContent` - Sample CSV file content
- `sampleJSONContent` - Sample JSON transaction data
- `samplePortfolioData` - Parsed portfolio data
- `createMockCSVFile()` - Create mock CSV file object
- `createMockJSONFile()` - Create mock JSON file object

### dbHelpers.js

Provides database testing utilities (browser-only):
- `clearDatabase()` - Clear all IndexedDB data
- `hasDatabaseData()` - Check if database has data
- `getAllAccounts()` - Get all accounts from database

## Writing New Tests

### Adding a Manual Test Script

1. Create a new file in `tests/manual/` with name `test-*.js`
2. Import test utilities:
   ```javascript
   import { assert, assertEqual, runTests, formatTestResults } from '../helpers/testUtils.js';
   ```
3. Write test functions:
   ```javascript
   async function testSomething() {
     // Test logic here
     assert(condition, 'Error message');
   }
   ```
4. Add tests to the tests array:
   ```javascript
   const tests = [
     { name: 'Test Name', fn: testSomething }
   ];
   ```
5. Run tests:
   ```javascript
   const summary = await runTests(tests);
   console.log(formatTestResults(summary));
   ```

### Adding an Acceptance Test

1. Create a new `.md` file in `tests/acceptance/`
2. Follow the format of existing acceptance tests:
   - Test name and overview
   - Prerequisites
   - Step-by-step instructions
   - Expected results (checkboxes)
   - Test results summary table
3. Include browser information section

## Test Coverage

### Current Coverage

**Manual Tests:**
- ✅ File processing (CSV parsing, JSON parsing)
- ✅ File validation
- ✅ Date extraction from filenames
- ✅ Account name extraction
- ✅ Portfolio data structure
- ✅ Transaction data structure

**Acceptance Tests:**
- ✅ File upload (CSV and JSON)
- ✅ Portfolio display
- ✅ Navigation
- ✅ Data persistence

### Areas Needing More Tests

- Component interaction testing (requires browser automation)
- Integration testing (full upload → display flow)
- Performance testing (large files, many positions)
- Error recovery testing
- Edge case testing

## Continuous Integration

To integrate tests into CI/CD:

1. Add test script to `package.json`:
   ```json
   {
     "scripts": {
       "test": "node tests/run-all.js"
     }
   }
   ```

2. Run tests in CI pipeline:
   ```bash
   npm test
   ```

3. For acceptance tests, consider using browser automation tools:
   - Playwright
   - Puppeteer
   - Selenium

## Troubleshooting

### Tests Fail with Import Errors

- Ensure you're using Node.js with ES module support (Node 14+)
- Check that file paths are correct
- Verify imports use `.js` extensions

### Browser Tests Don't Work

- Acceptance tests require a running web server
- Ensure the application is accessible at the test URL
- Check browser console for errors
- Verify IndexedDB is enabled in browser

### Database Tests Fail

- Database helpers require browser environment
- Use acceptance tests for database testing
- Check browser DevTools → Application → IndexedDB

## Best Practices

1. **Run tests before committing** - Catch issues early
2. **Update tests when adding features** - Keep tests in sync with code
3. **Document test failures** - Include browser and OS information
4. **Test edge cases** - Don't just test happy paths
5. **Keep tests independent** - Each test should be able to run alone
6. **Use descriptive test names** - Make it clear what each test does

## Contributing

When adding new features:

1. Write tests first (TDD approach) or alongside code
2. Ensure all tests pass
3. Update acceptance tests if UI changes
4. Document any new test utilities or patterns

## Questions?

For questions about testing:
- Check existing test files for examples
- Review the test helpers documentation
- Consult the main README.md for application setup

