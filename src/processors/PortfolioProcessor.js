async processPortfolioSnapshot(snapshotData) {
  console.log('PortfolioProcessor - Processing snapshot with data:', {
    fileId: snapshotData.fileId,
    fileHash: snapshotData.fileHash,
    fileName: snapshotData.fileName,
    uploadDate: snapshotData.uploadDate,
    accountName: snapshotData.accountName
  });
  
  // ... existing code ...
  
  const savedSnapshot = await this.saveSnapshot(snapshot);
  console.log('PortfolioProcessor - Snapshot saved with file reference:', {
    snapshotId: savedSnapshot.id,
    hasFileReference: !!savedSnapshot.sourceFile,
    fileReferenceDetails: savedSnapshot.sourceFile
  });
  
  return savedSnapshot;
} 