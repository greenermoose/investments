// hooks/usePortfolioNavigation.js revision: 2
import { useState } from 'react';

export const usePortfolioNavigation = () => {
  const [activeTab, setActiveTab] = useState('overview');
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

  // Add storage-manager to the available tabs
  const tabs = ['overview', 'positions', 'performance', 'analysis', 'history', 'lots', 'account-management', 'storage-manager'];

  return {
    activeTab,
    showUploadModal,
    changeTab,
    openUploadModal,
    closeUploadModal,
    tabs
  };
};