// components/PortfolioDemo.jsx revision: 1
import React from 'react';
import { downloadSampleCSV } from '../utils/sampleData';

const PortfolioDemo = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h2 className="text-xl font-semibold mb-2">First Time User?</h2>
      <p className="mb-4">Don't have your own portfolio data to upload? You can generate a sample portfolio CSV file to test the application.</p>
      <button
        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
        onClick={downloadSampleCSV}
      >
        Download Sample CSV
      </button>
      <div className="mt-4 text-sm text-gray-600">
        <p>The sample data contains a diversified portfolio with stocks, ETFs, and bonds.</p>
        <p className="mt-2">After downloading, you can upload the file using the file uploader above to see the portfolio analysis in action.</p>
      </div>
    </div>
  );
};

export default PortfolioDemo;