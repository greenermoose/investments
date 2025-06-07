# Filename Convention Standardization Plan

## Overview
This plan outlines the steps to standardize the filename convention across the entire application, moving from inconsistent usage of `filename`, `fileName`, `file_name`, and `file-name` to a single standard: `fileName` (camelCase with capital N).

## Phase 1: Preparation and Testing Infrastructure

### 1. Create Migration Branch
```bash
git checkout -b feature/standardize-filename-convention
```

### 2. Add ESLint Rule
```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'camelcase': ['error', { 
      properties: 'never',
      allow: ['^filename$'] // Temporarily allow filename for migration
    }],
    'custom/filename-convention': ['error', {
      message: 'Use fileName instead of filename for file name properties'
    }]
  }
};
```

### 3. Create Test Suite
```javascript
// tests/filenameConvention.test.js
describe('Filename Convention', () => {
  test('FileReference uses fileName', () => {
    const ref = createFileReference({ fileId: '1', fileHash: 'hash', fileName: 'test.csv' });
    expect(ref.fileName).toBeDefined();
    expect(ref.filename).toBeUndefined();
  });

  test('File storage mapping works', () => {
    const dbRecord = { filename: 'test.csv', fileId: '1', fileHash: 'hash' };
    const mapped = mapFileRecord(dbRecord);
    expect(mapped.fileName).toBe('test.csv');
    expect(mapped.filename).toBeUndefined();
  });
});
```

## Phase 2: Data Access Layer Updates

### 1. Create Mapping Utilities
```javascript
// src/utils/fileMapping.js
export const mapFileRecord = (record) => ({
  ...record,
  fileName: record.filename,
  filename: undefined
});

export const mapToFileRecord = (file) => ({
  ...file,
  filename: file.fileName,
  fileName: undefined
});

// Add type definitions
export const FileRecord = {
  id: String,
  fileName: String,
  fileType: String,
  fileHash: String,
  content: Blob,
  uploadDate: Date,
  fileDate: Date,
  account: String,
  fileSize: Number,
  processed: Boolean,
  processingResult: Object,
  lastAccessed: Date
};
```

### 2. Update File Storage Service
```javascript
// src/utils/fileStorage.js
import { mapFileRecord, mapToFileRecord } from './fileMapping';

export const saveUploadedFile = async (file, content, accountName, fileType, fileDate) => {
  const dbRecord = mapToFileRecord({
    id: generateFileId(),
    fileName: file.name,
    fileType,
    fileHash: await calculateHash(content),
    content,
    uploadDate: new Date(),
    fileDate,
    account: accountName,
    fileSize: content.length,
    processed: false,
    processingResult: null,
    lastAccessed: new Date()
  });

  await save(dbRecord);
  return mapFileRecord(dbRecord);
};

export const findFileByName = async (fileName) => {
  const dbRecord = await findFileByNameInDB(fileName);
  return dbRecord ? mapFileRecord(dbRecord) : null;
};
```

## Phase 3: Repository Layer Updates

### 1. Update Base Repository
```javascript
// src/repositories/BaseRepository.js
import { mapFileRecord, mapToFileRecord } from '../utils/fileMapping';

export class BaseRepository {
  async save(item) {
    const dbRecord = mapToFileRecord(item);
    await this.store.save(dbRecord);
    return mapFileRecord(dbRecord);
  }

  async get(id) {
    const dbRecord = await this.store.get(id);
    return dbRecord ? mapFileRecord(dbRecord) : null;
  }
}
```

### 2. Update File Repository
```javascript
// src/repositories/FileRepository.js
export class FileRepository extends BaseRepository {
  async getByFileName(fileName) {
    const records = await this.store.getByIndex('filename', fileName);
    return records.map(mapFileRecord);
  }
}
```

## Phase 4: Service Layer Updates

### 1. Update Portfolio Service
```javascript
// src/services/PortfolioService.js
export class PortfolioService {
  async savePortfolioSnapshot(portfolioData, accountName, date, accountTotal, transactionMetadata = null) {
    const fileReference = transactionMetadata?.fileId && transactionMetadata?.fileHash ? 
      createFileReference({
        ...transactionMetadata,
        fileName: transactionMetadata.fileName || transactionMetadata.filename
      }) : null;

    const portfolio = {
      account: accountName,
      date,
      data: portfolioData,
      accountTotal,
      sourceFile: fileReference
    };

    return this.portfolioRepo.save(portfolio);
  }
}
```

## Phase 5: Component Layer Updates

### 1. Update File Upload Components
```javascript
// src/components/FileUploader.jsx
const FileUploader = () => {
  const [fileName, setFileName] = useState('');
  
  const handleFileSelect = (file) => {
    setFileName(file.name);
  };
  
  return (
    <div>
      <input type="file" onChange={handleFileSelect} />
      {fileName && <p>Selected file: {fileName}</p>}
    </div>
  );
};
```

## Phase 6: Testing and Validation

### 1. Create Test Data Migration Script
```javascript
// scripts/migrateFilenameConvention.js
async function migrateExistingData() {
  const db = await initializeDB();
  const files = await getAllFiles();
  
  for (const file of files) {
    const updatedFile = mapFileRecord(file);
    await saveFile(updatedFile);
  }
}
```

### 2. Add Validation Checks
```javascript
// src/utils/validation.js
export const validateFileNameConvention = (obj) => {
  if (obj.filename && !obj.fileName) {
    console.warn('Object uses old filename convention:', obj);
    return false;
  }
  return true;
};
```

## Phase 7: Deployment

### 1. Create Database Migration
```javascript
// migrations/standardizeFilename.js
export const up = async (db) => {
  // No schema changes needed, just data mapping
  const files = await db.getAll('files');
  for (const file of files) {
    const updated = mapFileRecord(file);
    await db.put('files', updated);
  }
};

export const down = async (db) => {
  // Revert to old convention if needed
  const files = await db.getAll('files');
  for (const file of files) {
    const reverted = mapToFileRecord(file);
    await db.put('files', reverted);
  }
};
```

## Phase 8: Cleanup

### 1. Remove Temporary ESLint Allowance
```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'camelcase': ['error', { 
      properties: 'never'
    }]
  }
};
```

### 2. Update Documentation
```markdown
# Filename Convention

All file name properties in the codebase use the `fileName` convention (camelCase with capital N).
This applies to:
- JavaScript/React properties
- API responses
- File references
- Database mappings (handled automatically)
```

## Implementation Order
1. Create the migration branch
2. Add ESLint rules and tests
3. Implement mapping utilities
4. Update data access layer
5. Update repository layer
6. Update service layer
7. Update components
8. Run migration script
9. Deploy changes
10. Clean up and update documentation

## Rollback Plan
1. Keep the old `filename` field in the database
2. Maintain backward compatibility in the mapping layer
3. Keep the migration script for reverting changes
4. Monitor for any issues after deployment

## Notes
- The database schema will remain unchanged, using `filename` in indexes and field names
- The mapping layer will handle conversion between `filename` (DB) and `fileName` (JS)
- All new code should use `fileName` consistently
- Existing code will be gradually updated to use the new convention
- The migration is designed to be non-breaking and reversible 