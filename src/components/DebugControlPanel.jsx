import React, { useState, useEffect } from 'react';
import {
  getDebugConfig,
  getDebugCategories,
  setDebugEnabled,
  setAllDebugEnabled,
  setComponentDebugEnabled,
  setAllComponentsEnabled
} from '../utils/debugConfig';

const DebugControlPanel = () => {
  const [config, setConfig] = useState(getDebugConfig());
  const [categories] = useState(getDebugCategories());
  const [isExpanded, setIsExpanded] = useState(false);

  // Update local state when debug config changes
  useEffect(() => {
    setConfig(getDebugConfig());
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

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Debug Controls</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-500 hover:text-gray-700"
        >
          {isExpanded ? '▼' : '▲'}
        </button>
      </div>

      <div className="mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => handleGlobalToggle(e.target.checked)}
            className="form-checkbox"
          />
          <span>Enable All Debugging</span>
        </label>
      </div>

      {isExpanded && (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <div className="mb-4">
            <button
              onClick={() => handleAllComponentsToggle(true)}
              className="bg-blue-500 text-white px-2 py-1 rounded mr-2"
            >
              Enable All Components
            </button>
            <button
              onClick={() => handleAllComponentsToggle(false)}
              className="bg-red-500 text-white px-2 py-1 rounded"
            >
              Disable All Components
            </button>
          </div>

          {Object.entries(categories).map(([component, componentCategories]) => (
            <div key={component} className="border-b pb-2">
              <label className="flex items-center space-x-2 font-medium">
                <input
                  type="checkbox"
                  checked={config.components[component]?.enabled}
                  onChange={(e) => handleComponentToggle(component, e.target.checked)}
                  className="form-checkbox"
                />
                <span className="capitalize">{component}</span>
              </label>

              <div className="ml-6 mt-2 grid grid-cols-2 gap-2">
                {componentCategories.map((category) => (
                  <label key={category} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={config.components[component]?.categories[category]}
                      onChange={(e) => handleCategoryToggle(component, category, e.target.checked)}
                      className="form-checkbox"
                    />
                    <span className="capitalize">{category}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DebugControlPanel; 