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
      const accountName = getAccountNameFromFilename(fileName);
      
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
        parsedData.portfolioDate || dateFromFileName, 
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
        parsedData.portfolioDate || dateFromFileName,
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
      onLoad.setError('Failed to load portfolio data. Please check the file format.');
      onLoad.setLoadingState(false);
    }
  };

  return {
    handleFileLoaded
  };
};