import React from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

const AccountConfirmationDialog = ({
  isOpen,
  newAccountName,
  similarAccounts,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Account Name Confirmation</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            We found a similar account name in your portfolio. Please confirm if this is the same account or a new one.
          </p>
          
          <div className="bg-blue-50 p-4 rounded-md mb-4">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-blue-500 mr-2 mt-0.5" />
              <div>
                <p className="text-blue-700 font-medium">New Account Name:</p>
                <p className="text-blue-600">{newAccountName}</p>
              </div>
            </div>
          </div>

          {similarAccounts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Similar Accounts Found:</h3>
              <div className="space-y-2">
                {similarAccounts.map((account, index) => (
                  <button
                    key={index}
                    onClick={() => onConfirm(account)}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-md flex items-center"
                  >
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <span>{account}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Use New Account
            </button>
            <button
              onClick={() => onConfirm(newAccountName)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountConfirmationDialog; 