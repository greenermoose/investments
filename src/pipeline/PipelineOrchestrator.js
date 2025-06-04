import { FileUploader } from './upload/FileUploader';
import { FileStorage } from './storage/FileStorage';
import { ParserFactory } from './parser/FileParser';
import { PortfolioProcessor } from './portfolio/PortfolioProcessor';

/**
 * Orchestrates the file processing pipeline
 */
export class PipelineOrchestrator {
  constructor() {
    this.uploader = new FileUploader();
    this.storage = new FileStorage();
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

      // Stage 2: Store raw file
      const fileRecord = await this.storage.saveFile({
        filename: file.name,
        content: uploadResult.content,
        type: uploadResult.fileType
      });

      // Stage 3: Parse file
      const parser = ParserFactory.createParser(fileRecord.type);
      const parsedData = parser.parse(fileRecord.content);
      
      // Extract metadata from filename
      const metadata = parser.extractMetadata(file.name);

      // Stage 4: Process and save to portfolio database
      let processingResult;
      if (fileRecord.type === 'CSV') {
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
      await this.storage.markFileAsProcessed(fileRecord.id, {
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