// src/components/FileManager.jsx
import React, { useState, useEffect } from 'react';
import { 
  getAllFiles, 
  deleteFile, 
  getFileById, 
  migrateFromOldStorage,
  replaceFile 
} from '../utils/fileStorage';
import { formatDate, formatFileSize } from '../utils/dataUtils';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import DuplicateFileModal from './DuplicateFileModal';
import MissingFilesAlert from './MissingFilesAlert';
import { FileText, Database, Trash2, Eye, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';

const FileManager = ({ onProcessFile, onDataChanged }) => {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'uploadDate', direction: 'desc' });
  const [filterType, setFilterType] = useState('all');
  const [filterAccount, setFilterAccount] = useState('');
  const [uniqueAccounts, setUniqueAccounts] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Modals
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, fileId: null });
  const [duplicateModal, setDuplicateModal] = useState({ 
    isOpen: false, 
    existingFile: null, 
    newContent: null,
    newFileDate: null,
    onResolve: null 
  });
  
  // Migration state
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [missingFiles, setMissingFiles] = useState([]);

  useEffect(() => {
    loadFiles();
    checkMigration();
  }, []);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      const allFiles = await getAllFiles();
      setFiles(allFiles);
      
      // Extract unique accounts for filtering
      const accounts = [...new Set(allFiles.map(file => file.account))];
      setUniqueAccounts(accounts);
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading files:', err);
      setError('Failed to load files');
      setIsLoading(false);
    }
  };

  const checkMigration = async () => {
    try {
      const migrationResult = await migrateFromOldStorage();
      setMigrationStatus(migrationResult);
      
      if (migrationResult.missingFiles && migrationResult.missingFiles.length > 0) {
        setMissingFiles(migrationResult.missingFiles);
      }
    } catch (err) {
      console.error('Error checking migration:', err);
    }
  };

  const handleDeleteFile = async (fileId) => {
    setDeleteModal({ isOpen: true, fileId });
  };
  
  const confirmDelete = async () => {
    if (!deleteModal.fileId) return;
    
    try {
      await deleteFile(deleteModal.fileId);
      setFiles(files.filter(file => file.id !== deleteModal.fileId));
      setDeleteModal({ isOpen: false, fileId: null });
      
      if (onDataChanged) {
        onDataChanged();
      }
    } catch (err) {
      console.error('Error deleting file:', err);
      setError('Failed to delete file');
    }
  };
  
  const handleViewFile = async (fileId) => {
    try {
      const file = await getFileById(fileId);
      setSelectedFile(file);
    } catch (err) {
      console.error('Error retrieving file:', err);
      setError('Failed to retrieve file');
    }
  };
  
  const handleProcessFile = (file) => {
    if (onProcessFile) {
      onProcessFile(file);
    }
  };
  
  const handleReplaceDuplicate = async (existingFileId, newContent, newFileDate) => {
    try {
      await replaceFile(existingFileId, newContent, newFileDate);
      
      // Refresh file list
      await loadFiles();
      
      setDuplicateModal({ isOpen: false, existingFile: null, newContent: null, newFileDate: null, onResolve: null });
      
      if (onDataChanged) {
        onDataChanged();
      }
    } catch (err) {
      console.error('Error replacing file:', err);
      setError('Failed to replace file');
    }
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const getFileTypeIcon = (fileType) => {
    switch (fileType) {
      case 'csv':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'json':
        return <Database className="h-5 w-5 text-green-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const getProcessedStatusBadge = (file) => {
    if (!file.processed) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          Unprocessed
        </span>
      );
    }
    
    const success = file.processingResult && !file.processingResult.error;
    return success ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Processed
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircle className="h-3 w-3 mr-1" />
        Error
      </span>
    );
  };
  
  // Get sorted and filtered files
  const getSortedFilteredFiles = () => {
    return [...files]
      .filter(file => {
        // Filter by type
        if (filterType !== 'all' && file.fileType !== filterType) {
          return false;
        }
        
        // Filter by account
        if (filterAccount && file.account !== filterAccount) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        // Handle null values
        if (!a[sortConfig.key]) return 1;
        if (!b[sortConfig.key]) return -1;
        
        // Sort dates
        if (sortConfig.key === 'uploadDate' || sortConfig.key === 'fileDate' || sortConfig.key === 'lastAccessed') {
          const dateA = new Date(a[sortConfig.key]);
          const dateB = new Date(b[sortConfig.key]);
          
          return sortConfig.direction === 'asc' 
            ? dateA - dateB 
            : dateB - dateA;
        }
        
        // Sort strings
        const aValue = a[sortConfig.key].toString().toLowerCase();
        const bValue = b[sortConfig.key].toString().toLowerCase();
        
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      });
  };

  const sortedFilteredFiles = getSortedFilteredFiles();

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">File Manager</h2>
        <button
          onClick={loadFiles}
          className="flex items-center px-4 py-2 text-sm text-indigo-600 border border-indigo-300 rounded hover:bg-indigo-50"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>
      
      {/* Migration alert */}
      {migrationStatus && migrationStatus.migrated && missingFiles.length > 0 && (
        <MissingFilesAlert missingFiles={missingFiles} onClearAlert={() => setMissingFiles([])} />
      )}
      
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            File Type
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          >
            <option value="all">All Types</option>
            <option value="csv">Portfolio CSV</option>
            <option value="json">Transaction JSON</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account
          </label>
          <select
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          >
            <option value="">All Accounts</option>
            {uniqueAccounts.map(account => (
              <option key={account} value={account}>{account}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {/* Files table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('filename')}
              >
                Filename {sortConfig.key === 'filename' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('account')}
              >
                Account {sortConfig.key === 'account' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('fileDate')}
              >
                File Date {sortConfig.key === 'fileDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('uploadDate')}
              >
                Upload Date {sortConfig.key === 'uploadDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mr-2"></div>
                    <span>Loading files...</span>
                  </div>
                </td>
              </tr>
            ) : sortedFilteredFiles.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                  No files found. Upload some files to get started.
                </td>
              </tr>
            ) : (
              sortedFilteredFiles.map(file => (
                <tr key={file.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getFileTypeIcon(file.fileType)}
                      <span className="ml-2 text-sm text-gray-900">
                        {file.fileType.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {file.filename}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {file.account}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {file.fileDate ? formatDate(file.fileDate) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(file.uploadDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatFileSize(file.fileSize)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getProcessedStatusBadge(file)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewFile(file.id)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="View file details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      {!file.processed && (
                        <button
                          onClick={() => handleProcessFile(file)}
                          className="text-green-600 hover:text-green-900"
                          title="Process file"
                        >
                          <RefreshCw className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete file"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Statistics */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-sm text-blue-800 font-medium">Total Files</p>
          <p className="text-2xl font-bold">{files.length}</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <p className="text-sm text-green-800 font-medium">CSV Files</p>
          <p className="text-2xl font-bold">{files.filter(f => f.fileType === 'csv').length}</p>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg">
          <p className="text-sm text-purple-800 font-medium">JSON Files</p>
          <p className="text-2xl font-bold">{files.filter(f => f.fileType === 'json').length}</p>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg">
          <p className="text-sm text-yellow-800 font-medium">Accounts</p>
          <p className="text-2xl font-bold">{uniqueAccounts.length}</p>
        </div>
      </div>
      
      {/* File Details Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">File Details</h2>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center mb-2">
                {getFileTypeIcon(selectedFile.fileType)}
                <span className="ml-2 text-lg font-medium">{selectedFile.filename}</span>
              </div>
              <p className="text-sm text-gray-600">Account: {selectedFile.account}</p>
              <p className="text-sm text-gray-600">
                Uploaded: {formatDate(selectedFile.uploadDate)}
              </p>
              {selectedFile.fileDate && (
                <p className="text-sm text-gray-600">
                  File Date: {formatDate(selectedFile.fileDate)}
                </p>
              )}
              <p className="text-sm text-gray-600">Size: {formatFileSize(selectedFile.fileSize)}</p>
            </div>
            
            <div className="mt-4">
              <h3 className="font-medium text-gray-900 mb-2">File Preview</h3>
              <div className="bg-gray-50 p-3 rounded border border-gray-200 overflow-auto max-h-64 text-sm font-mono whitespace-pre-wrap">
                {selectedFile.content.slice(0, 1000)}
                {selectedFile.content.length > 1000 && '...'}
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedFile(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={confirmDelete}
        title="Delete File"
        message="Are you sure you want to delete this file? This action cannot be undone."
      />
      
      {/* Duplicate File Modal */}
      <DuplicateFileModal
        isOpen={duplicateModal.isOpen}
        existingFile={duplicateModal.existingFile}
        onClose={() => setDuplicateModal({ 
          ...duplicateModal, 
          isOpen: false, 
          existingFile: null, 
          newContent: null,
          newFileDate: null 
        })}
        onReplace={() => {
          if (duplicateModal.existingFile && duplicateModal.newContent) {
            handleReplaceDuplicate(
              duplicateModal.existingFile.id, 
              duplicateModal.newContent,
              duplicateModal.newFileDate
            );
          }
        }}
        onKeepBoth={() => {
          // If we have an onResolve callback, call it with 'keepBoth'
          if (duplicateModal.onResolve) {
            duplicateModal.onResolve('keepBoth');
          }
          setDuplicateModal({ 
            ...duplicateModal, 
            isOpen: false, 
            existingFile: null, 
            newContent: null,
            newFileDate: null 
          });
        }}
      />
    </div>
  );
};

export default FileManager;