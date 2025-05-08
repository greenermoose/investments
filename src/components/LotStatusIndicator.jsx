// components/LotStatusIndicator.jsx
import React from 'react';

/**
 * Status indicator component with tooltip
 * Used to display the status of lots and transactions in the lot manager
 * 
 * @param {string} type - Status type (e.g., TRANSACTION_VERIFIED, INTERPOLATED)
 * @param {string} tooltipText - Custom tooltip text (optional)
 */
const LotStatusIndicator = ({ type, tooltipText }) => {
  const configs = {
    TRANSACTION_VERIFIED: {
      color: 'green',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      tooltip: 'Verified from transaction history'
    },
    INTERPOLATED: {
      color: 'blue',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      tooltip: 'Interpolated from transaction patterns'
    },
    MANUAL_REQUIRED: {
      color: 'red',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      tooltip: 'Manual entry required'
    },
    TICKER_CHANGE: {
      color: 'orange',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      ),
      tooltip: 'Ticker symbol change detected'
    }
  };

  const config = configs[type] || configs.MANUAL_REQUIRED;

  return (
    <div className="status-indicator group inline-flex items-center">
      <div className={`text-${config.color}-600`}>
        {config.icon}
      </div>
      <div className="status-tooltip">
        {tooltipText || config.tooltip}
      </div>
    </div>
  );
};

export default LotStatusIndicator;