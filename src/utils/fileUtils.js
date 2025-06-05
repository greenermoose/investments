// utils/fileUtils.js
// Utility functions for file operations

import { debugLog } from './debugConfig';

/**
 * Read file content as text
 * @param {File} file - File to read
 * @returns {Promise<string>} File content
 */
export const readFileAsText = (file) => {
  debugLog('fileUtils', 'read', 'Reading file as text', {
    filename: file.name,
    size: file.size,
    type: file.type
  });

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      debugLog('fileUtils', 'read', 'File read complete', {
        filename: file.name,
        contentLength: event.target.result.length,
        firstFewLines: event.target.result.split('\n').slice(0, 3).join('\n')
      });
      resolve(event.target.result);
    };
    
    reader.onerror = (error) => {
      debugLog('fileUtils', 'error', 'Error reading file', {
        filename: file.name,
        error: error.message
      });
      reject(new Error(`Failed to read file: ${error.message}`));
    };
    
    reader.readAsText(file);
  });
}; 