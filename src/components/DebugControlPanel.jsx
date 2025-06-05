import React, { useState, useEffect } from 'react';
import {
  getDebugConfig,
  getDebugCategories,
  setDebugEnabled,
  setAllDebugEnabled,
  setComponentDebugEnabled,
  setAllComponentsEnabled
} from '../utils/debugConfig';
import { Bug, X, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

const DebugControlPanel = () => {
  const [config, setConfig] = useState(getDebugConfig());
  const [categories] = useState(getDebugCategories());
  const [isExpanded, setIsExpanded] = useState(false);
  const [logOutput, setLogOutput] = useState([]);
  const [showStages, setShowStages] = useState(false);

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
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg z-50 w-96">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center space-x-2">
          <Bug className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Debug Panel</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowStages(!showStages)}
            className="text-gray-500 hover:text-gray-700"
            title="Toggle Stages Info"
          >
            {showStages ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-3">
        {/* Global Toggle */}
        <div className="mb-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => handleGlobalToggle(e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span className="font-medium">Enable All Debugging</span>
          </label>
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-2 mb-3">
          <button
            onClick={() => handleAllComponentsToggle(true)}
            className="flex-1 bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600"
          >
            Enable All
          </button>
          <button
            onClick={() => handleAllComponentsToggle(false)}
            className="flex-1 bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600"
          >
            Disable All
          </button>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="space-y-3">
            {/* Component Settings */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Object.entries(categories).map(([component, componentCategories]) => (
                <div key={component} className="border rounded p-2">
                  <label className="flex items-center space-x-2 font-medium">
                    <input
                      type="checkbox"
                      checked={config.components[component]?.enabled}
                      onChange={(e) => handleComponentToggle(component, e.target.checked)}
                      className="form-checkbox h-4 w-4 text-blue-600"
                    />
                    <span className="capitalize text-sm">{component}</span>
                  </label>

                  <div className="ml-6 mt-1 grid grid-cols-2 gap-1">
                    {componentCategories.map((category) => (
                      <label key={category} className="flex items-center space-x-1 text-xs">
                        <input
                          type="checkbox"
                          checked={config.components[component]?.categories[category]}
                          onChange={(e) => handleCategoryToggle(component, category, e.target.checked)}
                          className="form-checkbox h-3 w-3 text-blue-600"
                        />
                        <span className="capitalize">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Log Output */}
            <div className="border rounded">
              <div className="flex items-center justify-between p-2 border-b">
                <h4 className="font-medium text-sm">Debug Logs</h4>
                <button
                  onClick={clearLogs}
                  className="text-gray-500 hover:text-gray-700"
                  title="Clear Logs"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="h-48 overflow-y-auto p-2 bg-gray-50">
                {logOutput.map((log, index) => (
                  <div key={index} className="mb-1 font-mono text-xs">
                    <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className="mx-1">[{log.component}:{log.category}]</span>
                    <span>{log.message}</span>
                    {log.data && (
                      <pre className="mt-1 text-xs bg-gray-100 p-1 rounded">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* File Processing Stages */}
            {showStages && (
              <div className="border rounded p-2">
                <h4 className="font-medium text-sm mb-2">File Processing Stages</h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <h5 className="font-medium">1. File Storage</h5>
                    <pre className="bg-gray-100 p-1 rounded">
                      [file:storage] Starting file save
                      [file:storage] File saved successfully
                    </pre>
                  </div>
                  <div>
                    <h5 className="font-medium">2. File Processing</h5>
                    <pre className="bg-gray-100 p-1 rounded">
                      [file:processing] Starting file processing
                      [file:processing] File processing complete
                    </pre>
                  </div>
                  <div>
                    <h5 className="font-medium">3. Content Parsing</h5>
                    <pre className="bg-gray-100 p-1 rounded">
                      [file:parsing] Starting CSV parsing
                      [file:parsing] CSV parsing complete
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugControlPanel; 