// hooks/usePortfolioNavigation.js
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

  const tabs = ['overview', 'positions', 'performance', 'analysis', 'history', 'lots'];

  return {
    activeTab,
    showUploadModal,
    changeTab,
    openUploadModal,
    closeUploadModal,
    tabs
  };
};