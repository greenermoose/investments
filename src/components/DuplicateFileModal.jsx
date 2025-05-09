// src/components/DuplicateFileModal.jsx
import React from 'react';
import { formatDate, formatFileSize } from '../utils/dataUtils';

const DuplicateFileModal = ({
  isOpen,
  existingFile,
  onClose,
  onReplace,
  onKeepBoth
}) => {
  if (!isOpen || !existingFile) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg
              className="h-6 w-6 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">File Already Exists</h3>
          </div>
        </div>
        
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            A file with the same name already exists. What would you like to do?
          </p>
          
          <div className="mt-4 bg-yellow-50 p-3 rounded border border-yellow-200">
            <h4 className="font-medium text-yellow-800">Existing File</h4>
            <p className="text-sm text-yellow-700">Name: {existingFile.filename}</p>
            <p className="text-sm text-yellow-700">Uploaded: {formatDate(existingFile.uploadDate)}</p>
            <p className="text-sm text-yellow-700">Size: {formatFileSize(existingFile.fileSize)}</p>
            {existingFile.fileDate && (
              <p className="text-sm text-yellow-700">
                File Date: {formatDate(existingFile.fileDate)}
              </p>
            )}
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onKeepBoth}
            className="px-4 py-2 border border-indigo-300 rounded-md text-sm font-medium text-indigo-700 hover:bg-indigo-50"
          >
            Keep Both
          </button>
          <button
            onClick={onReplace}
            className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700"
          >
            Replace
          </button>
        </div>
      </div>
    </div>
  );
};

export default DuplicateFileModal;