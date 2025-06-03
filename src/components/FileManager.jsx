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
import '../styles/portfolio.css';
import '../styles/fileManager.css';

const FileManager = ({ onProcessFile, onDataChanged }) => {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'account', direction: 'asc' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFileInfo, setShowFileInfo] = useState(true);
  
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
  
  // Get sorted files
  const getSortedFiles = () => {
    return [...files].sort((a, b) => {
      // Handle null values
      if (!a[sortConfig.key]) return 1;
      if (!b[sortConfig.key]) return -1;
      
      // Sort dates
      if (sortConfig.key === 'fileDate') {
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

  const sortedFiles = getSortedFiles();

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
              <th 
                className="table-header-cell-sortable"
                onClick={() => requestSort('account')}
              >
                Account {sortConfig.key === 'account' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="table-header-cell-sortable"
                onClick={() => requestSort('fileType')}
              >
                Type {sortConfig.key === 'fileType' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="table-header-cell-sortable"
                onClick={() => requestSort('fileDate')}
              >
                Date {sortConfig.key === 'fileDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
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
                <td colSpan="5" className="table-cell-loading">
                  <div className="loading-indicator">
                    <div className="loading-spinner"></div>
                    <span>Loading files...</span>
                  </div>
                </td>
              </tr>
            ) : sortedFiles.length === 0 ? (
              <tr>
                <td colSpan="5" className="table-cell-empty">
                  No files found. Upload some files to get started.
                </td>
              </tr>
            ) : (
              sortedFiles.map(file => (
                <tr key={file.id} className="table-row">
                  <td className="table-cell">
                    {file.account}
                  </td>
                  <td className="table-cell">
                    <div className="file-type-container">
                      {getFileTypeIcon(file.fileType)}
                      <span className="file-type-label">
                        {file.fileType.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell">
                    {file.fileDate ? formatDate(file.fileDate) : 'N/A'}
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
                        <span className="action-label">View</span>
                      </button>
                      {!file.processed && (
                        <button
                          onClick={() => handleProcessFile(file)}
                          className="action-button action-button-process"
                          title="Process file"
                        >
                          <RefreshCw className="action-icon" />
                          <span className="action-label">Process</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="action-button action-button-delete"
                        title="Delete file"
                      >
                        <Trash2 className="action-icon" />
                        <span className="action-label">Delete</span>
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
          <p className="stat-value">{[...new Set(files.map(f => f.account))].length}</p>
        </div>
      </div>
      
      {/* File Details Modal */}
      {selectedFile && (
        <div className="modal">
          <div className="modal-content modal-content-large">
            <div className="modal-header">
              <div className="modal-title-container">
                <div className="modal-title-row">
                  <button
                    onClick={() => setShowFileInfo(!showFileInfo)}
                    className="button button-secondary button-with-icon"
                    title={showFileInfo ? "Hide file information" : "Show file information"}
                  >
                    <svg className="button-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    {showFileInfo ? "Hide Info" : "Show Info"}
                  </button>
                  <h2 className="modal-title">File Details</h2>
                </div>
                <div className="file-info">
                  <div className="file-info-item">
                    <span className="file-info-label">Filename:</span>
                    <span className="file-info-value">{selectedFile.filename}</span>
                  </div>
                  <div className="file-info-item">
                    <span className="file-info-label">Size:</span>
                    <span className="file-info-value">{formatFileSize(selectedFile.fileSize)}</span>
                  </div>
                </div>
              </div>
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
              <div className={`file-details-grid ${!showFileInfo ? 'file-details-grid-no-sidebar' : ''}`}>
                {showFileInfo && (
                  <div className="file-details-sidebar">
                    <div className="file-details-section">
                      <h3 className="file-details-section-title">File Information</h3>
                      <div className="file-details-content">
                        <div className="file-details-item">
                          <span className="file-details-label">Account:</span>
                          <span className="file-details-value">{selectedFile.account}</span>
                        </div>
                        <div className="file-details-item">
                          <span className="file-details-label">Type:</span>
                          <span className="file-details-value">
                            <div className="file-type-container">
                              {getFileTypeIcon(selectedFile.fileType)}
                              <span className="file-type-label">
                                {selectedFile.fileType.toUpperCase()}
                              </span>
                            </div>
                          </span>
                        </div>
                        <div className="file-details-item">
                          <span className="file-details-label">Uploaded:</span>
                          <span className="file-details-value">{formatDate(selectedFile.uploadDate)}</span>
                        </div>
                        {selectedFile.fileDate && (
                          <div className="file-details-item">
                            <span className="file-details-label">File Date:</span>
                            <span className="file-details-value">{formatDate(selectedFile.fileDate)}</span>
                          </div>
                        )}
                        <div className="file-details-item">
                          <span className="file-details-label">Status:</span>
                          <span className="file-details-value">
                            {getProcessedStatusBadge(selectedFile)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="file-preview-container">
                  <div className="file-preview-grid">
                    <div className="file-preview-section">
                      <h3 className="file-preview-title">Raw Data</h3>
                      <div className="file-preview-content-wrapper">
                        <pre className="file-preview-content">
                          {selectedFile.content}
                        </pre>
                      </div>
                    </div>
                    
                    <div className="file-preview-section">
                      <h3 className="file-preview-title">Processed Data</h3>
                      <div className="file-preview-content-wrapper">
                        <pre className="file-preview-content">
                          {selectedFile.processed ? 
                            JSON.stringify(selectedFile.processingResult, null, 2) :
                            'File has not been processed yet'}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
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