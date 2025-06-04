import portfolioService from '../../services/PortfolioService';
import { calculateAccountTotals, analyzeChanges } from '../../utils/portfolioAnalysis';
import { PortfolioRepository } from '../../repositories/PortfolioRepository';
import { debugLog } from '../../utils/debugConfig';

/**
 * Processes parsed portfolio data and saves it to the database
 */
export class PortfolioProcessor {
  constructor() {
    this.repository = new PortfolioRepository();
  }

  /**
   * Process and save portfolio snapshot
   * @param {Object} params - Processing parameters
   * @param {Object} params.parsedData - Parsed portfolio data
   * @param {string} params.accountName - Account name
   * @param {Date} params.snapshotDate - Snapshot date
   * @param {string} params.fileId - ID of the source file
   * @returns {Promise<Object>} Processing result
   */
  async processPortfolioSnapshot({ parsedData, accountName, snapshotDate, fileId }) {
    debugLog('portfolio', 'start', 'Starting portfolio snapshot processing', {
      accountName,
      snapshotDate,
      fileId,
      dataLength: parsedData.data?.length
    });

    if (!parsedData.success) {
      debugLog('portfolio', 'error', 'Invalid parsed data', {
        error: parsedData.error
      });
      return {
        success: false,
        error: 'Failed to parse portfolio data'
      };
    }

    try {
      // Get existing accounts to check for similar names
      debugLog('portfolio', 'accounts', 'Checking existing accounts');
      const existingAccounts = await portfolioService.getAllAccounts();
      const similarAccount = existingAccounts.find(acc => 
        acc.toLowerCase() === accountName.toLowerCase()
      );

      // Use existing account name if found
      const finalAccountName = similarAccount || accountName;
      debugLog('portfolio', 'accounts', 'Account name resolved', {
        original: accountName,
        final: finalAccountName,
        isExisting: !!similarAccount
      });

      // Calculate account totals
      debugLog('portfolio', 'totals', 'Calculating account totals');
      const accountTotals = calculateAccountTotals(parsedData.data);
      debugLog('portfolio', 'totals', 'Account totals calculated', accountTotals);

      // Get latest snapshot for comparison
      debugLog('portfolio', 'snapshot', 'Getting latest snapshot for comparison');
      const latestSnapshot = await portfolioService.getLatestSnapshot(finalAccountName);
      debugLog('portfolio', 'snapshot', 'Latest snapshot retrieved', {
        hasSnapshot: !!latestSnapshot,
        snapshotDate: latestSnapshot?.date
      });
      
      // Analyze changes if we have a previous snapshot
      let changes = null;
      if (latestSnapshot) {
        debugLog('portfolio', 'changes', 'Analyzing portfolio changes');
        changes = analyzeChanges(latestSnapshot, parsedData.data);
        debugLog('portfolio', 'changes', 'Changes analyzed', {
          added: changes.added?.length,
          removed: changes.removed?.length,
          modified: changes.modified?.length
        });
      }

      // Save the portfolio snapshot
      debugLog('portfolio', 'save', 'Saving portfolio snapshot');
      const snapshotId = await portfolioService.savePortfolioSnapshot(
        parsedData.data,
        finalAccountName,
        snapshotDate,
        accountTotals,
        { changes, fileId }
      );
      debugLog('portfolio', 'save', 'Portfolio snapshot saved', { snapshotId });

      // Fetch the full snapshot
      debugLog('portfolio', 'fetch', 'Fetching saved snapshot');
      const snapshot = await portfolioService.getPortfolioById(snapshotId);
      if (!snapshot) {
        debugLog('portfolio', 'error', 'Failed to retrieve saved snapshot', { snapshotId });
        throw new Error('Failed to retrieve saved portfolio snapshot');
      }
      debugLog('portfolio', 'fetch', 'Snapshot retrieved successfully', {
        id: snapshot.id,
        positionsCount: snapshot.data.length
      });

      // If no transaction data exists, create lots from snapshot
      debugLog('portfolio', 'lots', 'Checking for existing transactions');
      const hasTransactions = await portfolioService.hasTransactions(finalAccountName);
      if (!hasTransactions) {
        debugLog('portfolio', 'lots', 'Creating lots from snapshot');
        await portfolioService.createLotsFromSnapshot(
          snapshot.data,
          finalAccountName,
          snapshotDate
        );
        debugLog('portfolio', 'lots', 'Lots created successfully');
      } else {
        debugLog('portfolio', 'lots', 'Transactions already exist, skipping lot creation');
      }

      debugLog('portfolio', 'complete', 'Portfolio snapshot processing completed', {
        success: true,
        portfolioId: snapshot.id,
        positionsCount: snapshot.data.length,
        hasChanges: !!changes
      });

      return {
        success: true,
        snapshot,
        accountName: finalAccountName,
        changes
      };
    } catch (error) {
      debugLog('portfolio', 'error', 'Portfolio snapshot processing failed', {
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process and save transaction data
   * @param {Object} params - Processing parameters
   * @param {Object} params.parsedData - Parsed transaction data
   * @param {string} params.accountName - Account name
   * @param {string} params.fileId - ID of the source file
   * @returns {Promise<Object>} Processing result
   */
  async processTransactions({ parsedData, accountName, fileId }) {
    debugLog('portfolio', 'start', 'Starting transaction processing', {
      accountName,
      fileId,
      dataLength: parsedData.data?.length
    });

    try {
      if (!parsedData.success) {
        debugLog('portfolio', 'error', 'Invalid parsed data', {
          error: parsedData.error
        });
        throw new Error(`Failed to parse transaction data: ${parsedData.error}`);
      }

      // Get existing accounts to check for similar names
      debugLog('portfolio', 'accounts', 'Checking existing accounts');
      const existingAccounts = await portfolioService.getAccounts();
      const similarAccount = existingAccounts.find(acc => 
        acc.name.toLowerCase() === accountName.toLowerCase()
      );

      // Use existing account name if found
      const finalAccountName = similarAccount ? similarAccount.name : accountName;
      debugLog('portfolio', 'accounts', 'Account name resolved', {
        original: accountName,
        final: finalAccountName,
        isExisting: !!similarAccount
      });

      // Save transactions
      debugLog('portfolio', 'save', 'Saving transactions');
      const transactions = await portfolioService.saveTransactions({
        accountName: finalAccountName,
        transactions: parsedData.data,
        fromDate: parsedData.fromDate,
        toDate: parsedData.toDate,
        fileId
      });
      debugLog('portfolio', 'save', 'Transactions saved successfully', {
        count: transactions.length,
        fromDate: parsedData.fromDate,
        toDate: parsedData.toDate
      });

      debugLog('portfolio', 'complete', 'Transaction processing completed', {
        success: true,
        transactionsCount: transactions.length
      });

      return {
        success: true,
        transactions,
        accountName: finalAccountName
      };
    } catch (error) {
      debugLog('portfolio', 'error', 'Transaction processing failed', {
        error: error.message,
        stack: error.stack
      });
      console.error('Error processing transactions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
} 