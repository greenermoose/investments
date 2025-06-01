import { BaseStoreService } from './BaseStoreService';
import { STORE_NAMES, INDEX_NAMES } from '../config';

export class FileStoreService extends BaseStoreService {
  constructor() {
    super(STORE_NAMES.FILES);
  }

  /**
   * Get files by filename
   * @param {string} filename - Filename to search for
   * @returns {Promise<Array>} - Array of files
   */
  async getByFilename(filename) {
    return this.getByIndex(INDEX_NAMES.FILES.filename, filename);
  }

  /**
   * Get files by file type
   * @param {string} fileType - File type to search for
   * @returns {Promise<Array>} - Array of files
   */
  async getByFileType(fileType) {
    return this.getByIndex(INDEX_NAMES.FILES.fileType, fileType);
  }

  /**
   * Get files by upload date
   * @param {Date} uploadDate - Upload date to search for
   * @returns {Promise<Array>} - Array of files
   */
  async getByUploadDate(uploadDate) {
    return this.getByIndex(INDEX_NAMES.FILES.uploadDate, uploadDate);
  }

  /**
   * Get files by account
   * @param {string} account - Account name
   * @returns {Promise<Array>} - Array of files
   */
  async getByAccount(account) {
    return this.getByIndex(INDEX_NAMES.FILES.account, account);
  }

  /**
   * Get file by hash
   * @param {string} fileHash - File hash to search for
   * @returns {Promise<Array>} - Array of files
   */
  async getByFileHash(fileHash) {
    return this.getByIndex(INDEX_NAMES.FILES.fileHash, fileHash);
  }
} 