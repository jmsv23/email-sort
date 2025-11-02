/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CategoriesSection from '@/components/CategoriesSection';
import { useCategoryFilter } from '@/contexts/CategoryFilterContext';

// Mock the CategoryFilterContext
jest.mock('@/contexts/CategoryFilterContext', () => ({
  useCategoryFilter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();
global.confirm = jest.fn();
global.alert = jest.fn();

describe('CategoriesSection Component', () => {
  const mockSetSelectedCategoryId = jest.fn();

  const mockCategories = [
    {
      id: 'cat-1',
      name: 'Newsletters',
      description: 'Marketing emails and newsletters',
      createdAt: '2024-01-01T00:00:00Z',
      _count: { messages: 15 },
    },
    {
      id: 'cat-2',
      name: 'Receipts',
      description: 'Purchase receipts and confirmations',
      createdAt: '2024-01-02T00:00:00Z',
      _count: { messages: 8 },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useCategoryFilter as jest.Mock).mockReturnValue({
      selectedCategoryId: null,
      setSelectedCategoryId: mockSetSelectedCategoryId,
    });

    // Default fetch mocks
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories,
      }) // categories fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ length: 5 }),
      }); // uncategorized count
  });

  describe('Loading State', () => {
    it('should display loading text while fetching categories', () => {
      render(<CategoriesSection />);
      expect(screen.getByText('Loading categories...')).toBeInTheDocument();
    });
  });

  describe('Categories Display', () => {
    it('should render categories successfully', async () => {
      render(<CategoriesSection />);

      await waitFor(() => {
        expect(screen.getByText('Newsletters')).toBeInTheDocument();
        expect(screen.getByText('Receipts')).toBeInTheDocument();
      });

      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('should display uncategorized pill', async () => {
      render(<CategoriesSection />);

      await waitFor(() => {
        expect(screen.getByText('Uncategorized')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });

    it('should show tooltips for category descriptions', async () => {
      render(<CategoriesSection />);

      await waitFor(() => {
        const newsletterPill = screen.getByText('Newsletters').parentElement;
        expect(newsletterPill?.parentElement).toHaveAttribute('title', 'Marketing emails and newsletters');
      });
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no categories exist', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ length: 0 }),
        });

      render(<CategoriesSection />);

      await waitFor(() => {
        expect(screen.getByText('No categories yet. Create your first category to start organizing emails.')).toBeInTheDocument();
      });
    });
  });

  describe('Category Selection', () => {
    it('should handle category selection', async () => {
      render(<CategoriesSection />);

      await waitFor(() => {
        expect(screen.getByText('Newsletters')).toBeInTheDocument();
      });

      const newsletterPill = screen.getByText('Newsletters').closest('div');
      fireEvent.click(newsletterPill!);

      expect(mockSetSelectedCategoryId).toHaveBeenCalledWith('cat-1');
    });

    it('should deselect category when clicking selected category', async () => {
      (useCategoryFilter as jest.Mock).mockReturnValue({
        selectedCategoryId: 'cat-1',
        setSelectedCategoryId: mockSetSelectedCategoryId,
      });

      render(<CategoriesSection />);

      await waitFor(() => {
        expect(screen.getByText('Newsletters')).toBeInTheDocument();
      });

      const newsletterPill = screen.getByText('Newsletters').closest('div');
      fireEvent.click(newsletterPill!);

      expect(mockSetSelectedCategoryId).toHaveBeenCalledWith(null);
    });

    it('should highlight selected category', async () => {
      (useCategoryFilter as jest.Mock).mockReturnValue({
        selectedCategoryId: 'cat-1',
        setSelectedCategoryId: mockSetSelectedCategoryId,
      });

      render(<CategoriesSection />);

      await waitFor(() => {
        const newsletterPill = screen.getByText('Newsletters').parentElement;
        expect(newsletterPill).toHaveClass('bg-blue-600', 'text-white');
      });
    });

    it('should handle uncategorized selection', async () => {
      render(<CategoriesSection />);

      await waitFor(() => {
        expect(screen.getByText('Uncategorized')).toBeInTheDocument();
      });

      const uncategorizedPill = screen.getByText('Uncategorized').closest('div');
      fireEvent.click(uncategorizedPill!);

      expect(mockSetSelectedCategoryId).toHaveBeenCalledWith('uncategorized');
    });
  });

  describe('Create Category Modal', () => {
    it('should open create modal when clicking Create Category button', async () => {
      render(<CategoriesSection />);

      await waitFor(() => {
        expect(screen.getByText('Newsletters')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Create Category'));

      expect(screen.getByText('Create Category', { selector: 'h4' })).toBeInTheDocument();
      expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    });

    it('should close modal when clicking Cancel', async () => {
      render(<CategoriesSection />);

      await waitFor(() => {
        expect(screen.getByText('Newsletters')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Create Category'));
      expect(screen.getByText('Create Category', { selector: 'h4' })).toBeInTheDocument();

      fireEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByText('Create Category', { selector: 'h4' })).not.toBeInTheDocument();
      });
    });

    it('should submit new category successfully', async () => {
      const newCategory = {
        id: 'cat-3',
        name: 'Promotions',
        description: 'Sales and promotional emails',
        createdAt: '2024-01-03T00:00:00Z',
        _count: { messages: 0 },
      };

      render(<CategoriesSection />);

      await waitFor(() => {
        expect(screen.getByText('Newsletters')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Create Category'));

      // Fill form
      const nameInput = screen.getByLabelText(/Name/);
      const descriptionInput = screen.getByLabelText(/Description/);

      fireEvent.change(nameInput, { target: { value: 'Promotions' } });
      fireEvent.change(descriptionInput, { target: { value: 'Sales and promotional emails' } });

      // Mock successful create
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => newCategory,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [...mockCategories, newCategory],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ length: 5 }),
        });

      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/categories',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Promotions', description: 'Sales and promotional emails' }),
          })
        );
      });
    });

    it('should display error message when create fails', async () => {
      render(<CategoriesSection />);

      await waitFor(() => {
        expect(screen.getByText('Newsletters')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Create Category'));

      const nameInput = screen.getByLabelText(/Name/);
      fireEvent.change(nameInput, { target: { value: 'Newsletters' } });

      // Mock error response (duplicate name)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'A category with this name already exists' }),
      });

      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(screen.getByText('A category with this name already exists')).toBeInTheDocument();
      });
    });
  });

  describe('Edit Category', () => {
    it('should open edit modal when clicking edit button', async () => {
      render(<CategoriesSection />);

      await waitFor(() => {
        expect(screen.getByText('Newsletters')).toBeInTheDocument();
      });

      // Find edit button (hover action)
      const editButtons = screen.getAllByLabelText('Edit category');
      fireEvent.click(editButtons[0]);

      expect(screen.getByText('Edit Category')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Newsletters')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Marketing emails and newsletters')).toBeInTheDocument();
    });

    it('should submit edited category successfully', async () => {
      render(<CategoriesSection />);

      await waitFor(() => {
        expect(screen.getByText('Newsletters')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText('Edit category');
      fireEvent.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/Name/);
      fireEvent.change(nameInput, { target: { value: 'Updated Newsletters' } });

      // Mock successful update
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockCategories[0], name: 'Updated Newsletters' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCategories,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ length: 5 }),
        });

      fireEvent.click(screen.getByText('Update'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/categories/cat-1',
          expect.objectContaining({
            method: 'PUT',
          })
        );
      });
    });
  });

  describe('Delete Category', () => {
    it('should show confirmation dialog when deleting category', async () => {
      (global.confirm as jest.Mock).mockReturnValue(false);

      render(<CategoriesSection />);

      await waitFor(() => {
        expect(screen.getByText('Newsletters')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText('Delete category');
      fireEvent.click(deleteButtons[0]);

      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete this category? Messages will not be deleted.'
      );
    });

    it('should delete category when confirmed', async () => {
      (global.confirm as jest.Mock).mockReturnValue(true);

      render(<CategoriesSection />);

      await waitFor(() => {
        expect(screen.getByText('Newsletters')).toBeInTheDocument();
      });

      // Mock successful delete
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [mockCategories[1]], // Only second category remains
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ length: 5 }),
        });

      const deleteButtons = screen.getAllByLabelText('Delete category');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/categories/cat-1',
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });

    it('should show alert when delete fails', async () => {
      (global.confirm as jest.Mock).mockReturnValue(true);
      (global.alert as jest.Mock).mockImplementation(() => {});

      render(<CategoriesSection />);

      await waitFor(() => {
        expect(screen.getByText('Newsletters')).toBeInTheDocument();
      });

      // Mock failed delete
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Cannot delete category' }),
      });

      const deleteButtons = screen.getAllByLabelText('Delete category');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Cannot delete category');
      });
    });

    it('should not delete when user cancels confirmation', async () => {
      (global.confirm as jest.Mock).mockReturnValue(false);

      render(<CategoriesSection />);

      await waitFor(() => {
        expect(screen.getByText('Newsletters')).toBeInTheDocument();
      });

      const fetchCallsBefore = (global.fetch as jest.Mock).mock.calls.length;

      const deleteButtons = screen.getAllByLabelText('Delete category');
      fireEvent.click(deleteButtons[0]);

      // No additional fetch calls should be made
      expect((global.fetch as jest.Mock).mock.calls.length).toBe(fetchCallsBefore);
    });
  });

  describe('Form Validation', () => {
    it('should require name field', async () => {
      render(<CategoriesSection />);

      await waitFor(() => {
        expect(screen.getByText('Newsletters')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Create Category'));

      const nameInput = screen.getByLabelText(/Name/) as HTMLInputElement;
      expect(nameInput.required).toBe(true);
    });

    it('should allow optional description', async () => {
      render(<CategoriesSection />);

      await waitFor(() => {
        expect(screen.getByText('Newsletters')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Create Category'));

      const descriptionInput = screen.getByLabelText(/Description/) as HTMLTextAreaElement;
      expect(descriptionInput.required).toBe(false);
    });
  });
});
