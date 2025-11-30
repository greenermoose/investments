// Acquisition modal store
import { reactive } from '../vue.esm-browser.js';
import { portfolioService } from '../services/PortfolioService.js';

const acquisitionStore = reactive({
  showAcquisitionModal: false,
  pendingAcquisitions: [],
  possibleTickerChanges: [],
  transactionData: {},
  
  async handleAcquisitionSubmit(change, acquisitionDate, isTickerChange, oldSymbol, currentAccount, lotData) {
    try {
      if (isTickerChange) {
        // Handle ticker symbol change
        const oldMetadata = await portfolioService.getSecurityMetadata(oldSymbol, currentAccount);
        if (oldMetadata) {
          await portfolioService.saveSecurityMetadata(change.symbol, currentAccount, {
            acquisitionDate: oldMetadata.acquisitionDate,
            lots: oldMetadata.lots,
            description: change.description
          });
        }
      } else {
        // Save new acquisition metadata
        await portfolioService.saveSecurityMetadata(change.symbol, currentAccount, {
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
        
        await portfolioService.saveLot(newLot);
        console.log(`Created new lot for ${change.symbol}:`, newLot);
      }
    } catch (err) {
      console.error('Error saving acquisition data:', err);
    }
  },
  
  openAcquisitionModal(acquisitions, tickerChanges, txData) {
    const enrichedAcquisitions = acquisitions.map(acq => ({
      ...acq,
      description: acq.description || ''
    }));
    
    this.pendingAcquisitions = enrichedAcquisitions;
    this.possibleTickerChanges = tickerChanges || [];
    this.transactionData = txData || {};
    this.showAcquisitionModal = true;
  },
  
  closeAcquisitionModal() {
    this.showAcquisitionModal = false;
    this.pendingAcquisitions = [];
    this.possibleTickerChanges = [];
    this.transactionData = {};
  }
});

export default acquisitionStore;

