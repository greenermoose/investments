// components/UploadModal.jsx
import React from 'react';
import FileUploader from './FileUploader';

const UploadModal = ({ isOpen, onClose, onFileLoaded }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Upload Additional Portfolio</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <p className="text-gray-600 mb-4">
          Upload another portfolio CSV file to compare with your existing data.
        </p>
        <FileUploader onFileLoaded={onFileLoaded} />
      </div>
    </div>
  );
};

export default UploadModal;