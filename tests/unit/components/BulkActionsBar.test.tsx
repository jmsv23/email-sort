/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BulkActionsBar from '@/components/BulkActionsBar';

describe('BulkActionsBar Component', () => {
  const mockOnDelete = jest.fn();
  const mockOnUnsubscribe = jest.fn();
  const mockOnClearSelection = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when selectedCount is 0', () => {
      const { container } = render(
        <BulkActionsBar
          selectedCount={0}
          onDelete={mockOnDelete}
          onUnsubscribe={mockOnUnsubscribe}
          onClearSelection={mockOnClearSelection}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when messages are selected', () => {
      render(
        <BulkActionsBar
          selectedCount={5}
          onDelete={mockOnDelete}
          onUnsubscribe={mockOnUnsubscribe}
          onClearSelection={mockOnClearSelection}
        />
      );

      expect(screen.getByText('5 messages selected')).toBeInTheDocument();
      expect(screen.getByText('Clear selection')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Unsubscribe')).toBeInTheDocument();
    });

    it('should display singular message text for single selection', () => {
      render(
        <BulkActionsBar
          selectedCount={1}
          onDelete={mockOnDelete}
          onUnsubscribe={mockOnUnsubscribe}
          onClearSelection={mockOnClearSelection}
        />
      );

      expect(screen.getByText('1 message selected')).toBeInTheDocument();
    });
  });

  describe('Clear Selection', () => {
    it('should call onClearSelection when clicking clear button', () => {
      render(
        <BulkActionsBar
          selectedCount={3}
          onDelete={mockOnDelete}
          onUnsubscribe={mockOnUnsubscribe}
          onClearSelection={mockOnClearSelection}
        />
      );

      fireEvent.click(screen.getByText('Clear selection'));
      expect(mockOnClearSelection).toHaveBeenCalledTimes(1);
    });
  });

  describe('Delete Action', () => {
    it('should show delete confirmation modal when clicking delete button', () => {
      render(
        <BulkActionsBar
          selectedCount={3}
          onDelete={mockOnDelete}
          onUnsubscribe={mockOnUnsubscribe}
          onClearSelection={mockOnClearSelection}
        />
      );

      // Click delete button
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      // Check modal is shown
      expect(screen.getByText('Delete Messages')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete 3 messages/)).toBeInTheDocument();
      expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
    });

    it('should close modal when clicking cancel in delete confirmation', () => {
      render(
        <BulkActionsBar
          selectedCount={3}
          onDelete={mockOnDelete}
          onUnsubscribe={mockOnUnsubscribe}
          onClearSelection={mockOnClearSelection}
        />
      );

      // Open modal
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);
      expect(screen.getByText('Delete Messages')).toBeInTheDocument();

      // Click cancel
      const cancelButtons = screen.getAllByText('Cancel');
      fireEvent.click(cancelButtons[0]);

      // Modal should be closed
      expect(screen.queryByText('Delete Messages')).not.toBeInTheDocument();
    });

    it('should call onDelete when confirming delete', () => {
      render(
        <BulkActionsBar
          selectedCount={3}
          onDelete={mockOnDelete}
          onUnsubscribe={mockOnUnsubscribe}
          onClearSelection={mockOnClearSelection}
        />
      );

      // Open modal
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      // Confirm delete
      const confirmButtons = screen.getAllByText('Delete');
      // Get the button from the modal (second one, first is in the action bar)
      const confirmButton = confirmButtons.find(btn =>
        btn.className.includes('bg-red-600') && btn.closest('div.fixed')
      );
      fireEvent.click(confirmButton!);

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it('should display singular message text in delete modal for single message', () => {
      render(
        <BulkActionsBar
          selectedCount={1}
          onDelete={mockOnDelete}
          onUnsubscribe={mockOnUnsubscribe}
          onClearSelection={mockOnClearSelection}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      expect(screen.getByText(/Are you sure you want to delete 1 message/)).toBeInTheDocument();
    });
  });

  describe('Unsubscribe Action', () => {
    it('should show unsubscribe confirmation modal when clicking unsubscribe button', () => {
      render(
        <BulkActionsBar
          selectedCount={5}
          onDelete={mockOnDelete}
          onUnsubscribe={mockOnUnsubscribe}
          onClearSelection={mockOnClearSelection}
        />
      );

      // Click unsubscribe button
      const unsubscribeButton = screen.getByRole('button', { name: /unsubscribe/i });
      fireEvent.click(unsubscribeButton);

      // Check modal is shown
      expect(screen.getByText('Unsubscribe from Messages')).toBeInTheDocument();
      expect(screen.getByText(/Attempt to unsubscribe from 5 messages/)).toBeInTheDocument();
      expect(screen.getByText(/This will queue unsubscribe jobs/)).toBeInTheDocument();
    });

    it('should close modal when clicking cancel in unsubscribe confirmation', () => {
      render(
        <BulkActionsBar
          selectedCount={3}
          onDelete={mockOnDelete}
          onUnsubscribe={mockOnUnsubscribe}
          onClearSelection={mockOnClearSelection}
        />
      );

      // Open modal
      const unsubscribeButton = screen.getByRole('button', { name: /unsubscribe/i });
      fireEvent.click(unsubscribeButton);
      expect(screen.getByText('Unsubscribe from Messages')).toBeInTheDocument();

      // Click cancel
      const cancelButtons = screen.getAllByText('Cancel');
      fireEvent.click(cancelButtons[0]);

      // Modal should be closed
      expect(screen.queryByText('Unsubscribe from Messages')).not.toBeInTheDocument();
    });

    it('should call onUnsubscribe when confirming unsubscribe', () => {
      render(
        <BulkActionsBar
          selectedCount={3}
          onDelete={mockOnDelete}
          onUnsubscribe={mockOnUnsubscribe}
          onClearSelection={mockOnClearSelection}
        />
      );

      // Open modal
      const unsubscribeButton = screen.getByRole('button', { name: /unsubscribe/i });
      fireEvent.click(unsubscribeButton);

      // Confirm unsubscribe
      const confirmButtons = screen.getAllByText('Unsubscribe');
      // Get the button from the modal (second one)
      const confirmButton = confirmButtons.find(btn =>
        btn.className.includes('bg-blue-600') && btn.closest('div.fixed')
      );
      fireEvent.click(confirmButton!);

      expect(mockOnUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('should display singular message text in unsubscribe modal for single message', () => {
      render(
        <BulkActionsBar
          selectedCount={1}
          onDelete={mockOnDelete}
          onUnsubscribe={mockOnUnsubscribe}
          onClearSelection={mockOnClearSelection}
        />
      );

      const unsubscribeButton = screen.getByRole('button', { name: /unsubscribe/i });
      fireEvent.click(unsubscribeButton);

      expect(screen.getByText(/Attempt to unsubscribe from 1 message/)).toBeInTheDocument();
    });
  });

  describe('Modal Interactions', () => {
    it('should not have both modals open at the same time', () => {
      render(
        <BulkActionsBar
          selectedCount={3}
          onDelete={mockOnDelete}
          onUnsubscribe={mockOnUnsubscribe}
          onClearSelection={mockOnClearSelection}
        />
      );

      // Open delete modal
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);
      expect(screen.getByText('Delete Messages')).toBeInTheDocument();

      // Close it
      const cancelButtons = screen.getAllByText('Cancel');
      fireEvent.click(cancelButtons[0]);

      // Open unsubscribe modal
      const unsubscribeButton = screen.getByRole('button', { name: /unsubscribe/i });
      fireEvent.click(unsubscribeButton);
      expect(screen.getByText('Unsubscribe from Messages')).toBeInTheDocument();

      // Delete modal should not be visible
      expect(screen.queryByText('Delete Messages')).not.toBeInTheDocument();
    });
  });
});
