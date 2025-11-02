'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CategoryFilterContextType {
  selectedCategoryId: string | null;
  setSelectedCategoryId: (categoryId: string | null) => void;
  clearFilter: () => void;
}

const CategoryFilterContext = createContext<CategoryFilterContextType | undefined>(undefined);

export function CategoryFilterProvider({ children }: { children: ReactNode }) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const clearFilter = () => {
    setSelectedCategoryId(null);
  };

  return (
    <CategoryFilterContext.Provider
      value={{
        selectedCategoryId,
        setSelectedCategoryId,
        clearFilter,
      }}
    >
      {children}
    </CategoryFilterContext.Provider>
  );
}

export function useCategoryFilter() {
  const context = useContext(CategoryFilterContext);
  if (context === undefined) {
    throw new Error('useCategoryFilter must be used within a CategoryFilterProvider');
  }
  return context;
}
