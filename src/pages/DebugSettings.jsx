import React, { useState, useEffect } from 'react';
import { debugLog } from '../utils/debugConfig';

const DebugSettings = () => {
  const [config, setConfig] = useState({
    enabled: true,
    components: {
      file: {
        enabled: true,
        categories: {
          storage: true,
          processing: true,
          parsing: true,
          error: true
        }
      },
      portfolio: {
        enabled: true,
        categories: {
          loading: true,
          storage: true,
          calculations: true,
          updates: true
        }
      },
      transactions: {
        enabled: true,
        categories: {
          loading: true,
          processing: true,
          validation: true,
          storage: true
        }
      }
    }
  });

  const [logOutput, setLogOutput] = useState([]);

  useEffect(() => {
    // Subscribe to debug logs
    const handleDebugLog = (component, category, message, data) => {
      setLogOutput(prev => [...prev, {
        timestamp: new Date().toISOString(),
        component,
        category,
        message,
        data
      }].slice(-100)); // Keep last 100 logs
    };

    // Add debug log handler
    window.addEventListener('debugLog', handleDebugLog);
    return () => window.removeEventListener('debugLog', handleDebugLog);
  }, []);

  const handleComponentToggle = (component) => {
    setConfig(prev => ({
      ...prev,
      components: {
        ...prev.components,
        [component]: {
          ...prev.components[component],
          enabled: !prev.components[component].enabled
        }
      }
    }));
  };

  const handleCategoryToggle = (component, category) => {
    setConfig(prev => ({
      ...prev,
      components: {
        ...prev.components,
        [component]: {
          ...prev.components[component],
          categories: {
            ...prev.components[component].categories,
            [category]: !prev.components[component].categories[category]
          }
        }
      }
    }));
  };

  const handleGlobalToggle = () => {
    setConfig(prev => ({
      ...prev,
      enabled: !prev.enabled
    }));
  };

  const clearLogs = () => {
    setLogOutput([]);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Debug Settings</h1>
      
      {/* Global Toggle */}
      <div className="mb-6">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={handleGlobalToggle}
            className="form-checkbox h-5 w-5 text-blue-600"
          />
          <span className="text-lg font-semibold">Enable All Debugging</span>
        </label>
      </div>

      {/* Component Settings */}
      <div className="space-y-6">
        {Object.entries(config.components).map(([component, settings]) => (
          <div key={component} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={() => handleComponentToggle(component)}
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
                <span className="text-lg font-semibold capitalize">{component}</span>
              </label>
            </div>
            
            {/* Categories */}
            <div className="ml-6 space-y-2">
              {Object.entries(settings.categories).map(([category, enabled]) => (
                <label key={category} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => handleCategoryToggle(component, category)}
                    className="form-checkbox h-4 w-4 text-blue-600"
                    disabled={!settings.enabled}
                  />
                  <span className="capitalize">{category}</span>
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
  );
};

export default DebugSettings; 