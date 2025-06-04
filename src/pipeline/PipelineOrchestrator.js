import { FileUploader } from './upload/FileUploader';
import { saveUploadedFile, markFileAsProcessed } from '../utils/fileStorage';
import { ParserFactory } from './parser/FileParser';
import { PortfolioProcessor } from './portfolio/PortfolioProcessor';
import { debugLog } from '../utils/debugConfig';

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
    debugLog('pipeline', 'start', 'Starting pipeline processing', { filename: file.name });
    
    try {
      // Determine expected file type based on extension
      const isCSV = file.name.toLowerCase().endsWith('.csv');
      const expectedType = isCSV ? 'CSV' : 'JSON';
      debugLog('pipeline', 'detect', 'Detected file type', { expectedType });

      // Stage 1: Upload and validate file
      debugLog('pipeline', 'upload', 'Starting file upload');
      const uploadResult = await this.uploader.processUpload(file, expectedType);
      if (!uploadResult.success) {
        debugLog('pipeline', 'error', 'Upload failed', { error: uploadResult.error });
        throw new Error(`Upload failed: ${uploadResult.error}`);
      }
      debugLog('pipeline', 'upload', 'File uploaded successfully', {
        fileName: uploadResult.fileName,
        fileType: uploadResult.fileType
      });

      // Stage 2: Parse file to extract metadata
      debugLog('pipeline', 'metadata', 'Extracting metadata');
      const parser = ParserFactory.createParser(uploadResult.fileType);
      const metadata = parser.extractMetadata(file.name);
      debugLog('pipeline', 'metadata', 'Metadata extracted', metadata);

      // Stage 3: Store raw file
      debugLog('pipeline', 'storage', 'Saving uploaded file');
      const fileRecord = await saveUploadedFile(
        file,
        uploadResult.content,
        metadata.accountName,
        uploadResult.fileType,
        metadata.date
      );

      if (fileRecord.isDuplicate) {
        debugLog('pipeline', 'warn', 'Duplicate file detected', {
          duplicateType: fileRecord.duplicateType,
          existingFile: fileRecord.existingFile
        });
        return {
          success: false,
          error: `File is a duplicate: ${fileRecord.duplicateType}`,
          existingFile: fileRecord.existingFile
        };
      }
      debugLog('pipeline', 'storage', 'File saved successfully', { fileId: fileRecord.id });

      // Stage 4: Parse file content
      debugLog('pipeline', 'parse', 'Parsing file content');
      const parsedData = parser.parse(uploadResult.content);
      debugLog('pipeline', 'parse', 'File parsed', {
        success: parsedData.success,
        dataLength: parsedData.data?.length,
        firstPosition: parsedData.data?.[0]
      });
      
      if (!parsedData.success) {
        debugLog('pipeline', 'error', 'Parsing failed', { error: parsedData.error });
        throw new Error(`Failed to parse file: ${parsedData.error}`);
      }
      
      // Stage 5: Process and save to portfolio database
      let processingResult;
      if (uploadResult.fileType === 'CSV') {
        debugLog('pipeline', 'process', 'Processing portfolio snapshot');
        processingResult = await this.processor.processPortfolioSnapshot({
          parsedData,
          accountName: metadata.accountName,
          snapshotDate: metadata.date,
          fileId: fileRecord.id
        });
        debugLog('pipeline', 'process', 'Portfolio snapshot processed', {
          success: processingResult.success,
          hasSnapshot: !!processingResult.snapshot,
          snapshotDataLength: processingResult.snapshot?.data?.length,
          firstSnapshotPosition: processingResult.snapshot?.data?.[0]
        });
      } else {
        debugLog('pipeline', 'process', 'Processing transactions');
        processingResult = await this.processor.processTransactions({
          parsedData,
          accountName: metadata.accountName,
          fileId: fileRecord.id
        });
        debugLog('pipeline', 'process', 'Transactions processed', {
          success: processingResult.success,
          transactionsCount: processingResult.transactions?.length
        });
      }

      if (!processingResult.success) {
        debugLog('pipeline', 'error', 'Processing failed', { error: processingResult.error });
        throw new Error(`Processing failed: ${processingResult.error}`);
      }

      // Update file record with processing status
      debugLog('pipeline', 'storage', 'Updating file processing status');
      await markFileAsProcessed(fileRecord.id, {
        success: processingResult.success,
        error: processingResult.error,
        result: processingResult
      });

      // For CSV files, use the parsed data directly if snapshot is not available
      const portfolioData = uploadResult.fileType === 'CSV' 
        ? (processingResult.snapshot?.data || parsedData.data)
        : [];

      debugLog('pipeline', 'complete', 'Pipeline processing completed successfully', {
        dataLength: portfolioData.length,
        firstPosition: portfolioData[0],
        accountName: processingResult.accountName,
        date: processingResult.snapshot?.date || metadata.date
      });

      return {
        success: true,
        fileRecord,
        processingResult,
        data: portfolioData,
        accountName: processingResult.accountName,
        date: processingResult.snapshot?.date || metadata.date,
        accountTotal: processingResult.snapshot?.accountTotal
      };
    } catch (error) {
      debugLog('pipeline', 'error', 'Pipeline processing failed', {
        error: error.message,
        stack: error.stack
      });
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
    debugLog('pipeline', 'status', 'Getting processing status', { fileId });
    const fileRecord = await this.storage.getFile(fileId);
    debugLog('pipeline', 'status', 'Processing status retrieved', {
      processed: fileRecord.processed,
      hasError: !!fileRecord.error
    });
    return {
      processed: fileRecord.processed,
      processingResult: fileRecord.processingResult,
      error: fileRecord.error
    };
  }
} 