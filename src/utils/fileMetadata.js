// utils/fileMetadata.js
// Handles extraction of metadata from filenames and file content

import { debugLog } from './debugConfig';

/**
 * Normalizes an account name by standardizing format while preserving account numbers
 * @param {string} accountName - The account name to normalize
 * @returns {string} The normalized account name
 */
export const normalizeAccountName = (accountName) => {
  if (!accountName) return '';
  
  return accountName
    // Replace underscores and hyphens with spaces
    .replace(/[_-]/g, ' ')
    // Standardize account number format (convert ...348 or XXX348 to 348)
    .replace(/\.{3}(\d+)/g, '$1')
    .replace(/XXX(\d+)/g, '$1')
    // Remove special characters but keep spaces, numbers, and common account-related characters
    .replace(/[^a-zA-Z0-9\s&()\-\.]/g, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Ensure consistent spacing around numbers
    .replace(/(\d+)/g, ' $1 ')
    .trim()
    // Remove extra spaces again after number formatting
    .replace(/\s+/g, ' ')
    // Ensure consistent casing
    .split(' ')
    .map(word => {
      // Keep common acronyms uppercase
      if (['IRA', 'Roth', '401k', '403b', 'HSA'].includes(word.toUpperCase())) {
        return word.toUpperCase();
      }
      // Capitalize first letter of each word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * Extracts account name from filename
 * @param {string} filename - The filename to parse
 * @returns {string} The extracted account name
 */
export const getAccountNameFromFilename = (filename) => {
  debugLog('pipeline', 'metadata', 'Extracting account name from filename', { filename });
  
  if (!filename) {
    debugLog('pipeline', 'warn', 'No filename provided');
    return `Account ${new Date().toISOString().split('T')[0]}`;
  }
  
  // Remove file extension first
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  
  // Pattern 1: Files with hyphens: AccountType-AccountName-Positions-Date.csv
  const hyphenMatch = nameWithoutExt.match(/^([^-]+(?:-[^-]+)*)-(?:Positions|Transactions)/);
  if (hyphenMatch) {
    const accountName = normalizeAccountName(hyphenMatch[1]);
    debugLog('pipeline', 'metadata', 'Matched hyphen pattern', { accountName });
    return accountName;
  }

  // Pattern 2: Files with underscores: AccountType_AccountName_Positions_Date.csv
  const underscoreMatch = nameWithoutExt.match(/^([^_]+(?:_[^_]+)*?)_(?:Positions|Transactions)/);
  if (underscoreMatch) {
    const accountName = normalizeAccountName(underscoreMatch[1]);
    debugLog('pipeline', 'metadata', 'Matched underscore pattern', { accountName });
    return accountName;
  }

  // Pattern 3: Files with date embedded: AccountName20240327123456.csv
  const dateMatch = nameWithoutExt.match(/^(.+?)(?:\d{14}|\d{8})/);
  if (dateMatch) {
    const accountName = normalizeAccountName(dateMatch[1]);
    debugLog('pipeline', 'metadata', 'Matched date pattern', { accountName });
    return accountName;
  }

  // Pattern 4: Simple filename without special formatting
  const simpleMatch = nameWithoutExt.match(/^([^_\-]+)/);
  if (simpleMatch) {
    const accountName = normalizeAccountName(simpleMatch[1]);
    debugLog('pipeline', 'metadata', 'Matched simple pattern', { accountName });
    return accountName;
  }

  // If no patterns match, use a default with timestamp
  const defaultName = `Account ${new Date().toISOString().split('T')[0]}`;
  debugLog('pipeline', 'warn', 'No account name pattern matched', { defaultName });
  return defaultName;
};

/**
 * Parse date from filename
 * @param {string} filename - The filename to parse
 * @returns {Date|null} The parsed date or null if not found
 */
export const parseDateFromFilename = (filename) => {
  debugLog('pipeline', 'metadata', 'Parsing date from filename', { filename });
  
  if (!filename) {
    debugLog('pipeline', 'warn', 'No filename provided');
    return null;
  }

  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  
  // Pattern 1: YYYYMMDD format (e.g., AccountName20240327.csv)
  const dateMatch = nameWithoutExt.match(/(\d{8})/);
  if (dateMatch) {
    const dateStr = dateMatch[1];
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // JS months are 0-based
    const day = parseInt(dateStr.substring(6, 8));
    
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      debugLog('pipeline', 'metadata', 'Matched YYYYMMDD pattern', { date: date.toISOString() });
      return date;
    }
  }

  // Pattern 2: YYYYMMDDHHMMSS format (e.g., AccountName20240327123456.csv)
  const timestampMatch = nameWithoutExt.match(/(\d{14})/);
  if (timestampMatch) {
    const timestampStr = timestampMatch[1];
    const year = parseInt(timestampStr.substring(0, 4));
    const month = parseInt(timestampStr.substring(4, 6)) - 1;
    const day = parseInt(timestampStr.substring(6, 8));
    const hour = parseInt(timestampStr.substring(8, 10));
    const minute = parseInt(timestampStr.substring(10, 12));
    const second = parseInt(timestampStr.substring(12, 14));
    
    const date = new Date(year, month, day, hour, minute, second);
    if (!isNaN(date.getTime())) {
      debugLog('pipeline', 'metadata', 'Matched YYYYMMDDHHMMSS pattern', { date: date.toISOString() });
      return date;
    }
  }

  // Pattern 3: Date in filename with separators (e.g., AccountName-2024-03-27.csv)
  const separatorMatch = nameWithoutExt.match(/(\d{4})[-_](\d{2})[-_](\d{2})/);
  if (separatorMatch) {
    const year = parseInt(separatorMatch[1]);
    const month = parseInt(separatorMatch[2]) - 1;
    const day = parseInt(separatorMatch[3]);
    
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      debugLog('pipeline', 'metadata', 'Matched separated date pattern', { date: date.toISOString() });
      return date;
    }
  }

  debugLog('pipeline', 'warn', 'No date pattern matched in filename');
  return null;
};

/**
 * Find similar account names in a list of accounts
 * @param {string} accountName - The account name to compare against
 * @param {Array<string>} existingAccounts - List of existing account names
 * @param {number} threshold - Similarity threshold (0-1)
 * @returns {Array<string>} List of similar account names
 */
export const findSimilarAccountNames = (accountName, existingAccounts, threshold = 0.8) => {
  debugLog('pipeline', 'metadata', 'Finding similar account names', { 
    accountName, 
    existingAccountsCount: existingAccounts.length,
    threshold 
  });

  if (!accountName || !existingAccounts || !existingAccounts.length) {
    return [];
  }

  const normalizedInput = normalizeAccountName(accountName);
  
  return existingAccounts
    .map(existing => ({
      name: existing,
      similarity: calculateSimilarity(normalizedInput, normalizeAccountName(existing))
    }))
    .filter(result => result.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .map(result => result.name);
};

/**
 * Calculate similarity between two strings using Levenshtein distance
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score between 0 and 1
 */
const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Create matrix
  const matrix = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));
  
  // Initialize matrix
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  // Calculate similarity score
  const maxLen = Math.max(len1, len2);
  const distance = matrix[len1][len2];
  return 1 - (distance / maxLen);
}; 