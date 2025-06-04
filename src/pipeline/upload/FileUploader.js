import { FILE_TYPES } from './constants';

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
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
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
    if (!file) {
      return {
        success: false,
        error: 'No file provided'
      };
    }

    const isCSV = file.name.toLowerCase().endsWith('.csv');
    const isJSON = file.name.toLowerCase().endsWith('.json');
    
    if (expectedType === 'CSV' && !isCSV) {
      return {
        success: false,
        error: 'Please upload a CSV file'
      };
    }
    
    if (expectedType === 'JSON' && !isJSON) {
      return {
        success: false,
        error: 'Please upload a JSON file'
      };
    }

    const maxSize = this.fileTypes[expectedType].maxSize;
    if (file.size > maxSize) {
      const sizeInMB = Math.round(maxSize / (1024 * 1024));
      return {
        success: false,
        error: `File size too large. Please upload a file smaller than ${sizeInMB}MB`
      };
    }
    
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
    try {
      // Validate file
      const validation = await this.validateFile(file, expectedType);
      if (!validation.success) {
        throw new Error(validation.error);
      }

      // Read file content
      const content = await this.readFileAsText(file);

      return {
        success: true,
        fileName: file.name,
        fileType: validation.fileType,
        content
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
} 