// src/components/UploadOptions.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Database, ChevronDown } from 'lucide-react';

const UploadOptions = ({ onUploadCSV, onUploadJSON }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Upload className="h-4 w-4" />
        <span>Upload Files</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-10 origin-top-right"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1">
            <button 
              onClick={() => {
                onUploadCSV();
                setIsOpen(false);
              }}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left transition-colors"
              role="menuitem"
            >
              <FileText className="h-4 w-4 mr-2 text-blue-600" />
              <div className="text-left">
                <div className="font-medium">Portfolio Snapshot</div>
                <div className="text-xs text-gray-500">Upload CSV file with current holdings</div>
              </div>
            </button>
            
            <div className="border-t border-gray-100 my-1"></div>
            
            <button 
              onClick={() => {
                onUploadJSON();
                setIsOpen(false);
              }}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left transition-colors"
              role="menuitem"
            >
              <Database className="h-4 w-4 mr-2 text-green-600" />
              <div className="text-left">
                <div className="font-medium">Transaction History</div>
                <div className="text-xs text-gray-500">Upload JSON file with buy/sell history</div>
              </div>
            </button>
          </div>
          
          <div className="border-t border-gray-100 px-4 py-2">
            <div className="flex items-start text-xs text-gray-500">
              <div className="bg-blue-50 text-blue-700 rounded-full w-4 h-4 flex items-center justify-center mr-2 mt-0.5">
                <span>i</span>
              </div>
              <p>Upload transaction history to improve acquisition date and cost basis accuracy.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadOptions;