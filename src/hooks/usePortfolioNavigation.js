// hooks/usePortfolioNavigation.js revision: 2
import { useState } from 'react';

export const usePortfolioNavigation = () => {
  const [activeTab, setActiveTab] = useState('portfolio');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const changeTab = (tab) => {
    setActiveTab(tab);
  };

  const openUploadModal = () => {
    setShowUploadModal(true);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
  };

  // Add all available tabs including debug-settings
  const tabs = [
    'portfolio',
    'account-management',
    'transactions',
    'lots',
    'history',
    'storage-manager',
    'security-detail',
    'debug-settings'
  ];

  return {
    activeTab,
    showUploadModal,
    changeTab,
    openUploadModal,
    closeUploadModal,
    tabs
  };
};