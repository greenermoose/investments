import { useState, useCallback } from 'react';

/**
 * Hook for managing dialog state and operations
 */
export function useDialog() {
  const [dialog, setDialog] = useState(null);

  /**
   * Show a dialog
   * @param {Object} params - Dialog parameters
   * @param {string} params.title - Dialog title
   * @param {string} params.message - Dialog message
   * @param {string} params.type - Dialog type ('success', 'error', 'info', 'warning')
   * @param {Function} params.onConfirm - Callback when dialog is confirmed
   * @param {Function} params.onCancel - Callback when dialog is cancelled
   */
  const showDialog = useCallback(({ title, message, type = 'info', onConfirm, onCancel }) => {
    setDialog({
      title,
      message,
      type,
      onConfirm: () => {
        setDialog(null);
        onConfirm?.();
      },
      onCancel: () => {
        setDialog(null);
        onCancel?.();
      }
    });
  }, []);

  /**
   * Hide the current dialog
   */
  const hideDialog = useCallback(() => {
    setDialog(null);
  }, []);

  return {
    dialog,
    showDialog,
    hideDialog
  };
} 