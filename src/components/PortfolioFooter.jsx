// components/PortfolioFooter.jsx revision: 1
import React from 'react';
import { formatDate } from '../utils/dataUtils';

const PortfolioFooter = ({ portfolioDate }) => {
  return (
    <footer className="bg-gray-800 text-white p-4 mt-auto">
      <div className="container mx-auto text-center">
        <p>Investment Portfolio Manager | {portfolioDate ? `Data as of ${formatDate(portfolioDate)}` : 'Upload your data to get started'}</p>
        <p className="text-xs mt-1">Disclaimer: This tool is for informational purposes only and does not constitute investment advice.</p>
      </div>
    </footer>
  );
};

export default PortfolioFooter;