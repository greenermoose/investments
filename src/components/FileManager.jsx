// src/components/FileManager.jsx (Refactored with Semantic CSS Classes)
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
import '../styles/base.css';
import '../styles/fileManager.css';

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
        return <FileText className="file-icon file-icon-csv" />;
      case 'json':
        return <Database className="file-icon file-icon-json" />;
      default:
        return <FileText className="file-icon file-icon-default" />;
    }
  };
  
  const getProcessedStatusBadge = (file) => {
    if (!file.processed) {
      return (
        <span className="status-badge status-badge-pending">
          <Clock className="status-icon" />
          Unprocessed
        </span>
      );
    }
    
    const success = file.processingResult && !file.processingResult.error;
    return success ? (
      <span className="status-badge status-badge-success">
        <CheckCircle className="status-icon" />
        Processed
      </span>
    ) : (
      <span className="status-badge status-badge-error">
        <XCircle className="status-icon" />
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
    <div className="file-manager-container">
      <div className="file-manager-header">
        <h2 className="file-manager-title">File Manager</h2>
        <button
          onClick={loadFiles}
          className="button button-secondary button-with-icon"
        >
          <RefreshCw className="button-icon" />
          Refresh
        </button>
      </div>
      
      {/* Migration alert */}
      {migrationStatus && migrationStatus.migrated && missingFiles.length > 0 && (
        <MissingFilesAlert missingFiles={missingFiles} onClearAlert={() => setMissingFiles([])} />
      )}
      
      {/* Filters */}
      <div className="file-manager-filters">
        <div className="filter-group">
          <label className="filter-label">
            File Type
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="csv">Portfolio CSV</option>
            <option value="json">Transaction JSON</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label className="filter-label">
            Account
          </label>
          <select
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            className="filter-select"
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
        <div className="alert alert-error">
          {error}
        </div>
      )}
      
      {/* Files table */}
      <div className="table-container">
        <table className="data-table">
          <thead className="table-header">
            <tr>
              <th className="table-header-cell">
                Type
              </th>
              <th 
                className="table-header-cell-sortable"
                onClick={() => requestSort('filename')}
              >
                Filename {sortConfig.key === 'filename' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="table-header-cell-sortable"
                onClick={() => requestSort('account')}
              >
                Account {sortConfig.key === 'account' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="table-header-cell-sortable"
                onClick={() => requestSort('fileDate')}
              >
                File Date {sortConfig.key === 'fileDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="table-header-cell-sortable"
                onClick={() => requestSort('uploadDate')}
              >
                Upload Date {sortConfig.key === 'uploadDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="table-header-cell">
                Size
              </th>
              <th className="table-header-cell">
                Status
              </th>
              <th className="table-header-cell">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="table-body">
            {isLoading ? (
              <tr>
                <td colSpan="8" className="table-cell-loading">
                  <div className="loading-indicator">
                    <div className="loading-spinner"></div>
                    <span>Loading files...</span>
                  </div>
                </td>
              </tr>
            ) : sortedFilteredFiles.length === 0 ? (
              <tr>
                <td colSpan="8" className="table-cell-empty">
                  No files found. Upload some files to get started.
                </td>
              </tr>
            ) : (
              sortedFilteredFiles.map(file => (
                <tr key={file.id} className="table-row">
                  <td className="table-cell">
                    <div className="file-type-container">
                      {getFileTypeIcon(file.fileType)}
                      <span className="file-type-label">
                        {file.fileType.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell">
                    {file.filename}
                  </td>
                  <td className="table-cell">
                    {file.account}
                  </td>
                  <td className="table-cell">
                    {file.fileDate ? formatDate(file.fileDate) : 'N/A'}
                  </td>
                  <td className="table-cell">
                    {formatDate(file.uploadDate)}
                  </td>
                  <td className="table-cell">
                    {formatFileSize(file.fileSize)}
                  </td>
                  <td className="table-cell">
                    {getProcessedStatusBadge(file)}
                  </td>
                  <td className="table-cell">
                    <div className="action-button-group">
                      <button
                        onClick={() => handleViewFile(file.id)}
                        className="action-button action-button-view"
                        title="View file details"
                      >
                        <Eye className="action-icon" />
                      </button>
                      {!file.processed && (
                        <button
                          onClick={() => handleProcessFile(file)}
                          className="action-button action-button-process"
                          title="Process file"
                        >
                          <RefreshCw className="action-icon" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="action-button action-button-delete"
                        title="Delete file"
                      >
                        <Trash2 className="action-icon" />
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
      <div className="stats-container">
        <div className="stat-card stat-card-primary">
          <p className="stat-label">Total Files</p>
          <p className="stat-value">{files.length}</p>
        </div>
        <div className="stat-card stat-card-success">
          <p className="stat-label">CSV Files</p>
          <p className="stat-value">{files.filter(f => f.fileType === 'csv').length}</p>
        </div>
        <div className="stat-card stat-card-info">
          <p className="stat-label">JSON Files</p>
          <p className="stat-value">{files.filter(f => f.fileType === 'json').length}</p>
        </div>
        <div className="stat-card stat-card-warning">
          <p className="stat-label">Accounts</p>
          <p className="stat-value">{uniqueAccounts.length}</p>
        </div>
      </div>
      
      {/* File Details Modal */}
      {selectedFile && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">File Details</h2>
              <button
                onClick={() => setSelectedFile(null)}
                className="modal-close"
              >
                <svg className="modal-close-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="file-details">
              <div className="file-details-header">
                {getFileTypeIcon(selectedFile.fileType)}
                <span className="file-name">{selectedFile.filename}</span>
              </div>
              <p className="file-meta">Account: {selectedFile.account}</p>
              <p className="file-meta">
                Uploaded: {formatDate(selectedFile.uploadDate)}
              </p>
              {selectedFile.fileDate && (
                <p className="file-meta">
                  File Date: {formatDate(selectedFile.fileDate)}
                </p>
              )}
              <p className="file-meta">Size: {formatFileSize(selectedFile.fileSize)}</p>
            </div>
            
            <div className="file-preview-container">
              <h3 className="file-preview-title">File Preview</h3>
              <div className="file-preview">
                {selectedFile.content.slice(0, 1000)}
                {selectedFile.content.length > 1000 && '...'}
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                onClick={() => setSelectedFile(null)}
                className="button button-secondary"
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