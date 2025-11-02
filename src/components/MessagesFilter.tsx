'use client';

import { useState, useEffect } from 'react';

interface Category {
  id: string;
  name: string;
  _count: {
    messages: number;
  };
}

interface Account {
  provider: string;
  providerAccountId: string;
  profile_id: string | null;
  _count: {
    messages: number;
  };
}

interface MessagesFilterProps {
  onCategoryChange?: (categoryId: string | null) => void;
  onAccountChange: (accountId: string | null) => void;
}

export default function MessagesFilter({
  onCategoryChange = () => {},
  onAccountChange,
}: MessagesFilterProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      setLoading(true);

      const [categoriesRes, accountsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/accounts'),
      ]);

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        setAccounts(accountsData);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    onCategoryChange(categoryId === 'all' ? null : categoryId);
  };

  const handleAccountChange = (accountId: string) => {
    setSelectedAccount(accountId);
    onAccountChange(accountId === 'all' ? null : accountId);
  };

  const handleClearFilters = () => {
    setSelectedCategory('all');
    setSelectedAccount('all');
    onCategoryChange(null);
    onAccountChange(null);
  };

  const hasActiveFilters = selectedCategory !== 'all' || selectedAccount !== 'all';

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse flex gap-4">
          <div className="h-10 bg-gray-200 rounded w-48"></div>
          <div className="h-10 bg-gray-200 rounded w-48"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1 flex flex-col sm:flex-row gap-4 w-full">
          {/* Category Filter - Hidden (controlled by category pills) */}
          <div className="flex-1 hidden">
            <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Category
            </label>
            <select
              id="category-filter"
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} ({category._count.messages})
                </option>
              ))}
              <option value="uncategorized">Uncategorized</option>
            </select>
          </div>

          {/* Account Filter */}
          <div className="flex-1">
            <label htmlFor="account-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Account
            </label>
            <select
              id="account-filter"
              value={selectedAccount}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Accounts</option>
              {accounts.map((account) => (
                <option key={account.providerAccountId} value={account.providerAccountId}>
                  {account.profile_id || account.providerAccountId} ({account._count.messages})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div className="sm:pt-6">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
