// hooks/useAcquisitionModal.js revision: 2

import { useState } from 'react';
import { 
  saveSecurityMetadata,
  getSecurityMetadata,
  saveLot
} from '../utils/portfolioStorage';

export const useAcquisitionModal = () => {
  const [showAcquisitionModal, setShowAcquisitionModal] = useState(false);
  const [pendingAcquisitions, setPendingAcquisitions] = useState([]);
  const [possibleTickerChanges, setPossibleTickerChanges] = useState([]);
  const [transactionData, setTransactionData] = useState({});

  const handleAcquisitionSubmit = async (change, acquisitionDate, isTickerChange, oldSymbol, currentAccount, lotData) => {
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
        const securityId = `${currentAccount}_${change.symbol}`;
        
        const newLot = {
          id: `${securityId}_${Date.now()}`,
          securityId: securityId,
          account: currentAccount,
          symbol: change.symbol,
          quantity: change.quantity,
          originalQuantity: change.quantity,
          remainingQuantity: change.quantity,
          acquisitionDate: acquisitionDate,
          costBasis: lotData?.costBasis || 0,
          pricePerShare: lotData?.costBasis ? lotData.costBasis / change.quantity : 0,
          status: 'OPEN',
          isTransactionDerived: lotData?.isTransactionDerived || false,
          createdAt: new Date()
        };
        
        // Actually save the lot to the database
        await saveLot(newLot);
        console.log(`Created new lot for ${change.symbol}:`, newLot);
      }
    } catch (err) {
      console.error('Error saving acquisition data:', err);
    }
  };

  const openAcquisitionModal = (acquisitions, tickerChanges, txData) => {
    // Add description to acquired securities
    const enrichedAcquisitions = acquisitions.map(acq => ({
      ...acq,
      description: acq.description || ''
    }));
    
    setPendingAcquisitions(enrichedAcquisitions);
    setPossibleTickerChanges(tickerChanges || []);
    setTransactionData(txData || {});
    setShowAcquisitionModal(true);
  };

  const closeAcquisitionModal = () => {
    setShowAcquisitionModal(false);
    setPendingAcquisitions([]);
    setPossibleTickerChanges([]);
    setTransactionData({});
  };

  return {
    showAcquisitionModal,
    pendingAcquisitions,
    possibleTickerChanges,
    transactionData,
    openAcquisitionModal,
    closeAcquisitionModal,
    handleAcquisitionSubmit
  };
};