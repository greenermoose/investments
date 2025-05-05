// components/DualFileUploader.jsx revision: 1
import React, { useState, useRef } from 'react';
import { Upload, FileText, Database } from 'lucide-react';

const DualFileUploader = ({ onFileLoaded }) => {
  const [dragStates, setDragStates] = useState({ csv: false, json: false });
  const [uploadStates, setUploadStates] = useState({ csv: null, json: null });
  const csvInputRef = useRef(null);
  const jsonInputRef = useRef(null);

  const handleDragOver = (e, type) => {
    e.preventDefault();
    setDragStates(prev => ({ ...prev, [type]: true }));
  };

  const handleDragLeave = (type) => {
    setDragStates(prev => ({ ...prev, [type]: false }));
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    setDragStates(prev => ({ ...prev, [type]: false }));
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0], type);
    }
  };

  const handleFile = (file, type) => {
    const expectedExtension = type === 'csv' ? '.csv' : '.json';
    
    if (!file.name.toLowerCase().endsWith(expectedExtension)) {
      setUploadStates(prev => ({
        ...prev,
        [type]: {
          status: 'error',
          message: `Please upload a ${type.toUpperCase()} file`
        }
      }));
      return;
    }

    setUploadStates(prev => ({
      ...prev,
      [type]: {
        status: 'processing',
        message: 'Processing file...'
      }
    }));

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        onFileLoaded(e.target.result, file.name);
        setUploadStates(prev => ({
          ...prev,
          [type]: {
            status: 'success',
            message: 'File uploaded successfully!'
          }
        }));
      } catch (error) {
        setUploadStates(prev => ({
          ...prev,
          [type]: {
            status: 'error',
            message: error.message || 'Error processing file'
          }
        }));
      }
    };
    reader.onerror = () => {
      setUploadStates(prev => ({
        ...prev,
        [type]: {
          status: 'error',
          message: 'Error reading file'
        }
      }));
    };
    reader.readAsText(file);
  };

  const renderUploadArea = (type, title, description, icon, buttonColor) => (
    <div
      className={`border-2 border-dashed rounded-lg p-8 hover:border-${buttonColor}-500 transition-colors ${
        dragStates[type] ? `border-${buttonColor}-600 bg-${buttonColor}-50` : `border-${buttonColor}-300`
      }`}
      onDragOver={(e) => handleDragOver(e, type)}
      onDragLeave={() => handleDragLeave(type)}
      onDrop={(e) => handleDrop(e, type)}
    >
      <div className="text-center">
        {icon}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        <ul className="text-sm text-gray-500 mb-4 text-left">
          <li>• Accepts {type.toUpperCase()} files only</li>
          <li>• {type === 'csv' ? 'Contains current position data' : 'Contains transaction history'}</li>
          <li>• {type === 'csv' ? 'Includes symbols, quantities, values' : 'Includes buy/sell transactions'}</li>
        </ul>
        
        <input
          type="file"
          ref={type === 'csv' ? csvInputRef : jsonInputRef}
          className="hidden"
          accept={type === 'csv' ? '.csv' : '.json'}
          onChange={(e) => {
            if (e.target.files[0]) {
              handleFile(e.target.files[0], type);
            }
          }}
        />
        
        <button
          onClick={() => (type === 'csv' ? csvInputRef : jsonInputRef).current.click()}
          className={`bg-${buttonColor}-600 text-white px-6 py-2 rounded-md hover:bg-${buttonColor}-700 transition-colors`}
        >
          Upload {type.toUpperCase()}
        </button>
        
        {uploadStates[type] && (
          <div className={`mt-4 text-sm ${
            uploadStates[type].status === 'error' ? 'text-red-600' :
            uploadStates[type].status === 'success' ? 'text-green-600' :
            'text-blue-600'
          }`}>
            {uploadStates[type].message}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
      {renderUploadArea(
        'csv',
        'Upload Portfolio Snapshot',
        'Upload your current portfolio holdings from a CSV file',
        <FileText className="mx-auto h-12 w-12 text-blue-500 mb-4" />,
        'blue'
      )}
      
      {renderUploadArea(
        'json',
        'Upload Transaction History',
        'Upload your transaction history from a JSON file',
        <Database className="mx-auto h-12 w-12 text-green-500 mb-4" />,
        'green'
      )}
    </div>
  );
};

export default DualFileUploader;