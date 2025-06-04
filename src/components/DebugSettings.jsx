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
      </div>
    </div>
  );
};

export default DebugSettings; 