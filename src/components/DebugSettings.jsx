import React, { useState, useEffect } from 'react';
import {
  getDebugConfig,
  getDebugCategories,
  setDebugEnabled,
  setAllDebugEnabled,
  setComponentDebugEnabled,
  setAllComponentsEnabled
} from '../utils/debugConfig';

const DebugSettings = () => {
  const [config, setConfig] = useState(getDebugConfig());
  const [categories] = useState(getDebugCategories());
  const [logOutput, setLogOutput] = useState([]);

  // Update local state when debug config changes
  useEffect(() => {
    setConfig(getDebugConfig());
  }, []);

  // Subscribe to debug logs
  useEffect(() => {
    const handleDebugLog = (component, category, message, data) => {
      setLogOutput(prev => [...prev, {
        timestamp: new Date().toISOString(),
        component,
        category,
        message,
        data
      }].slice(-100)); // Keep last 100 logs
    };

    window.addEventListener('debugLog', handleDebugLog);
    return () => window.removeEventListener('debugLog', handleDebugLog);
  }, []);

  const handleGlobalToggle = (enabled) => {
    setAllDebugEnabled(enabled);
    setConfig(getDebugConfig());
  };

  const handleComponentToggle = (component, enabled) => {
    setComponentDebugEnabled(component, enabled);
    setConfig(getDebugConfig());
  };

  const handleCategoryToggle = (component, category, enabled) => {
    setDebugEnabled(component, category, enabled);
    setConfig(getDebugConfig());
  };

  const handleAllComponentsToggle = (enabled) => {
    setAllComponentsEnabled(enabled);
    setConfig(getDebugConfig());
  };

  const clearLogs = () => {
    setLogOutput([]);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Debug Settings</h2>
          <div className="flex space-x-4">
            <button
              onClick={() => handleAllComponentsToggle(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Enable All
            </button>
            <button
              onClick={() => handleAllComponentsToggle(false)}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Disable All
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => handleGlobalToggle(e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span className="text-lg font-medium">Enable All Debugging</span>
          </label>
        </div>

        <div className="space-y-6">
          {Object.entries(categories).map(([component, componentCategories]) => (
            <div key={component} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.components[component]?.enabled}
                    onChange={(e) => handleComponentToggle(component, e.target.checked)}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-lg font-medium capitalize">{component}</span>
                </label>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ml-6">
                {componentCategories.map((category) => (
                  <label key={category} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={config.components[component]?.categories[category]}
                      onChange={(e) => handleCategoryToggle(component, category, e.target.checked)}
                      className="form-checkbox h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm capitalize">{category}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Log Output */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">Debug Logs</h2>
            <button
              onClick={clearLogs}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
            >
              Clear Logs
            </button>
          </div>
          <div className="border rounded-lg p-4 bg-gray-50 h-96 overflow-y-auto">
            {logOutput.map((log, index) => (
              <div key={index} className="mb-2 font-mono text-sm">
                <span className="text-gray-500">{log.timestamp}</span>
                <span className="mx-2">[{log.component}:{log.category}]</span>
                <span>{log.message}</span>
                {log.data && (
                  <pre className="mt-1 text-xs bg-gray-100 p-2 rounded">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* File Processing Stages Info */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">File Processing Stages</h2>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">1. File Storage Stage</h3>
              <pre className="text-sm bg-gray-100 p-2 rounded">
                [file:storage] Starting file save
                [file:storage] Calculated file hash
                [file:storage] Generated file ID
                [file:storage] Saving file record
                [file:storage] File saved successfully
              </pre>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">2. File Processing Stage</h3>
              <pre className="text-sm bg-gray-100 p-2 rounded">
                [file:processing] Starting file processing
                [file:classification] Starting file classification
                [file:classification] Analyzing CSV content
                [file:classification] Found portfolio snapshot headers
                [file:processing] File classified
                [file:processing] Processing as portfolio snapshot
                [file:processing] File processing complete
              </pre>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">3. Content Parsing Stage</h3>
              <pre className="text-sm bg-gray-100 p-2 rounded">
                [file:parsing] Starting CSV parsing
                [file:parsing] Split content into lines
                [file:parsing] Found header row
                [file:parsing] Processing line
                [file:parsing] Parsed line as JSON
                [file:parsing] Created position object
                [file:parsing] CSV parsing complete
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugSettings; 