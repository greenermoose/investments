import { FILE_TYPES } from './constants';
import { debugLog } from '../../utils/debugConfig';

const DEBUG = true;

/**
 * Handles the initial file upload stage
 */
export class FileUploader {
  constructor() {
    this.fileTypes = FILE_TYPES;
  }

  /**
   * Read file content as text
   * @param {File} file - File to read
   * @returns {Promise<string>} File content
   */
  async readFileAsText(file) {
    DEBUG && debugLog('fileUploader', 'read', 'Reading file content', { filename: file.name });
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        DEBUG && debugLog('fileUploader', 'read', 'File content read successfully', {
          filename: file.name,
          contentLength: event.target.result.length
        });
        resolve(event.target.result);
      };
      reader.onerror = (error) => {
        DEBUG && debugLog('fileUploader', 'error', 'Failed to read file', {
          filename: file.name,
          error: error.message
        });
        reject(error);
      };
      reader.readAsText(file);
    });
  }

  /**
   * Validate file based on type and content
   * @param {File} file - File to validate
   * @param {string} expectedType - Expected file type ('CSV' or 'JSON')
   * @returns {Object} Validation result
   */
  async validateFile(file, expectedType) {
    DEBUG && debugLog('fileUploader', 'validate', 'Validating file', {
      filename: file.name,
      expectedType
    });

    if (!file) {
      DEBUG && debugLog('fileUploader', 'error', 'No file provided');
      return {
        success: false,
        error: 'No file provided'
      };
    }

    const isCSV = file.name.toLowerCase().endsWith('.csv');
    const isJSON = file.name.toLowerCase().endsWith('.json');
    
    if (expectedType === 'CSV' && !isCSV) {
      DEBUG && debugLog('fileUploader', 'error', 'Invalid file type', {
        expected: 'CSV',
        actual: file.name.split('.').pop()
      });
      return {
        success: false,
        error: 'Please upload a CSV file'
      };
    }
    
    if (expectedType === 'JSON' && !isJSON) {
      DEBUG && debugLog('fileUploader', 'error', 'Invalid file type', {
        expected: 'JSON',
        actual: file.name.split('.').pop()
      });
      return {
        success: false,
        error: 'Please upload a JSON file'
      };
    }

    const maxSize = this.fileTypes[expectedType].maxSize;
    if (file.size > maxSize) {
      const sizeInMB = Math.round(maxSize / (1024 * 1024));
      DEBUG && debugLog('fileUploader', 'error', 'File too large', {
        size: file.size,
        maxSize,
        sizeInMB
      });
      return {
        success: false,
        error: `File size too large. Please upload a file smaller than ${sizeInMB}MB`
      };
    }
    
    DEBUG && debugLog('fileUploader', 'validate', 'File validation successful', {
      filename: file.name,
      type: isCSV ? 'CSV' : 'JSON',
      size: file.size
    });
    
    return {
      success: true,
      fileType: isCSV ? 'CSV' : 'JSON'
    };
  }

  /**
   * Process a file upload
   * @param {File} file - File to process
   * @param {string} expectedType - Expected file type ('CSV' or 'JSON')
   * @returns {Promise<Object>} Upload result
   */
  async processUpload(file, expectedType) {
    DEBUG && debugLog('fileUploader', 'upload', 'Starting file upload process', {
      filename: file.name,
      expectedType
    });

    try {
      // Validate file
      const validation = await this.validateFile(file, expectedType);
      if (!validation.success) {
        DEBUG && debugLog('fileUploader', 'error', 'File validation failed', {
          error: validation.error
        });
        throw new Error(validation.error);
      }

      // Read file content
      DEBUG && debugLog('fileUploader', 'read', 'Reading file content');
      const content = await this.readFileAsText(file);

      DEBUG && debugLog('fileUploader', 'upload', 'File upload completed successfully', {
        filename: file.name,
        fileType: validation.fileType,
        contentLength: content.length
      });

      return {
        success: true,
        fileName: file.name,
        fileType: validation.fileType,
        content
      };
    } catch (error) {
      DEBUG && debugLog('fileUploader', 'error', 'File upload failed', {
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        error: error.message
      };
    }
  }
} 