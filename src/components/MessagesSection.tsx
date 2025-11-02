'use client';

import { useState, useEffect, useRef } from 'react';
import MessagesFilter from './MessagesFilter';
import MessagesList from './MessagesList';
import BulkActionsBar from './BulkActionsBar';
import { useCategoryFilter } from '@/contexts/CategoryFilterContext';

// Polling interval in milliseconds
const POLLING_INTERVAL = 15000; // 15 seconds

interface MessagesSectionProps {
  onRefreshNeeded?: () => void; // Callback to notify parent when new messages detected
}

export default function MessagesSection({ onRefreshNeeded }: MessagesSectionProps) {
  const { selectedCategoryId } = useCategoryFilter();
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [totalMessageCount, setTotalMessageCount] = useState<number | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleAccountChange = (accountId: string | null) => {
    setSelectedAccount(accountId);
    setSelectedMessages([]); // Clear selection when filter changes
  };

  const handleSelectionChange = (messageIds: string[]) => {
    setSelectedMessages(messageIds);
  };

  const handleClearSelection = () => {
    setSelectedMessages([]);
  };

  const handleDelete = async () => {
    try {
      setIsProcessing(true);

      const response = await fetch('/api/messages/bulk-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageIds: selectedMessages,
          action: 'delete',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete messages');
      }

      const result = await response.json();
      console.log('Delete result:', result);

      // Show success message (you could use a toast notification library)
      alert(result.message || 'Messages deleted successfully');

      // Clear selection and refresh list
      setSelectedMessages([]);
      setRefreshKey(prev => prev + 1); // Trigger refresh of messages list
    } catch (error) {
      console.error('Error deleting messages:', error);
      alert('Failed to delete messages. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnsubscribe = async () => {
    try {
      setIsProcessing(true);

      const response = await fetch('/api/messages/bulk-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageIds: selectedMessages,
          action: 'unsubscribe',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to unsubscribe from messages');
      }

      const result = await response.json();
      console.log('Unsubscribe result:', result);

      // Show success message (you could use a toast notification library)
      alert(result.message || 'Unsubscribe jobs queued successfully (mocked)');

      // Clear selection
      setSelectedMessages([]);
    } catch (error) {
      console.error('Error unsubscribing from messages:', error);
      alert('Failed to unsubscribe. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Polling function to check for new messages
  const checkForNewMessages = async () => {
    try {
      // Only check total count with a lightweight query
      const response = await fetch('/api/messages?limit=1');
      if (!response.ok) {
        console.error('Failed to poll for new messages');
        return;
      }

      const data = await response.json();
      const newTotalCount = data.pagination?.totalCount;

      if (newTotalCount !== undefined) {
        // If this is the first poll, just store the count
        if (totalMessageCount === null) {
          setTotalMessageCount(newTotalCount);
          return;
        }

        // If count changed, refresh the UI
        if (newTotalCount !== totalMessageCount) {
          console.log(`New messages detected: ${totalMessageCount} -> ${newTotalCount}`);
          setTotalMessageCount(newTotalCount);
          setRefreshKey(prev => prev + 1); // Trigger messages list refresh

          // Notify parent to refresh categories
          if (onRefreshNeeded) {
            onRefreshNeeded();
          }
        }
      }
    } catch (error) {
      console.error('Error polling for new messages:', error);
    }
  };

  // Set up polling interval
  useEffect(() => {
    // Don't poll if user has messages selected (to avoid disrupting bulk actions)
    const shouldPoll = selectedMessages.length === 0 && !isProcessing;

    if (shouldPoll) {
      // Initial check
      checkForNewMessages();

      // Set up interval
      pollingIntervalRef.current = setInterval(() => {
        checkForNewMessages();
      }, POLLING_INTERVAL);
    } else {
      // Clear interval if user has selection or is processing
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [selectedMessages.length, isProcessing, totalMessageCount, onRefreshNeeded]);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-2">Messages</h3>
        <p className="text-sm text-gray-600">
          View and manage your processed emails. Select messages to perform bulk actions.
        </p>
      </div>

      {/* Filters */}
      <MessagesFilter
        onAccountChange={handleAccountChange}
      />

      {/* Messages List */}
      <MessagesList
        key={refreshKey}
        categoryId={selectedCategoryId}
        accountId={selectedAccount}
        selectedMessages={selectedMessages}
        onSelectionChange={handleSelectionChange}
      />

      {/* Bulk Actions Bar */}
      {!isProcessing && (
        <BulkActionsBar
          selectedCount={selectedMessages.length}
          onDelete={handleDelete}
          onUnsubscribe={handleUnsubscribe}
          onClearSelection={handleClearSelection}
        />
      )}

      {/* Processing overlay */}
      {isProcessing && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-sm font-medium text-gray-900">Processing...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
