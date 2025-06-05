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
    console.log('PipelineOrchestrator: processFile starting...')
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

      // Stage 2: Determine file type from extension
      const fileType = file.name.toLowerCase().endsWith('.csv') ? 'CSV' : 'JSON';
      debugLog('pipeline', 'type', 'Determined file type', {
        filename: file.name,
        fileType
      });

      // Stage 3: Identify file type and metadata first
      const metadata = await this.identifyFile(file, content);
      debugLog('pipeline', 'identify', 'File identified', {
        filename: file.name,
        fileType: metadata.fileType,
        accountName: metadata.accountName,
        date: metadata.date,
        hasMetadata: !!metadata
      });

      // Stage 4: Save file to storage with metadata
      const storageResult = await saveUploadedFile(
        file,
        content,
        metadata.accountName,
        fileType,
        metadata.date
      );

      if (!storageResult.id) {
        throw new Error('Failed to save file to storage');
      }

      debugLog('pipeline', 'storage', 'File saved to storage', {
        filename: file.name,
        fileId: storageResult.id,
        isDuplicate: storageResult.isDuplicate,
        accountName: metadata.accountName,
        date: metadata.date?.toISOString(),
        fileHash: storageResult.fileHash
      });

      // Stage 5: Parse file content
      debugLog('pipeline', 'parse', 'Starting file parsing', {
        filename: file.name,
        fileType: metadata.fileType,
        contentLength: content.length
      });

      let parsedData;
      if (metadata.fileType === 'CSV') {
        parsedData = parsePortfolioCSV(content);
      } else if (metadata.fileType === 'JSON') {
        parsedData = parseTransactionJSON(content);
      } else {
        debugLog('pipeline', 'error', 'Unsupported file type', {
          filename: file.name,
          fileType: metadata.fileType
        });
        throw new Error(`Unsupported file type: ${metadata.fileType}`);
      }

      debugLog('pipeline', 'parse', 'File parsed', {
        filename: file.name,
        success: parsedData.success,
        dataLength: parsedData.data?.length,
        firstPosition: parsedData.data?.[0]
      });
      
      if (!parsedData.success) {
        debugLog('pipeline', 'error', 'Parsing failed', { 
          filename: file.name,
          error: parsedData.error
        });
        throw new Error(`Failed to parse file: ${parsedData.error}`);
      }
      
      // Stage 6: Process and save to portfolio database
      let processingResult;
      if (metadata.fileType === 'CSV') {
        debugLog('pipeline', 'process', 'Processing portfolio snapshot', {
          filename: file.name,
          fileId: storageResult.id,
          accountName: metadata.accountName,
          snapshotDate: metadata.date,
          dataLength: parsedData.data?.length,
          fileHash: storageResult.fileHash
        });
        
        processingResult = await this.processor.processPortfolioSnapshot({
          parsedData,
          accountName: metadata.accountName,
          snapshotDate: metadata.date,
          fileId: storageResult.id,
          fileHash: storageResult.fileHash
        });

        debugLog('pipeline', 'process', 'Portfolio snapshot processed', {
          filename: file.name,
          success: processingResult.success,
          hasSnapshot: !!processingResult.snapshot,
          snapshotDataLength: processingResult.snapshot?.data?.length,
          fileHash: storageResult.fileHash
        });
      }

      // Stage 7: Update file processing status
      debugLog('pipeline', 'status', 'Updating file processing status', {
        filename: file.name,
        fileId: storageResult.id,
        success: processingResult?.success,
        fileHash: storageResult.fileHash
      });

      await markFileAsProcessed(storageResult.id, {
        processed: true,
        success: processingResult?.success,
        error: processingResult?.error,
        headers: parsedData.headers,
        data: parsedData.data,
        metadata: {
          ...metadata,
          date: parsedData.metadata.date,
          time: parsedData.metadata.time,
          accountName: metadata.accountName,
          fileHash: storageResult.fileHash,
          fileId: storageResult.id
        }
      });

      debugLog('pipeline', 'complete', 'Pipeline processing completed', {
        filename: file.name,
        fileId: storageResult.id,
        success: processingResult?.success,
        hasData: !!processingResult?.snapshot?.data?.length
      });

      return {
        success: true,
        data: parsedData.data,
        accountName: metadata.accountName,
        date: metadata.date,
        accountTotal: parsedData.accountTotal,
        fileId: storageResult.id,
        fileHash: storageResult.fileHash,
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