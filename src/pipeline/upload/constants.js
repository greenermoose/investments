/**
 * File type definitions with validation rules
 */
export const FILE_TYPES = {
  CSV: {
    extension: '.csv',
    mimeTypes: ['text/csv', 'application/vnd.ms-excel'],
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'Portfolio CSV file',
    expectedContent: ['Symbol', 'Quantity', 'Market Value']
  },
  JSON: {
    extension: '.json',
    mimeTypes: ['application/json'],
    maxSize: 50 * 1024 * 1024, // 50MB
    description: 'Transaction JSON file',
    expectedContent: ['BrokerageTransactions']
  }
}; 