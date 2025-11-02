'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface MessageDetailActionsProps {
  messageId: string;
  unsubscribeLink: string | null;
  isUnsubscribed: boolean;
  unsubscribedReason: string | null;
}

export default function MessageDetailActions({
  messageId,
  unsubscribeLink,
  isUnsubscribed,
  unsubscribedReason,
}: MessageDetailActionsProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);

      const response = await fetch('/api/messages/bulk-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageIds: [messageId],
          action: 'delete',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }

      const result = await response.json();
      console.log('Delete result:', result);

      // Invalidate cache and redirect to home page after successful deletion
      router.refresh(); // Force refresh cached server components
      router.push('/'); // Navigate to home page
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message. Please try again.');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleUnsubscribe = async (isAutomated: boolean) => {
    if (!unsubscribeLink) return;

    if (isAutomated) {
      // Automated unsubscribe via bulk-actions API
      try {
        setIsUnsubscribing(true);

        const response = await fetch('/api/messages/bulk-actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messageIds: [messageId],
            action: 'unsubscribe',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to enqueue unsubscribe job');
        }

        const result = await response.json();
        console.log('Unsubscribe enqueue result:', result);

        alert('Unsubscribe request has been queued. This may take a few moments to process.');

        // Refresh the page to see updated status
        router.refresh();
      } catch (error) {
        console.error('Error enqueueing unsubscribe:', error);
        alert('Failed to enqueue unsubscribe request. Please try again.');
      } finally {
        setIsUnsubscribing(false);
      }
    } else {
      // Manual unsubscribe - open link in new tab
      window.open(unsubscribeLink, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4 w-full">
        {/* Unsubscribe Section - Only show if message has unsubscribe link */}
        {unsubscribeLink && (
          <>
            {/* Scenario A: Successfully unsubscribed */}
            {isUnsubscribed && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                  <svg
                    className="w-4 h-4 flex-shrink-0"
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
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete
                </button>
              </div>
            )}

            {/* Scenario B: Failed to unsubscribe (has reason) */}
            {!isUnsubscribed && unsubscribedReason && (
              <div className="flex flex-col gap-3">
                {/* Warning Alert with Tooltip */}
                <div className="group relative inline-flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-300 rounded-lg w-fit cursor-help">
                  <svg
                    className="w-5 h-5 text-yellow-600 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-yellow-800">
                    Automatic Unsubscribe Failed
                  </span>

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 w-64 sm:w-80">
                    <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
                      <p className="font-semibold mb-1">Attempt failure:</p>
                      <p className="text-gray-200">{unsubscribedReason}</p>
                      <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => handleUnsubscribe(false)}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Manual Unsubscribe
                  </button>
                  <button
                    onClick={() => handleUnsubscribe(true)}
                    disabled={isUnsubscribing}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUnsubscribing && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    {isUnsubscribing ? 'Enqueueing...' : 'Retry Automated unsubscribe'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}

            {/* Scenario C: Not yet attempted (no reason) */}
            {!isUnsubscribed && !unsubscribedReason && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <button
                  onClick={() => handleUnsubscribe(true)}
                  disabled={isUnsubscribing}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUnsubscribing && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {isUnsubscribing ? 'Enqueueing...' : 'Unsubscribe'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete
                </button>
              </div>
            )}
          </>
        )}

        {/* No unsubscribe link - just show delete button */}
        {!unsubscribeLink && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full md:max-w-min px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete
          </button>
        )}
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
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeleting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
