// hooks/useFileUpload.js
import { parseIRAPortfolioCSV } from '../utils/csvParser';
import { getAccountNameFromFilename } from '../utils/securityUtils';
import { 
  savePortfolioSnapshot, 
  getLatestSnapshot
} from '../utils/portfolioStorage';
import { analyzePortfolioChanges } from '../utils/portfolioAnalyzer';

export const useFileUpload = (portfolioData, onLoad, onAcquisitionsFound) => {
  const handleFileLoaded = async (fileContent, fileName, dateFromFileName) => {
    try {
      onLoad.setLoadingState(true);
      onLoad.resetError();
      
      // Parse the CSV data
      const parsedData = parseIRAPortfolioCSV(fileContent);
      
      if (!parsedData.portfolioData || parsedData.portfolioData.length === 0) {
        throw new Error('No portfolio data found in the file. Please check the file format.');
      }
      
      const accountName = getAccountNameFromFilename(fileName);
      
      // Determine the portfolio date
      let portfolioDate = parsedData.portfolioDate || dateFromFileName;
      
      // If still no date, create one from current time as fallback
      if (!portfolioDate) {
        portfolioDate = new Date();
        console.warn('Could not extract date from file or filename. Using current date.');
      }
      
      // Get the latest snapshot for comparison
      const latestSnapshot = await getLatestSnapshot(accountName);
      
      // Analyze changes if there's a previous snapshot
      let changes = null;
      if (latestSnapshot) {
        changes = await analyzePortfolioChanges(parsedData.portfolioData, latestSnapshot.data);
      }
      
      // Save the current snapshot
      await savePortfolioSnapshot(
        parsedData.portfolioData, 
        accountName, 
        portfolioDate, 
        parsedData.accountTotal
      );
      
      // Handle new acquisitions
      if (changes && changes.acquired.length > 0) {
        // Add description to acquired securities
        const enrichedAcquisitions = changes.acquired.map(acq => {
          const security = parsedData.portfolioData.find(p => p.Symbol === acq.symbol);
          return {
            ...acq,
            description: security?.Description || ''
          };
        });
        
        onAcquisitionsFound.openAcquisitionModal(enrichedAcquisitions, changes.possibleTickerChanges);
      }
      
      // Load the portfolio data
      onLoad.loadPortfolio(
        parsedData.portfolioData,
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
    } catch (err) {
      console.error('Error processing file:', err);
      onLoad.setError(err.message || 'Failed to load portfolio data. Please check the file format.');
      onLoad.setLoadingState(false);
    }
  };

  return {
    handleFileLoaded
  };
};