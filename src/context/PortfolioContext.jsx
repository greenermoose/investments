// context/PortfolioContext.js revision: 1
import React, { createContext, useContext, useState } from 'react';
import { usePortfolioData } from '../hooks/usePortfolioData';
import { useAcquisitionModal } from '../hooks/useAcquisitionModal';
import { usePortfolioNavigation } from '../hooks/usePortfolioNavigation';

// Create contexts
const PortfolioContext = createContext();
const AcquisitionContext = createContext();
const NavigationContext = createContext();
const AccountContext = createContext();

// Provider component
export const PortfolioProvider = ({ children }) => {
  const portfolioData = usePortfolioData();
  const acquisitionModal = useAcquisitionModal();
  const navigation = usePortfolioNavigation();
  
  // Account selection state
  const [selectedAccount, setSelectedAccount] = useState('');
  
  const accountState = {
    selectedAccount,
    setSelectedAccount
  };

  return (
    <PortfolioContext.Provider value={portfolioData}>
      <AcquisitionContext.Provider value={acquisitionModal}>
        <NavigationContext.Provider value={navigation}>
          <AccountContext.Provider value={accountState}>
            {children}
          </AccountContext.Provider>
        </NavigationContext.Provider>
      </AcquisitionContext.Provider>
    </PortfolioContext.Provider>
  );
};

// Custom hooks to use the contexts
export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};

export const useAcquisition = () => {
  const context = useContext(AcquisitionContext);
  if (!context) {
    throw new Error('useAcquisition must be used within a PortfolioProvider');
  }
  return context;
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a PortfolioProvider');
  }
  return context;
};

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within a PortfolioProvider');
  }
  return context;
};