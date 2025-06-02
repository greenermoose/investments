import React from 'react';
import { AlertCircle } from 'lucide-react';

const AccountConfirmationDialog = ({ 
  isOpen, 
  newAccountName, 
  similarAccounts, 
  onConfirm, 
  onCancel 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-start mb-4">
          <AlertCircle className="h-6 w-6 text-yellow-500 mr-2 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Similar Account Found</h3>
            <p className="text-gray-600 mb-4">
              We found an existing account that might be the same as "{newAccountName}".
              Would you like to use the existing account instead?
            </p>
          </div>
        </div>

        <div className="mb-4">
          <p className="font-medium mb-2">Similar accounts:</p>
          <ul className="list-disc list-inside text-gray-600">
            {similarAccounts.map((account, index) => (
              <li key={index}>{account}</li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Use New Account
          </button>
          <button
            onClick={() => onConfirm(similarAccounts[0])}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Use Existing Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountConfirmationDialog; 