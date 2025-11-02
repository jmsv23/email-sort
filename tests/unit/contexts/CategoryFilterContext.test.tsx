/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CategoryFilterProvider, useCategoryFilter } from '@/contexts/CategoryFilterContext';

// Test component that uses the context
function TestComponent() {
  const { selectedCategoryId, setSelectedCategoryId, clearFilter } = useCategoryFilter();

  return (
    <div>
      <div data-testid="selected-category">{selectedCategoryId || 'none'}</div>
      <button onClick={() => setSelectedCategoryId('cat-1')}>Select Category 1</button>
      <button onClick={() => setSelectedCategoryId('cat-2')}>Select Category 2</button>
      <button onClick={() => setSelectedCategoryId(null)}>Set Null</button>
      <button onClick={clearFilter}>Clear Filter</button>
    </div>
  );
}

describe('CategoryFilterContext', () => {
  describe('Provider', () => {
    it('should provide default state (null)', () => {
      render(
        <CategoryFilterProvider>
          <TestComponent />
        </CategoryFilterProvider>
      );

      expect(screen.getByTestId('selected-category')).toHaveTextContent('none');
    });

    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useCategoryFilter must be used within a CategoryFilterProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('setSelectedCategoryId', () => {
    it('should update selected category ID', () => {
      render(
        <CategoryFilterProvider>
          <TestComponent />
        </CategoryFilterProvider>
      );

      expect(screen.getByTestId('selected-category')).toHaveTextContent('none');

      act(() => {
        screen.getByText('Select Category 1').click();
      });

      expect(screen.getByTestId('selected-category')).toHaveTextContent('cat-1');
    });

    it('should allow changing between different categories', () => {
      render(
        <CategoryFilterProvider>
          <TestComponent />
        </CategoryFilterProvider>
      );

      act(() => {
        screen.getByText('Select Category 1').click();
      });
      expect(screen.getByTestId('selected-category')).toHaveTextContent('cat-1');

      act(() => {
        screen.getByText('Select Category 2').click();
      });
      expect(screen.getByTestId('selected-category')).toHaveTextContent('cat-2');
    });

    it('should allow setting to null directly', () => {
      render(
        <CategoryFilterProvider>
          <TestComponent />
        </CategoryFilterProvider>
      );

      act(() => {
        screen.getByText('Select Category 1').click();
      });
      expect(screen.getByTestId('selected-category')).toHaveTextContent('cat-1');

      act(() => {
        screen.getByText('Set Null').click();
      });
      expect(screen.getByTestId('selected-category')).toHaveTextContent('none');
    });
  });

  describe('clearFilter', () => {
    it('should reset selected category to null', () => {
      render(
        <CategoryFilterProvider>
          <TestComponent />
        </CategoryFilterProvider>
      );

      act(() => {
        screen.getByText('Select Category 1').click();
      });
      expect(screen.getByTestId('selected-category')).toHaveTextContent('cat-1');

      act(() => {
        screen.getByText('Clear Filter').click();
      });
      expect(screen.getByTestId('selected-category')).toHaveTextContent('none');
    });

    it('should work when already null', () => {
      render(
        <CategoryFilterProvider>
          <TestComponent />
        </CategoryFilterProvider>
      );

      expect(screen.getByTestId('selected-category')).toHaveTextContent('none');

      act(() => {
        screen.getByText('Clear Filter').click();
      });

      expect(screen.getByTestId('selected-category')).toHaveTextContent('none');
    });
  });

  describe('Multiple consumers', () => {
    function MultipleConsumersTest() {
      const { selectedCategoryId, setSelectedCategoryId } = useCategoryFilter();

      return (
        <div>
          <div data-testid="consumer-1">{selectedCategoryId || 'none'}</div>
          <div data-testid="consumer-2">{selectedCategoryId || 'none'}</div>
          <button onClick={() => setSelectedCategoryId('shared-cat')}>Update</button>
        </div>
      );
    }

    it('should share state between multiple consumers', () => {
      render(
        <CategoryFilterProvider>
          <MultipleConsumersTest />
        </CategoryFilterProvider>
      );

      expect(screen.getByTestId('consumer-1')).toHaveTextContent('none');
      expect(screen.getByTestId('consumer-2')).toHaveTextContent('none');

      act(() => {
        screen.getByText('Update').click();
      });

      expect(screen.getByTestId('consumer-1')).toHaveTextContent('shared-cat');
      expect(screen.getByTestId('consumer-2')).toHaveTextContent('shared-cat');
    });
  });
});
