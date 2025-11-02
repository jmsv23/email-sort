'use client';

import { useState } from 'react';

interface MessageDetailActionsProps {
  messageId: string;
  unsubscribeLink: string | null;
  isUnsubscribed: boolean;
}

export default function MessageDetailActions({
  messageId,
  unsubscribeLink,
  isUnsubscribed,
}: MessageDetailActionsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    // Mock implementation for now
    console.log('Delete message:', messageId);
    alert('Delete functionality will be implemented soon!\nMessage ID: ' + messageId);
    setShowDeleteConfirm(false);
  };

  const handleUnsubscribe = () => {
    if (unsubscribeLink) {
      // Open unsubscribe link in new tab
      window.open(unsubscribeLink, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Unsubscribe Button/Status */}
        {unsubscribeLink && (
          <>
            {isUnsubscribed ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Unsubscribed
              </div>
            ) : (
              <button
                onClick={handleUnsubscribe}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Unsubscribe
              </button>
            )}
          </>
        )}

        {/* Delete Button */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Delete
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Message
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this message? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
