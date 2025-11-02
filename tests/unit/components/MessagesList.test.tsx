/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MessagesList from '@/components/MessagesList';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('MessagesList Component', () => {
  const mockPush = jest.fn();
  const mockOnSelectionChange = jest.fn();

  const mockMessages = [
    {
      id: 'msg-1',
      subject: 'Test Email 1',
      from: 'sender1@example.com',
      snippet: 'This is test email 1',
      aiSummary: 'AI summary for email 1',
      category: { id: 'cat-1', name: 'Newsletters' },
      account: { provider: 'google', providerAccountId: 'account-1', profile_id: 'user@test.com' },
      importedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'msg-2',
      subject: 'Test Email 2',
      from: 'sender2@example.com',
      snippet: 'This is test email 2',
      aiSummary: 'AI summary for email 2',
      category: null,
      account: { provider: 'google', providerAccountId: 'account-2', profile_id: 'user2@test.com' },
      importedAt: '2024-01-02T00:00:00Z',
    },
  ];

  const mockPagination = {
    page: 1,
    limit: 50,
    totalCount: 2,
    totalPages: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

    // Default fetch mocks
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ length: 1 }),
      }) // accounts fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: mockMessages, pagination: mockPagination }),
      }); // messages fetch
  });

  describe('Loading State', () => {
    it('should display loading skeleton while fetching messages', () => {
      render(
        <MessagesList
          categoryId={null}
          accountId={null}
          selectedMessages={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      expect(screen.getByTestId('loading-skeleton') || document.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('Messages Display', () => {
    it('should render messages list successfully', async () => {
      render(
        <MessagesList
          categoryId={null}
          accountId={null}
          selectedMessages={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Email 1')).toBeInTheDocument();
        expect(screen.getByText('Test Email 2')).toBeInTheDocument();
      });

      expect(screen.getByText('sender1@example.com')).toBeInTheDocument();
      expect(screen.getByText('AI summary for email 1')).toBeInTheDocument();
    });

    it('should display category badges correctly', async () => {
      render(
        <MessagesList
          categoryId={null}
          accountId={null}
          selectedMessages={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Newsletters')).toBeInTheDocument();
        expect(screen.getByText('Uncategorized')).toBeInTheDocument();
      });
    });

    it('should display "(No subject)" for messages without subject', async () => {
      const messagesWithoutSubject = [{
        ...mockMessages[0],
        subject: null,
      }];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ length: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ messages: messagesWithoutSubject, pagination: mockPagination }),
        });

      render(
        <MessagesList
          categoryId={null}
          accountId={null}
          selectedMessages={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('(No subject)')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no messages exist', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ length: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ messages: [], pagination: { ...mockPagination, totalCount: 0 } }),
        });

      render(
        <MessagesList
          categoryId={null}
          accountId={null}
          selectedMessages={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No messages')).toBeInTheDocument();
        expect(screen.getByText('Connect a Gmail account and sync to see your messages.')).toBeInTheDocument();
      });
    });

    it('should display filtered empty state when filters are applied', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ length: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ messages: [], pagination: { ...mockPagination, totalCount: 0 } }),
        });

      render(
        <MessagesList
          categoryId="cat-1"
          accountId={null}
          selectedMessages={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No messages match your selected filters.')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error state when fetch fails', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ length: 1 }),
        })
        .mockResolvedValueOnce({
          ok: false,
        });

      render(
        <MessagesList
          categoryId={null}
          accountId={null}
          selectedMessages={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Error loading messages')).toBeInTheDocument();
        expect(screen.getByText('Failed to fetch messages')).toBeInTheDocument();
      });
    });

    it('should allow retry after error', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ length: 1 }),
        })
        .mockResolvedValueOnce({
          ok: false,
        });

      render(
        <MessagesList
          categoryId={null}
          accountId={null}
          selectedMessages={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Mock successful retry
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: mockMessages, pagination: mockPagination }),
      });

      fireEvent.click(screen.getByText('Retry'));

      await waitFor(() => {
        expect(screen.getByText('Test Email 1')).toBeInTheDocument();
      });
    });
  });

  describe('Message Selection', () => {
    it('should handle individual message selection', async () => {
      render(
        <MessagesList
          categoryId={null}
          accountId={null}
          selectedMessages={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Email 1')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // First message checkbox (skip "select all")

      expect(mockOnSelectionChange).toHaveBeenCalledWith(['msg-1']);
    });

    it('should handle select all', async () => {
      render(
        <MessagesList
          categoryId={null}
          accountId={null}
          selectedMessages={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Email 1')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(selectAllCheckbox);

      expect(mockOnSelectionChange).toHaveBeenCalledWith(['msg-1', 'msg-2']);
    });

    it('should deselect all when all are selected', async () => {
      render(
        <MessagesList
          categoryId={null}
          accountId={null}
          selectedMessages={['msg-1', 'msg-2']}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Email 1')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(selectAllCheckbox);

      expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
    });

    it('should highlight selected messages', async () => {
      render(
        <MessagesList
          categoryId={null}
          accountId={null}
          selectedMessages={['msg-1']}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Email 1')).toBeInTheDocument();
      });

      const row = screen.getByText('Test Email 1').closest('tr');
      expect(row).toHaveClass('bg-blue-50');
    });
  });

  describe('Navigation', () => {
    it('should navigate to message detail on row click', async () => {
      render(
        <MessagesList
          categoryId={null}
          accountId={null}
          selectedMessages={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Email 1')).toBeInTheDocument();
      });

      const row = screen.getByText('Test Email 1').closest('tr');
      fireEvent.click(row!);

      expect(mockPush).toHaveBeenCalledWith('/messages/msg-1');
    });

    it('should not navigate when clicking checkbox', async () => {
      render(
        <MessagesList
          categoryId={null}
          accountId={null}
          selectedMessages={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Email 1')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Pagination', () => {
    it('should display pagination when multiple pages exist', async () => {
      const multiPagePagination = {
        page: 1,
        limit: 50,
        totalCount: 150,
        totalPages: 3,
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ length: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ messages: mockMessages, pagination: multiPagePagination }),
        });

      render(
        <MessagesList
          categoryId={null}
          accountId={null}
          selectedMessages={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Showing')).toBeInTheDocument();
        expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
      });
    });

    it('should handle page navigation', async () => {
      const multiPagePagination = {
        page: 1,
        limit: 50,
        totalCount: 150,
        totalPages: 3,
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ length: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ messages: mockMessages, pagination: multiPagePagination }),
        });

      render(
        <MessagesList
          categoryId={null}
          accountId={null}
          selectedMessages={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
      });

      // Mock page 2 fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: mockMessages, pagination: { ...multiPagePagination, page: 2 } }),
      });

      const nextButtons = screen.getAllByText('Next');
      fireEvent.click(nextButtons[0]);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('page=2'));
      });
    });
  });

  describe('Filtering', () => {
    it('should fetch messages with category filter', async () => {
      render(
        <MessagesList
          categoryId="cat-123"
          accountId={null}
          selectedMessages={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('categoryId=cat-123'));
      });
    });

    it('should fetch messages with account filter', async () => {
      render(
        <MessagesList
          categoryId={null}
          accountId="acc-123"
          selectedMessages={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('accountId=acc-123'));
      });
    });

    it('should not add filter params for "all" value', async () => {
      render(
        <MessagesList
          categoryId="all"
          accountId="all"
          selectedMessages={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        const calls = (global.fetch as jest.Mock).mock.calls;
        const messagesCall = calls.find(call => call[0].includes('/api/messages'));
        expect(messagesCall[0]).not.toContain('categoryId');
        expect(messagesCall[0]).not.toContain('accountId');
      });
    });
  });
});
