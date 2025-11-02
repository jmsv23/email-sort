'use client';

import { useState } from 'react';
import MessagesFilter from './MessagesFilter';
import MessagesList from './MessagesList';
import BulkActionsBar from './BulkActionsBar';
import { useCategoryFilter } from '@/contexts/CategoryFilterContext';

export default function MessagesSection() {
  const { selectedCategoryId } = useCategoryFilter();
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

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
      alert(result.message || 'Messages deleted successfully (mocked)');

      // Clear selection and refresh list
      setSelectedMessages([]);

      // Force refresh the messages list by updating a key or calling a refresh function
      // For now, we'll just clear the selection
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
