import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, FileText, Database, HelpCircle, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { validateFile, FileTypes } from '../utils/fileProcessing';
import { useFileUpload } from '../hooks/useFileUpload';
import AccountConfirmationDialog from './AccountConfirmationDialog';
import portfolioService from '../services/PortfolioService';
import { findSimilarAccountNames } from '../utils/fileMetadata';
import { useDialog } from '../hooks/useDialog';
import { usePortfolio } from '../hooks/usePortfolio';
import { debugLog } from '../utils/debugConfig';

// ... existing code ... 