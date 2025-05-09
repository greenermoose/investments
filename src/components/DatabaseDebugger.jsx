// src/components/DatabaseDebugger.jsx
import React, { useState, useEffect } from 'react';
import { getDBInfo, repairDatabaseVersion } from '../utils/databaseDebugger';

const DatabaseDebugger = () => {
  const [dbInfo, setDbInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [repairStatus, setRepairStatus] = useState(null);

  useEffect(() => {
    loadDatabaseInfo();
  }, []);

  const loadDatabaseInfo = async () => {
    try {
      setIsLoading(true);
      const info = await getDBInfo();
      setDbInfo(info);
      setError(null);
    } catch (err) {
      console.error('Error fetching database info:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepairDatabase = async () => {
    try {
      setRepairStatus('Repairing...');
      await repairDatabaseVersion();
      setRepairStatus('Repair successful! Reloading info...');
      await loadDatabaseInfo();
      setRepairStatus('Database repaired successfully');
    } catch (err) {
      console.error('Error repairing database:', err);
      setRepairStatus(`Repair failed: ${err.message}`);
    }
  };

  if (isLoading) {
    return <div className="p-4 bg-blue-50 rounded-lg">Loading database information...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <p className="text-red-600 font-medium">Error: {error}</p>
        <button 
          onClick={loadDatabaseInfo}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Database Debugger</h2>
      
      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-medium text-yellow-800 mb-2">Database Information</h3>
        <p><span className="font-medium">Name:</span> {dbInfo.name}</p>
        <p><span className="font-medium">Current Version:</span> {dbInfo.version}</p>
        <p><span className="font-medium">Expected Version:</span> {dbInfo.expectedVersion}</p>
        <p><span className="font-medium">Stores:</span> {dbInfo.stores.join(', ')}</p>
        <p><span className="font-medium">Status:</span> {
          dbInfo.version === dbInfo.expectedVersion
            ? <span className="text-green-600">Healthy</span>
            : <span className="text-red-600">Version Mismatch</span>
        }</p>
      </div>

      {dbInfo.version !== dbInfo.expectedVersion && (
        <div className="mb-4">
          <button
            onClick={handleRepairDatabase}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Repair Database Version
          </button>
          <p className="mt-2 text-sm text-gray-600">
            Warning: This will attempt to recreate the database with the correct version.
            Existing data will be preserved but migration will be forced.
          </p>
          {repairStatus && (
            <div className={`mt-2 p-2 rounded ${
              repairStatus.includes('failed') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-800'
            }`}>
              {repairStatus}
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-lg font-medium mb-2">Migration Debug Log</h3>
        <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-64">
          {JSON.stringify(dbInfo.migrationLog || {}, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default DatabaseDebugger;