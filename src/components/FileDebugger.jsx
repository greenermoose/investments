// components/FileDebugger.jsx revision: 1
import React, { useState } from 'react';
import { parsePortfolioCSV } from '../utils/parseSnapshot';
import { parseDateFromFilename } from '../utils/fileMetadata';

const FileDebugger = () => {
  const [fileInfo, setFileInfo] = useState(null);
  const [parseResults, setParseResults] = useState(null);
  const [error, setError] = useState(null);

  const handleFileDebug = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      
      // File information
      const fileData = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified),
        firstFewLines: content.split('\n').slice(0, 10).join('\n'),
        extractedDate: parseDateFromFilename(file.name)
      };
      setFileInfo(fileData);

      // Try parsing
      try {
        const results = parsePortfolioCSV(content);
        setParseResults(results);
        setError(null);
      } catch (err) {
        setError(err.message);
        setParseResults(null);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="mt-8 p-4 border border-gray-300 rounded">
      <h3 className="text-lg font-semibold mb-4">File Debugger</h3>
      <input 
        type="file" 
        accept=".csv" 
        onChange={handleFileDebug}
        className="mb-4"
      />
      
      {fileInfo && (
        <div className="mb-6">
          <h4 className="font-medium mb-2">File Information:</h4>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
{JSON.stringify(fileInfo, null, 2)}
          </pre>
        </div>
      )}

      {fileInfo?.firstFewLines && (
        <div className="mb-6">
          <h4 className="font-medium mb-2">First 10 lines of file:</h4>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
{fileInfo.firstFewLines}
          </pre>
        </div>
      )}

      {error && (
        <div className="mb-6">
          <h4 className="font-medium mb-2">Error:</h4>
          <div className="bg-red-100 text-red-800 p-3 rounded">
            {error}
          </div>
        </div>
      )}

      {parseResults && (
        <div>
          <h4 className="font-medium mb-2">Parse Results:</h4>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-64">
{JSON.stringify(parseResults, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default FileDebugger;