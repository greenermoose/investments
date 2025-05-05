// hooks/useFileUpload.js revision: 2
import { parseIRAPortfolioCSV } from '../utils/csvParser';
import { getAccountNameFromFilename } from '../utils/securityUtils';
import { 
  savePortfolioSnapshot, 
  getLatestSnapshot,
  bulkMergeTransactions,
  getTransactionsByAccount
} from '../utils/portfolioStorage';
import { analyzePortfolioChanges } from '../utils/portfolioAnalyzer';
import { 
  parseTransactionJSON,
  removeDuplicateTransactions,
  getEarliestAcquisitionDate
} from '../utils/transactionParser';
import { applyTransactionsToPortfolio } from '../utils/transactionEngine';
import { detectSymbolChange } from '../utils/symbolMapping';

export const useFileUpload = (portfolioData, onLoad, onAcquisitionsFound) => {
  const handleFileLoaded = async (fileContent, fileName, dateFromFileName) => {
    try {
      onLoad.setLoadingState(true);
      onLoad.resetError();
      
      // Determine file type
      const isJSON = fileName.toLowerCase().endsWith('.json');
      const isCSV = fileName.toLowerCase().endsWith('.csv');
      
      if (!isJSON && !isCSV) {
        throw new Error('Unsupported file format. Please upload a CSV or JSON file.');
      }
      
      const accountName = getAccountNameFromFilename(fileName);
      
      if (isJSON) {
        // Handle JSON transaction file
        await handleTransactionFile(fileContent, fileName, accountName, onLoad);
      } else {
        // Handle CSV portfolio file (existing logic)
        await handlePortfolioFile(fileContent, fileName, dateFromFileName, accountName, onLoad, onAcquisitionsFound);
      }
      
    } catch (err) {
      console.error('Error processing file:', err);
      onLoad.setError(err.message || 'Failed to process file. Please check the file format.');
      onLoad.setLoadingState(false);
    }
  };
  
  const handleTransactionFile = async (fileContent, fileName, accountName, onLoad) => {
    try {
      // Parse JSON transaction file
      const parsedData = parseTransactionJSON(fileContent);
      
      // Remove duplicates
      const uniqueTransactions = removeDuplicateTransactions(parsedData.transactions);
      
      // Merge transactions into database
      const mergeResult = await bulkMergeTransactions(uniqueTransactions, accountName);
      
      console.log(`Processed ${mergeResult.processed} transactions, ${mergeResult.errors.length} errors`);
      
      // Get all transactions for the account
      const allTransactions = await getTransactionsByAccount(accountName);
      
      // Get latest portfolio snapshot
      const latestSnapshot = await getLatestSnapshot(accountName);
      
      if (latestSnapshot) {
        // Apply transactions to portfolio to detect discrepancies
        const reconciliation = applyTransactionsToPortfolio(allTransactions, latestSnapshot.data);
        
        console.log('Transaction reconciliation:', reconciliation);
        
        // Check for new securities without acquisition dates
        const securitiesWithoutDates = reconciliation.results.filter(r => !r.hasAcquisitionDate);
        
        if (securitiesWithoutDates.length > 0) {
          // Existing code to handle acquisitionModal...
          const changes = {
            acquired: securitiesWithoutDates.map(s => ({
              symbol: s.symbol,
              quantity: s.actual.quantity,
              description: latestSnapshot.data.find(p => p.Symbol === s.symbol)?.Description || ''
            })),
            possibleTickerChanges: detectSymbolChange(allTransactions)
          };
          
          onAcquisitionsFound.openAcquisitionModal(changes.acquired, changes.possibleTickerChanges);
        }
        
        // If portfolio data is currently loaded, refresh it with acquisition dates
        if (portfolioData.length > 0) {
          const updatedPortfolioData = await enrichPortfolioWithTransactionData(latestSnapshot.data, reconciliation.results);
          onLoad.loadPortfolio(updatedPortfolioData, accountName, latestSnapshot.date, latestSnapshot.accountTotal);
        }
      }
      
      // Navigate to performance tab to show transaction data
      if (onLoad.onNavigate) {
        onLoad.onNavigate('performance');
      }
      
      onLoad.setLoadingState(false);
    } catch (error) {
      console.error('Error processing transaction file:', error);
      throw new Error(`Failed to process transaction file: ${error.message}`);
    }
  };
  
  const handlePortfolioFile = async (fileContent, fileName, dateFromFileName, accountName, onLoad, onAcquisitionsFound) => {
    // Parse the CSV data
    const parsedData = parseIRAPortfolioCSV(fileContent);
    
    if (!parsedData.portfolioData || parsedData.portfolioData.length === 0) {
      throw new Error('No portfolio data found in the file. Please check the file format.');
    }
    
    // Determine the portfolio date
    let portfolioDate = parsedData.portfolioDate || dateFromFileName;
    
    // If still no date, create one from current time as fallback
    if (!portfolioDate) {
      portfolioDate = new Date();
      console.warn('Could not extract date from file or filename. Using current date.');
    }
    
    // Debug logging
    console.log('===== FILE UPLOAD DEBUG =====');
    console.log('DEBUG: Filename:', fileName);
    console.log('DEBUG: Account name:', accountName);
    console.log('DEBUG: Date from filename:', dateFromFileName);
    console.log('DEBUG: Date from CSV:', parsedData.portfolioDate);
    console.log('DEBUG: Final portfolio date:', portfolioDate);
    console.log('DEBUG: Parsed data rows:', parsedData.portfolioData.length);
    console.log('=============================');
    
    // Get the latest snapshot for comparison
    const latestSnapshot = await getLatestSnapshot(accountName);
    
    if (latestSnapshot) {
      console.log('DEBUG: Latest snapshot found:', {
        id: latestSnapshot.id,
        date: latestSnapshot.date.toLocaleString()
      });
    } else {
      console.log('DEBUG: No previous snapshot found for this account');
    }
    
    // Check if we have transaction data for this account
    const accountTransactions = await getTransactionsByAccount(accountName);
    
    // If we have transactions, enrich portfolio data with acquisition dates
    let enrichedPortfolioData = parsedData.portfolioData;
    if (accountTransactions.length > 0) {
      const reconciliation = applyTransactionsToPortfolio(accountTransactions, parsedData.portfolioData);
      enrichedPortfolioData = await enrichPortfolioWithTransactionData(parsedData.portfolioData, reconciliation.results);
      
      // Log acquisition date coverage
      const withAcquisitionDates = reconciliation.summary.withAcquisitionDates;
      const totalPositions = reconciliation.summary.totalPositions;
      console.log(`Acquisition date coverage: ${withAcquisitionDates}/${totalPositions} positions`);
    }
    
    // Analyze changes if there's a previous snapshot
    let changes = null;
    if (latestSnapshot) {
      changes = await analyzePortfolioChanges(enrichedPortfolioData, latestSnapshot.data);
    }
    
    // Save the current snapshot
    const portfolioId = await savePortfolioSnapshot(
      enrichedPortfolioData, 
      accountName, 
      portfolioDate, 
      parsedData.accountTotal
    );
    
    console.log('DEBUG: Portfolio saved with ID:', portfolioId);
    
    // Handle new acquisitions
    if (changes && changes.acquired.length > 0) {
      // Add description to acquired securities
      const enrichedAcquisitions = changes.acquired.map(acq => {
        const security = enrichedPortfolioData.find(p => p.Symbol === acq.symbol);
        return {
          ...acq,
          description: security?.Description || ''
        };
      });
      
      onAcquisitionsFound.openAcquisitionModal(enrichedAcquisitions, changes.possibleTickerChanges);
    }
    
    // Load the portfolio data
    onLoad.loadPortfolio(
      enrichedPortfolioData,
      accountName,
      portfolioDate,
      parsedData.accountTotal
    );
    
    // Close the upload modal
    onLoad.onModalClose?.();
    
    // Switch to History tab if this is an additional upload
    if (latestSnapshot && onLoad.onNavigate) {
      onLoad.onNavigate('history');
    }
  };
  
  // Helper function to enrich portfolio data with transaction information
  const enrichPortfolioWithTransactionData = async (portfolioData, reconciliationResults) => {
    return portfolioData.map(position => {
      const symbol = position.Symbol;
      const reconciliation = reconciliationResults.find(r => r.symbol === symbol);
      
      if (reconciliation && reconciliation.earliestAcquisitionDate) {
        return {
          ...position,
          isTransactionDerived: true,
          earliestAcquisitionDate: reconciliation.earliestAcquisitionDate,
          hasDiscrepancies: reconciliation.reconciliation.hasDiscrepancies,
          discrepancyInfo: reconciliation.reconciliation.hasDiscrepancies ? 
            reconciliation.reconciliation.discrepancies : undefined
        };
      }
      
      return position;
    });
  };

  return {
    handleFileLoaded
  };
};