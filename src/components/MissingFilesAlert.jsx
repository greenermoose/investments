// src/components/MissingFilesAlert.jsx
import React, { useState } from 'react';
import { formatDate } from '../utils/dataUtils';
import { AlertTriangle, X } from 'lucide-react';

const MissingFilesAlert = ({ missingFiles, onClearAlert }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!missingFiles || missingFiles.length === 0) return null;

  return (
    <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm text-yellow-700 font-medium">
              Missing Original Files Detected
            </p>
            <button
              onClick={onClearAlert}
              className="ml-auto flex-shrink-0 text-yellow-400 hover:text-yellow-500 focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            We found {missingFiles.length} portfolios in your database that don't have the original source files stored.
            To ensure full compatibility with the new storage system, please upload the original files again.
          </p>
          
          <div className="mt-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm text-yellow-700 underline focus:outline-none"
            >
              {expanded ? 'Hide details' : 'Show details'}
            </button>
          </div>
          
          {expanded && (
            <div className="mt-3 text-sm text-yellow-700">
              <p className="font-medium mb-1">Missing files:</p>
              <ul className="space-y-1 pl-5 list-disc">
                {missingFiles.slice(0, 5).map((file, index) => (
                  <li key={index}>
                    {file.accountName} ({formatDate(file.portfolioDate)})
                  </li>
                ))}
                {missingFiles.length > 5 && (
                  <li>...and {missingFiles.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
          
          <p className="text-sm text-yellow-700 mt-3">
            Your data is still accessible, but storing the original files provides better data integrity
            and allows re-processing if needed.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MissingFilesAlert;