// hooks/useAcquisitionModal.js revision: 1
import { useState } from 'react';
import { 
  saveSecurityMetadata,
  getSecurityMetadata,
  saveLot
} from '../utils/portfolioStorage';
import { processAcquiredLots } from '../utils/portfolioAnalyzer';

export const useAcquisitionModal = () => {
  const [showAcquisitionModal, setShowAcquisitionModal] = useState(false);
  const [pendingAcquisitions, setPendingAcquisitions] = useState([]);
  const [possibleTickerChanges, setPossibleTickerChanges] = useState([]);

  const handleAcquisitionSubmit = async (change, acquisitionDate, isTickerChange, oldSymbol, currentAccount) => {
    try {
      if (isTickerChange) {
        // Handle ticker symbol change
        // Copy existing security metadata to new symbol
        const oldMetadata = await getSecurityMetadata(oldSymbol, currentAccount);
        if (oldMetadata) {
          await saveSecurityMetadata(change.symbol, currentAccount, {
            acquisitionDate: oldMetadata.acquisitionDate,
            lots: oldMetadata.lots,
            description: change.description
          });
        }
      } else {
        // Save new acquisition metadata
        await saveSecurityMetadata(change.symbol, currentAccount, {
          acquisitionDate: acquisitionDate,
          description: change.description
        });
        
        // Create a new lot for the acquisition
        const newLot = await processAcquiredLots(
          change.symbol,
          currentAccount,
          change.quantity,
          acquisitionDate,
          0 // Cost basis will need to be updated later
        );
        
        await saveLot(newLot);
      }
    } catch (err) {
      console.error('Error saving acquisition data:', err);
    }
  };

  const openAcquisitionModal = (acquisitions, tickerChanges) => {
    // Add description to acquired securities
    const enrichedAcquisitions = acquisitions.map(acq => ({
      ...acq,
      description: acq.description || ''
    }));
    
    setPendingAcquisitions(enrichedAcquisitions);
    setPossibleTickerChanges(tickerChanges || []);
    setShowAcquisitionModal(true);
  };

  const closeAcquisitionModal = () => {
    setShowAcquisitionModal(false);
    setPendingAcquisitions([]);
    setPossibleTickerChanges([]);
  };

  return {
    showAcquisitionModal,
    pendingAcquisitions,
    possibleTickerChanges,
    openAcquisitionModal,
    closeAcquisitionModal,
    handleAcquisitionSubmit
  };
};