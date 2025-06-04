import portfolioService from '../../services/PortfolioService';
import { calculateAccountTotals, analyzeChanges } from '../../utils/portfolioAnalysis';

/**
 * Processes parsed portfolio data and saves it to the database
 */
export class PortfolioProcessor {
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
    try {
      if (!parsedData.success) {
        throw new Error(`Failed to parse portfolio data: ${parsedData.error}`);
      }

      // Get existing accounts to check for similar names
      const existingAccounts = await portfolioService.getAllAccounts();
      const similarAccount = existingAccounts.find(acc => 
        acc.toLowerCase() === accountName.toLowerCase()
      );

      // Use existing account name if found
      const finalAccountName = similarAccount || accountName;

      // Calculate account totals
      const accountTotals = calculateAccountTotals(parsedData.data);

      // Get latest snapshot for comparison
      const latestSnapshot = await portfolioService.getLatestSnapshot(finalAccountName);
      
      // Analyze changes if we have a previous snapshot
      const changes = latestSnapshot ? 
        analyzeChanges(latestSnapshot, parsedData.data) : 
        null;

      // Save the portfolio snapshot
      const snapshotId = await portfolioService.savePortfolioSnapshot(
        parsedData.data,
        finalAccountName,
        snapshotDate,
        accountTotals,
        { changes, fileId }
      );

      // Fetch the full snapshot
      const snapshot = await portfolioService.getPortfolioById(snapshotId);
      if (!snapshot) {
        throw new Error('Failed to retrieve saved portfolio snapshot');
      }

      // If no transaction data exists, create lots from snapshot
      const hasTransactions = await portfolioService.hasTransactions(finalAccountName);
      if (!hasTransactions) {
        await portfolioService.createLotsFromSnapshot(
          snapshot.data,
          finalAccountName,
          snapshotDate
        );
      }

      return {
        success: true,
        snapshot,
        accountName: finalAccountName,
        changes
      };
    } catch (error) {
      console.error('Error processing portfolio snapshot:', error);
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
    try {
      if (!parsedData.success) {
        throw new Error(`Failed to parse transaction data: ${parsedData.error}`);
      }

      // Get existing accounts to check for similar names
      const existingAccounts = await portfolioService.getAccounts();
      const similarAccount = existingAccounts.find(acc => 
        acc.name.toLowerCase() === accountName.toLowerCase()
      );

      // Use existing account name if found
      const finalAccountName = similarAccount ? similarAccount.name : accountName;

      // Save transactions
      const transactions = await portfolioService.saveTransactions({
        accountName: finalAccountName,
        transactions: parsedData.data,
        fromDate: parsedData.fromDate,
        toDate: parsedData.toDate,
        fileId
      });

      return {
        success: true,
        transactions,
        accountName: finalAccountName
      };
    } catch (error) {
      console.error('Error processing transactions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
} 