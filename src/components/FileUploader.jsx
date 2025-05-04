// components/FileUploader.jsx
import React, { useState, useRef } from 'react';
import { parseDateFromFilename } from '../utils/dateUtils';

const FileUploader = ({ onFileLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current.click();
  };

  const processFile = (file) => {
    setError(null);
    
    // Check if file is CSV
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }
    
    // Check file size (optional)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('File size too large. Please upload a file smaller than 10MB');
      return;
    }
    
    setFileName(file.name);
    
    // Extract date from filename if present
    const portfolioDate = parseDateFromFilename(file.name);
    
    // Read file contents
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const fileContent = event.target.result;
        
        // Check if file is empty
        if (!fileContent || fileContent.trim().length === 0) {
          setError('The file appears to be empty. Please check the file and try again.');
          return;
        }
        
        onFileLoaded(fileContent, file.name, portfolioDate);
      } catch (err) {
        console.error('Error processing file:', err);
        setError('Error processing file. Please check the format.');
      }
    };
    reader.onerror = () => {
      setError(`Error reading file: ${reader.error}`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="mb-6">
      <div 
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${
          isDragging ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-indigo-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleButtonClick}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".csv" 
          onChange={handleFileInputChange} 
        />
        <div className="flex flex-col items-center justify-center">
          <svg 
            className="w-12 h-12 text-gray-400 mb-3" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="mb-2 text-sm text-gray-700">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">CSV files only</p>
          {fileName && <p className="mt-2 text-sm text-indigo-600">{fileName}</p>}
        </div>
      </div>
      {error && (
        <div className="mt-2 text-red-600 text-sm">{error}</div>
      )}
    </div>
  );
};

export default FileUploader;