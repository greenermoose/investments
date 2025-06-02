import React, { useState, useEffect } from 'react';
import { formatDate } from '../utils/dataUtils';
import { portfolioService } from '../services/PortfolioService';
import { Clock } from 'lucide-react';

const SnapshotSelector = ({ currentAccount, selectedDate, onSnapshotSelect }) => {
  const [snapshots, setSnapshots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSnapshots = async () => {
      if (!currentAccount) {
        setSnapshots([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const accountSnapshots = await portfolioService.getAccountSnapshots(currentAccount);
        // Sort snapshots by date, newest first
        const sortedSnapshots = accountSnapshots.sort((a, b) => new Date(b.date) - new Date(a.date));
        setSnapshots(sortedSnapshots);
      } catch (err) {
        console.error('Error loading snapshots:', err);
        setError('Failed to load snapshots');
      } finally {
        setIsLoading(false);
      }
    };

    loadSnapshots();
  }, [currentAccount]);

  if (!currentAccount) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center text-indigo-100 text-sm">
        <Clock className="h-4 w-4 mr-1 animate-spin" />
        Loading snapshots...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-300 text-sm">
        {error}
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="text-indigo-100 text-sm">
        No snapshots available
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Clock className="h-4 w-4 text-indigo-100" />
      <select
        value={selectedDate ? new Date(selectedDate).getTime() : ''}
        onChange={(e) => {
          const snapshot = snapshots.find(s => new Date(s.date).getTime() === parseInt(e.target.value));
          if (snapshot) {
            onSnapshotSelect(snapshot);
          }
        }}
        className="bg-indigo-700 text-indigo-100 text-sm rounded-md px-2 py-1 border border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      >
        {snapshots.map((snapshot) => (
          <option 
            key={new Date(snapshot.date).getTime()} 
            value={new Date(snapshot.date).getTime()}
          >
            {formatDate(snapshot.date)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SnapshotSelector; 