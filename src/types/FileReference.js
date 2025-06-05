/**
 * @typedef {Object} FileReference
 * @property {string} fileId - Unique identifier for the file
 * @property {string} fileHash - Hash of the file contents
 * @property {string|null} fileName - Original name of the file
 * @property {string} uploadDate - ISO string of when the file was uploaded
 */

/**
 * Creates a new FileReference object
 * @param {Object} params - Parameters for the file reference
 * @param {string} params.fileId - File ID
 * @param {string} params.fileHash - File hash
 * @param {string} [params.fileName] - Optional file name
 * @param {string} [params.uploadDate] - Optional upload date
 * @returns {FileReference} A new FileReference object
 */
export const createFileReference = ({ fileId, fileHash, fileName = null, uploadDate = new Date().toISOString() }) => {
  if (!fileId || !fileHash) {
    throw new Error('FileReference requires fileId and fileHash');
  }

  return {
    fileId: String(fileId),
    fileHash: String(fileHash),
    fileName: fileName ? String(fileName) : null,
    uploadDate: String(uploadDate)
  };
};

/**
 * Validates if an object is a valid FileReference
 * @param {any} obj - Object to validate
 * @returns {boolean} Whether the object is a valid FileReference
 */
export const isValidFileReference = (obj) => {
  if (!obj || typeof obj !== 'object') return false;
  
  const requiredFields = ['fileId', 'fileHash'];
  const optionalFields = ['fileName', 'uploadDate'];
  
  // Check required fields
  if (!requiredFields.every(field => 
    obj[field] && typeof obj[field] === 'string' && obj[field].length > 0
  )) {
    return false;
  }
  
  // Check optional fields if present
  if (!optionalFields.every(field => 
    !(field in obj) || obj[field] === null || typeof obj[field] === 'string'
  )) {
    return false;
  }
  
  return true;
};

/**
 * Migrates file reference data from transactionMetadata to FileReference
 * @param {Object} transactionMetadata - The transaction metadata object
 * @returns {FileReference|null} A new FileReference object or null if no valid data
 */
export const migrateFileReference = (transactionMetadata) => {
  if (!transactionMetadata?.fileId || !transactionMetadata?.fileHash) {
    return null;
  }

  return createFileReference({
    fileId: transactionMetadata.fileId,
    fileHash: transactionMetadata.fileHash,
    fileName: transactionMetadata.fileName,
    uploadDate: transactionMetadata.uploadDate
  });
}; 