# Testing Documentation

This directory contains the testing framework for the Investment Portfolio Manager application.

## Overview

The testing framework consists of:

1. **Unit Tests** - Vitest-based unit tests for utilities, services, repositories, and composables
2. **Manual Test Scripts** - Node.js scripts that test code logic and utilities
3. **Acceptance Tests** - Manual checklists for browser-based testing
4. **Test Helpers** - Utility functions, mock data, and mocks for testing

## Directory Structure

```
tests/
├── unit/                  # Unit tests (Vitest)
│   ├── utils/            # Utility function tests
│   ├── services/          # Service layer tests
│   ├── repositories/      # Repository tests
│   └── composables/       # Composable/store tests
├── helpers/
│   ├── testUtils.js       # Test assertion utilities
│   ├── mockData.js        # Sample data for testing
│   ├── dbHelpers.js        # Database testing helpers
│   └── mocks/             # Mock implementations
│       ├── indexedDB.js   # IndexedDB mocks
│       ├── api.js          # API mocks
│       ├── browser.js      # Browser API mocks
│       └── index.js        # Mock exports
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
├── setup.js               # Vitest setup file
├── run-all.js             # Manual test runner script
└── README.md              # This file
```

## Running Tests

### Run All Unit Tests

```bash
npm test
```

Or with watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

### Run All Manual Tests

```bash
npm run test:manual
```

Or directly:

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

### Unit Tests

Unit tests use Vitest and test individual functions, classes, and modules in isolation:

- **Utilities**: File processing, data formatting, calculations
- **Services**: Business logic with mocked dependencies
- **Repositories**: Data access with IndexedDB mocks
- **Composables**: Reactive state management

**Features:**
- Fast execution
- Isolated testing with mocks
- Coverage reporting
- Watch mode for development

**Use Cases:**
- Testing pure functions
- Validating business logic
- Regression testing
- Continuous integration

**Example:**
```javascript
import { describe, it, expect } from 'vitest';
import { formatCurrency } from '@utils/dataUtils.js';

describe('formatCurrency', () => {
  it('should format positive numbers', () => {
    expect(formatCurrency(100.50)).toBe('$100.50');
  });
});
```

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

### mocks/

Provides mock implementations for testing:

**indexedDB.js:**
- `setupIndexedDBMock()` - Setup IndexedDB mocks
- `clearMockDatabase()` - Clear mock database
- `addTestData(storeName, data)` - Add test data to store
- `getTestData(storeName)` - Get test data from store

**api.js:**
- `setupAPIMocks()` - Setup API mocks
- `mockMarketData` - Mock market data responses
- `createMockMarketDataResponse()` - Create mock API response

**browser.js:**
- `setupBrowserMocks()` - Setup browser API mocks
- `clearBrowserMocks()` - Clear browser mocks

## Writing New Tests

### Adding a Unit Test

1. Create a test file in the appropriate directory:
   - `tests/unit/utils/` for utility tests
   - `tests/unit/services/` for service tests
   - `tests/unit/repositories/` for repository tests
   - `tests/unit/composables/` for composable tests

2. Use Vitest's `describe` and `it` blocks:
   ```javascript
   import { describe, it, expect, beforeEach, vi } from 'vitest';
   import { functionToTest } from '@utils/module.js';

   describe('module', () => {
     it('should do something', () => {
       expect(functionToTest()).toBe(expected);
     });
   });
   ```

3. Use mocks for dependencies:
   ```javascript
   vi.mock('@repositories/SomeRepository.js', () => ({
     SomeRepository: vi.fn().mockImplementation(() => ({
       method: vi.fn()
     }))
   }));
   ```

4. Run tests:
   ```bash
   npm test
   ```

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

**Unit Tests:**
- ✅ File processing utilities (CSV parsing, date extraction, account name)
- ✅ Data utilities (formatting, normalization, symbol matching)
- ✅ Lot utilities (tracking methods, calculations, validation)
- ✅ Portfolio performance metrics (statistics, asset allocation)
- ✅ Transaction engine (parsing, categorization)
- ✅ Services (PortfolioService, DataSourceManager)
- ✅ Repositories (BaseRepository, PortfolioRepository)
- ✅ Composables (portfolioStore, acquisitionStore)

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

- Component testing (Vue component unit tests)
- Integration testing (full upload → display flow)
- Performance testing (large files, many positions)
- Error recovery testing
- Additional edge cases in utilities

## Continuous Integration

The project includes test scripts in `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:manual": "node tests/run-all.js"
  }
}
```

### CI/CD Integration

1. **Unit Tests**: Run automatically in CI
   ```bash
   npm test
   ```

2. **Coverage**: Generate and upload coverage reports
   ```bash
   npm run test:coverage
   ```

3. **Manual Tests**: Run for additional validation
   ```bash
   npm run test:manual
   ```

4. **Acceptance Tests**: Use browser automation tools:
   - Playwright
   - Puppeteer
   - Selenium

## Troubleshooting

### Unit Tests Fail with Import Errors

- Ensure Vitest is installed: `npm install`
- Check that path aliases in `vitest.config.js` are correct
- Verify imports use `.js` extensions
- Check that mocks are properly set up in `tests/setup.js`

### Manual Tests Fail with Import Errors

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

