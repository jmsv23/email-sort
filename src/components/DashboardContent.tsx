'use client';

import { useState } from 'react';
import CategoriesSection from './CategoriesSection';
import MessagesSection from './MessagesSection';

export default function DashboardContent() {
  const [categoryRefreshTrigger, setCategoryRefreshTrigger] = useState(0);

  const handleRefreshNeeded = () => {
    // Increment trigger to notify CategoriesSection to refresh
    setCategoryRefreshTrigger(prev => prev + 1);
  };

  return (
    <>
      <div className="mt-6">
        <CategoriesSection key={categoryRefreshTrigger} />
      </div>

      <div className="mt-6">
        <MessagesSection onRefreshNeeded={handleRefreshNeeded} />
      </div>
    </>
  );
}
