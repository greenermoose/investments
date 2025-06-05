import { FileUploader } from './upload/FileUploader';
import { saveUploadedFile, markFileAsProcessed } from '../utils/fileStorage';
import { ParserFactory } from './parser/FileParser';
import { PortfolioProcessor } from './portfolio/PortfolioProcessor';
import { debugLog } from '../utils/debugConfig';
import { readFileAsText } from '../utils/fileUtils';
import { identifyAndClassifyFile } from '../utils/fileProcessing';
import { parsePortfolioCSV } from '../utils/parseSnapshot';
import { parseTransactionJSON } from '../utils/parseTransactions';

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
    debugLog('pipeline', 'start', 'Starting pipeline processing', { 
      filename: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    try {
      // Stage 1: Read file content
      const content = await readFileAsText(file);
      debugLog('pipeline', 'read', 'File content read', {
        filename: file.name,
        contentLength: content.length,
        firstFewLines: content.split('\n').slice(0, 3).join('\n')
      });

      // Stage 2: Identify file type and metadata
      const metadata = await this.identifyFile(file, content);
      debugLog('pipeline', 'identify', 'File identified', {
        filename: file.name,
        fileType: metadata.fileType,
        accountName: metadata.accountName,
        date: metadata.date,
        hasMetadata: !!metadata
      });

      // Stage 3: Upload file to storage
      const uploadResult = await this.uploadFile(file, metadata);
      debugLog('pipeline', 'upload', 'File uploaded', {
        filename: file.name,
        fileId: uploadResult.fileId,
        hasFileId: !!uploadResult.fileId,
        fileType: uploadResult.fileType
      });

      const fileId = uploadResult.fileId;
      if (!fileId) {
        debugLog('pipeline', 'error', 'Missing file ID after upload', {
          filename: file.name,
          uploadResult
        });
        throw new Error('Failed to get file ID from upload');
      }

      // Stage 4: Parse file content
      debugLog('pipeline', 'parse', 'Starting file parsing', {
        filename: file.name,
        fileType: uploadResult.fileType,
        contentLength: content.length
      });

      let parsedData;
      if (uploadResult.fileType === 'CSV') {
        parsedData = parsePortfolioCSV(content);
      } else if (uploadResult.fileType === 'JSON') {
        parsedData = parseTransactionJSON(content);
      } else {
        debugLog('pipeline', 'error', 'Unsupported file type', {
          filename: file.name,
          fileType: uploadResult.fileType
        });
        throw new Error(`Unsupported file type: ${uploadResult.fileType}`);
      }

      debugLog('pipeline', 'parse', 'File parsed', {
        filename: file.name,
        success: parsedData.success,
        dataLength: parsedData.data?.length,
        firstPosition: parsedData.data?.[0],
        rawData: JSON.stringify(parsedData.data?.[0])
      });
      
      if (!parsedData.success) {
        debugLog('pipeline', 'error', 'Parsing failed', { 
          filename: file.name,
          error: parsedData.error,
          rawData: JSON.stringify(parsedData)
        });
        throw new Error(`Failed to parse file: ${parsedData.error}`);
      }
      
      // Stage 5: Process and save to portfolio database
      let processingResult;
      if (uploadResult.fileType === 'CSV') {
        debugLog('pipeline', 'process', 'Processing portfolio snapshot', {
          filename: file.name,
          fileId,
          accountName: metadata.accountName,
          snapshotDate: metadata.date,
          dataLength: parsedData.data?.length,
          firstPosition: parsedData.data?.[0]
        });
        
        processingResult = await this.processor.processPortfolioSnapshot({
          parsedData,
          accountName: metadata.accountName,
          snapshotDate: metadata.date,
          fileId
        });

        debugLog('pipeline', 'process', 'Portfolio snapshot processed', {
          filename: file.name,
          success: processingResult.success,
          hasSnapshot: !!processingResult.snapshot,
          snapshotDataLength: processingResult.snapshot?.data?.length,
          firstSnapshotPosition: processingResult.snapshot?.data?.[0],
          rawResult: JSON.stringify(processingResult)
        });
      }

      // Stage 6: Update file processing status
      debugLog('pipeline', 'status', 'Updating file processing status', {
        filename: file.name,
        fileId,
        success: processingResult?.success
      });

      await markFileAsProcessed(fileId, {
        processed: true,
        success: processingResult?.success,
        error: processingResult?.error
      });

      debugLog('pipeline', 'complete', 'Pipeline processing completed', {
        filename: file.name,
        fileId,
        success: processingResult?.success,
        hasData: !!processingResult?.snapshot?.data?.length
      });

      return {
        success: true,
        result: processingResult
      };
    } catch (error) {
      debugLog('pipeline', 'error', 'Pipeline processing failed', {
        error: error.message,
        stack: error.stack,
        filename: file.name
      });
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

  /**
   * Identify file type and extract metadata
   * @param {File} file - File to identify
   * @param {string} content - File content
   * @returns {Promise<Object>} File metadata
   */
  async identifyFile(file, content) {
    debugLog('pipeline', 'identify', 'Identifying file', {
      filename: file.name,
      contentLength: content.length
    });

    try {
      const result = await identifyAndClassifyFile(content, file.name, file.type);
      
      if (!result.success) {
        debugLog('pipeline', 'error', 'File identification failed', {
          filename: file.name,
          error: result.error
        });
        throw new Error(result.error);
      }

      return {
        fileType: result.classification === 'portfolio_snapshot' ? 'CSV' : 'JSON',
        accountName: result.accountName,
        date: result.date
      };
    } catch (error) {
      debugLog('pipeline', 'error', 'Error identifying file', {
        filename: file.name,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
} 