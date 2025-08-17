// src/components/DatabaseDebugger.jsx
import React, { useState, useEffect } from 'react';
import { getDBInfo, repairDatabaseVersion } from '../utils/databaseDebugger';
import { checkDatabaseHealth, repairDatabaseManually, resetDatabase } from '../utils/databaseUtils';

const DatabaseDebugger = () => {
  const [dbInfo, setDbInfo] = useState(null);
  const [dbHealth, setDbHealth] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [repairStatus, setRepairStatus] = useState(null);
  const [healthCheckLoading, setHealthCheckLoading] = useState(false);

  useEffect(() => {
    loadDatabaseInfo();
    checkDatabaseHealthStatus();
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

  const checkDatabaseHealthStatus = async () => {
    try {
      setHealthCheckLoading(true);
      const health = await checkDatabaseHealth();
      setDbHealth(health);
    } catch (err) {
      console.error('Error checking database health:', err);
      setDbHealth({
        status: 'error',
        issues: [`Health check failed: ${err.message}`],
        stores: {}
      });
    } finally {
      setHealthCheckLoading(false);
    }
  };

  const handleRepairDatabase = async () => {
    try {
      setRepairStatus('Repairing...');
      await repairDatabaseVersion();
      setRepairStatus('Repair successful! Reloading info...');
      await loadDatabaseInfo();
      await checkDatabaseHealthStatus();
      setRepairStatus('Database repaired successfully');
    } catch (err) {
      console.error('Error repairing database:', err);
      setRepairStatus(`Repair failed: ${err.message}`);
    }
  };

  const handleRepairIndexes = async () => {
    try {
      setRepairStatus('Repairing database indexes...');
      const result = await repairDatabaseManually();
      if (result.success) {
        setRepairStatus('Index repair successful! Reloading health status...');
        await checkDatabaseHealthStatus();
        setRepairStatus('Database indexes repaired successfully');
      } else {
        setRepairStatus(`Index repair failed: ${result.message}`);
      }
    } catch (err) {
      console.error('Error repairing database indexes:', err);
      setRepairStatus(`Index repair failed: ${err.message}`);
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm('⚠️ WARNING: This will completely delete all your portfolio data and start fresh. This action cannot be undone. Are you sure you want to continue?')) {
      return;
    }
    
    try {
      setRepairStatus('Resetting database completely...');
      const result = await resetDatabase();
      if (result.success) {
        setRepairStatus('Database reset successful! Reloading...');
        await loadDatabaseInfo();
        await checkDatabaseHealthStatus();
        setRepairStatus('Database reset successfully');
      } else {
        setRepairStatus(`Database reset failed: ${result.message}`);
      }
    } catch (err) {
      console.error('Error resetting database:', err);
      setRepairStatus(`Database reset failed: ${err.message}`);
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

      {/* Database Health Status */}
      <div className="mb-4 p-4 border rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-800">Database Health Status</h3>
          <button
            onClick={checkDatabaseHealthStatus}
            disabled={healthCheckLoading}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {healthCheckLoading ? 'Checking...' : 'Refresh'}
          </button>
        </div>
        
        {dbHealth && (
          <div className={`p-3 rounded ${
            dbHealth.status === 'healthy' ? 'bg-green-50 border border-green-200' :
            dbHealth.status === 'needs_repair' ? 'bg-yellow-50 border border-yellow-200' :
            'bg-red-50 border border-red-200'
          }`}>
            <p className="font-medium mb-2">
              Status: {
                dbHealth.status === 'healthy' ? '🟢 Healthy' :
                dbHealth.status === 'needs_repair' ? '🟡 Needs Repair' :
                '🔴 Error'
              }
            </p>
            
            {dbHealth.issues.length > 0 && (
              <div className="mb-3">
                <p className="font-medium text-sm mb-1">Issues Found:</p>
                <ul className="text-sm space-y-1">
                  {dbHealth.issues.map((issue, index) => (
                    <li key={index} className="text-red-700">• {issue}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex gap-2">
              {dbHealth.status === 'needs_repair' && (
                <button
                  onClick={handleRepairIndexes}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                >
                  Repair Missing Indexes
                </button>
              )}
              
              <button
                onClick={handleResetDatabase}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                title="Complete database reset - WARNING: This will delete all data"
              >
                Reset Database
              </button>
            </div>
          </div>
        )}
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
        </div>
      )}

      {repairStatus && (
        <div className={`mt-4 p-3 rounded ${
          repairStatus.includes('failed') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-800'
        }`}>
          {repairStatus}
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