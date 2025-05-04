// components/PortfolioTabs.jsx
import React from 'react';

const PortfolioTabs = ({ tabs, activeTab, onTabChange }) => {
  const getTabDisplayName = (tab) => {
    switch (tab) {
      case 'overview':
        return 'Overview';
      case 'positions':
        return 'Positions';
      case 'performance':
        return 'Performance';
      case 'analysis':
        return 'Analysis';
      case 'history':
        return 'History';
      case 'lots':
        return 'Lots';
      case 'account-management':
        return 'Account Management';
      default:
        return tab.charAt(0).toUpperCase() + tab.slice(1);
    }
  };

  return (
    <div className="mb-6 border-b border-gray-200">
      <ul className="flex flex-wrap -mb-px">
        {tabs.map(tab => (
          <li className="mr-2" key={tab}>
            <button 
              className={`inline-block p-4 rounded-t-lg ${activeTab === tab
                ? 'border-b-2 border-indigo-600 text-indigo-600' 
                : 'hover:text-gray-600 hover:border-gray-300'}`}
              onClick={() => onTabChange(tab)}
            >
              {getTabDisplayName(tab)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PortfolioTabs;