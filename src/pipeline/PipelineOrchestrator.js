import { FileUploader } from './upload/FileUploader';
import { saveUploadedFile, markFileAsProcessed } from '../utils/fileStorage';
import { ParserFactory } from './parser/FileParser';
import { PortfolioProcessor } from './portfolio/PortfolioProcessor';

/**
 * Orchestrates the file processing pipeline
 */
export class PipelineOrchestrator {
  constructor() {
    this.uploader = new FileUploader();
    this.processor = new PortfolioProcessor();
  }

  /**
   * Process a file through the pipeline
   * @param {File} file - File to process
   * @returns {Promise<Object>} Processing result
   */
  async processFile(file) {
    try {
      // Determine expected file type based on extension
      const isCSV = file.name.toLowerCase().endsWith('.csv');
      const expectedType = isCSV ? 'CSV' : 'JSON';

      // Stage 1: Upload and validate file
      const uploadResult = await this.uploader.processUpload(file, expectedType);
      if (!uploadResult.success) {
        throw new Error(`Upload failed: ${uploadResult.error}`);
      }

      // Stage 2: Parse file to extract metadata
      const parser = ParserFactory.createParser(uploadResult.fileType);
      const metadata = parser.extractMetadata(file.name);

      // Stage 3: Store raw file
      const fileRecord = await saveUploadedFile(
        file,
        uploadResult.content,
        metadata.accountName,
        uploadResult.fileType,
        metadata.date
      );

      if (fileRecord.isDuplicate) {
        return {
          success: false,
          error: `File is a duplicate: ${fileRecord.duplicateType}`,
          existingFile: fileRecord.existingFile
        };
      }

      // Stage 4: Parse file content
      const parsedData = parser.parse(uploadResult.content);
      
      // Stage 5: Process and save to portfolio database
      let processingResult;
      if (uploadResult.fileType === 'CSV') {
        processingResult = await this.processor.processPortfolioSnapshot({
          parsedData,
          accountName: metadata.accountName,
          snapshotDate: metadata.date,
          fileId: fileRecord.id
        });
      } else {
        processingResult = await this.processor.processTransactions({
          parsedData,
          accountName: metadata.accountName,
          fileId: fileRecord.id
        });
      }

      // Update file record with processing status
      await markFileAsProcessed(fileRecord.id, {
        success: processingResult.success,
        error: processingResult.error,
        result: processingResult
      });

      return {
        success: true,
        fileRecord,
        processingResult,
        data: processingResult.snapshot?.data || [],
        accountName: processingResult.accountName,
        date: processingResult.snapshot?.date,
        accountTotal: processingResult.snapshot?.accountTotal
      };
    } catch (error) {
      console.error('Pipeline processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get processing status for a file
   * @param {string} fileId - File ID
   * @returns {Promise<Object>} Processing status
   */
  async getProcessingStatus(fileId) {
    const fileRecord = await this.storage.getFile(fileId);
    return {
      processed: fileRecord.processed,
      processingResult: fileRecord.processingResult,
      error: fileRecord.error
    };
  }
} 