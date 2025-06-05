// components/CSVTester.jsx revision: 1
import React, { useState } from 'react';
import Papa from 'papaparse';
import { extractDateFromAccountInfo } from '../utils/fileProcessing';

const CSVTester = () => {
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);
  const [headers, setHeaders] = useState([]);
  
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      
      try {
        // Show first few lines
        const lines = content.split('\n');
        // console.log('First 5 lines:', lines.slice(0, 5));
        
        // Find header line
        let headerLine = '';
        let headerLineIndex = -1;
        
        for (let i = 0; i < Math.min(5, lines.length); i++) {
          const line = lines[i];
          // console.log(`Line ${i}:`, line);
          
          if (line.includes('"Symbol"') || line.includes('Symbol')) {
            headerLine = line;
            headerLineIndex = i;
            // console.log('Found header at line', i);
            break;
          }
        }
        
        // Parse the header
        if (headerLine) {
          const parsed = Papa.parse(headerLine, {
            delimiter: ",",
            quoteChar: '"'
          });
          
          setHeaders(parsed.data[0] || []);
          
          // Parse first data row
          const firstDataLine = lines[headerLineIndex + 1];
          if (firstDataLine) {
            const dataParsed = Papa.parse(firstDataLine, {
              delimiter: ",",
              quoteChar: '"'
            });
            
            const mappedData = {};
            const headerRow = parsed.data[0] || [];
            const dataRow = dataParsed.data[0] || [];
            
            headerRow.forEach((header, idx) => {
              mappedData[header] = dataRow[idx] || '';
            });
            
            setParsedData(mappedData);
          }
        }
        
        // Extract date
        const date = extractDateFromAccountInfo(lines[0]);
        // console.log('Extracted date:', date);
        
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    };
    
    reader.readAsText(file);
  };
  
  return (
    <div className="mt-8 p-4 border border-gray-300 rounded">
      <h3 className="text-lg font-semibold mb-4">CSV Parser Tester</h3>
      <input 
        type="file" 
        accept=".csv" 
        onChange={handleFileUpload}
        className="mb-4"
      />
      
      {error && (
        <div className="text-red-600 mb-4">Error: {error}</div>
      )}
      
      {headers.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium mb-2">Detected Headers ({headers.length}):</h4>
          <div className="grid grid-cols-3 gap-2">
            {headers.map((header, i) => (
              <div key={i} className="bg-gray-100 p-2 rounded text-sm">
                {header}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {parsedData && (
        <div>
          <h4 className="font-medium mb-2">First Data Row:</h4>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-64">
{JSON.stringify(parsedData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default CSVTester;