// components/PortfolioTabs.jsx
import React from 'react';

const PortfolioTabs = ({ tabs, activeTab, onTabChange }) => {
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
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PortfolioTabs;