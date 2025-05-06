// components/AccountManagement.jsx revision: 1
import React, { useState, useEffect } from 'react';
import { 
  getAllAccounts, 
  getAccountSnapshots, 
  deletePortfolioSnapshot,
  deleteAccount
} from '../utils/portfolioStorage';
import { formatDate } from '../utils/dataUtils';
import SnapshotCard from './SnapshotCard';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import BackupManager from './BackupManager';

const AccountManagement = ({ onDataChange }) => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [snapshots, setSnapshots] = useState([]);
  const [selectedSnapshots, setSelectedSnapshots] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    type: 'snapshot', // 'snapshot' or 'account'
    title: '',
    message: '',
    onConfirm: null
  });
  
  useEffect(() => {
    loadAccounts();
  }, []);
  
  useEffect(() => {
    if (selectedAccount) {
      loadSnapshots();
    }
  }, [selectedAccount]);
  
  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      const accountList = await getAllAccounts();
      setAccounts(accountList);
      if (accountList.length > 0 && !selectedAccount) {
        setSelectedAccount(accountList[0]);
      }
      setError(null);
    } catch (err) {
      console.error('Error loading accounts:', err);
      setError('Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadSnapshots = async () => {
    try {
      setIsLoading(true);
      const accountSnapshots = await getAccountSnapshots(selectedAccount);
      const sortedSnapshots = accountSnapshots.sort((a, b) => new Date(b.date) - new Date(a.date));
      setSnapshots(sortedSnapshots);
      setSelectedSnapshots(new Set());
      setError(null);
    } catch (err) {
      console.error('Error loading snapshots:', err);
      setError('Failed to load snapshots');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSnapshotSelection = (snapshotId, isSelected) => {
    const newSelected = new Set(selectedSnapshots);
    if (isSelected) {
      newSelected.add(snapshotId);
    } else {
      newSelected.delete(snapshotId);
    }
    setSelectedSnapshots(newSelected);
  };
  
  const handleBulkSelect = () => {
    if (selectedSnapshots.size === snapshots.length) {
      setSelectedSnapshots(new Set());
    } else {
      setSelectedSnapshots(new Set(snapshots.map(s => s.id)));
    }
  };
  
  const handleDeleteSnapshot = (snapshotId) => {
    const snapshot = snapshots.find(s => s.id === snapshotId);
    if (!snapshot) return;
    
    setDeleteModal({
      isOpen: true,
      type: 'snapshot',
      title: 'Delete Snapshot',
      message: `Are you sure you want to delete the snapshot from ${formatDate(snapshot.date)}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deletePortfolioSnapshot(snapshotId);
          
          // Check if this was the last snapshot
          const remainingSnapshots = snapshots.filter(s => s.id !== snapshotId);
          if (remainingSnapshots.length === 0) {
            // Show warning about account deletion
            setDeleteModal({
              isOpen: true,
              type: 'account',
              title: 'Account Will Be Removed',
              message: `This was the last snapshot for ${selectedAccount}. The account will be removed from the system.`,
              onConfirm: async () => {
                await deleteAccount(selectedAccount);
                await loadAccounts();
                setDeleteModal({ isOpen: false });
                onDataChange?.();
              }
            });
          } else {
            await loadSnapshots();
            onDataChange?.();
          }
        } catch (err) {
          console.error('Error deleting snapshot:', err);
          setError('Failed to delete snapshot');
          setDeleteModal({ isOpen: false });
        }
      }
    });
  };
  
  const handleBulkDelete = () => {
    const count = selectedSnapshots.size;
    if (count === 0) return;
    
    setDeleteModal({
      isOpen: true,
      type: 'snapshot',
      title: `Delete ${count} Snapshot${count > 1 ? 's' : ''}`,
      message: `Are you sure you want to delete ${count} snapshot${count > 1 ? 's' : ''}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const deletePromises = Array.from(selectedSnapshots).map(snapshotId => 
            deletePortfolioSnapshot(snapshotId)
          );
          await Promise.all(deletePromises);
          
          // Check if account should be deleted
          if (selectedSnapshots.size === snapshots.length) {
            setDeleteModal({
              isOpen: true,
              type: 'account',
              title: 'Account Will Be Removed',
              message: `You've deleted all snapshots for ${selectedAccount}. The account will be removed from the system.`,
              onConfirm: async () => {
                await deleteAccount(selectedAccount);
                await loadAccounts();
                setDeleteModal({ isOpen: false });
                onDataChange?.();
              }
            });
          } else {
            await loadSnapshots();
            onDataChange?.();
          }
        } catch (err) {
          console.error('Error deleting snapshots:', err);
          setError('Failed to delete some snapshots');
          setDeleteModal({ isOpen: false });
        }
      }
    });
  };
  
  const getAccountStatus = () => {
    if (!selectedAccount) return null;
    
    const snapshotCount = snapshots.length;
    if (snapshotCount === 0) {
      return (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                This account has no snapshots. This may indicate a data corruption issue.
              </p>
            </div>
          </div>
        </div>
      );
    }
    
    const latestSnapshot = snapshots[0];
    return (
      <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-green-700">
              {snapshotCount} snapshot{snapshotCount > 1 ? 's' : ''} available. 
              {latestSnapshot && ` Latest: ${formatDate(latestSnapshot.date)}`}
            </p>
          </div>
        </div>
      </div>
    );
  };
  
  if (isLoading && accounts.length === 0) {
    return <div className="text-center py-8">Loading accounts...</div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-semibold mb-6">Account Management</h1>
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="block w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
            >
              {accounts.map(account => (
                <option key={account} value={account}>{account}</option>
              ))}
            </select>
            
            {snapshots.length > 0 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBulkSelect}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {selectedSnapshots.size === snapshots.length ? 'Deselect All' : 'Select All'}
                </button>
                
                {selectedSnapshots.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="px-4 py-2 border border-red-300 text-red-700 rounded-md text-sm font-medium hover:bg-red-50"
                  >
                    Delete Selected ({selectedSnapshots.size})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {getAccountStatus()}
        
        {selectedAccount && (
          <div>
            <h2 className="text-lg font-medium mb-4">Snapshots</h2>
            {snapshots.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No snapshots found for this account</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {snapshots.map(snapshot => (
                  <SnapshotCard
                    key={snapshot.id}
                    snapshot={snapshot}
                    isSelected={selectedSnapshots.has(snapshot.id)}
                    onSelect={handleSnapshotSelection}
                    onDelete={handleDeleteSnapshot}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      <BackupManager onImportComplete={() => {
        loadAccounts();
        onDataChange?.();
      }} />
      
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false })}
        onConfirm={deleteModal.onConfirm}
        title={deleteModal.title}
        message={deleteModal.message}
        type={deleteModal.type === 'account' ? 'warning' : 'danger'}
      />
    </div>
  );
};

export default AccountManagement;