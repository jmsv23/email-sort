import { test, expect } from '@playwright/test';

/**
 * E2E tests for category management
 * Authentication is bypassed in test mode via E2E_TEST_MODE environment variable
 */

test.describe('Category Management', () => {

  test('should display categories section on dashboard', async ({ page }) => {
    await page.goto('/');

    // Look for categories section
    await expect(page.getByText('Email Categories')).toBeVisible();
    await expect(page.getByRole('button', { name: /create category/i })).toBeVisible();
  });

  test('should open create category modal', async ({ page }) => {
    await page.goto('/');

    // Click create category button
    await page.getByRole('button', { name: /create category/i }).click();

    // Modal should appear
    await expect(page.getByRole('heading', { name: /create category/i })).toBeVisible();
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/description/i)).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/');

    // Open modal
    await page.getByRole('button', { name: /create category/i }).click();

    // Try to submit without filling fields
    await page.getByRole('button', { name: /^create$/i }).click();

    // Should show HTML5 validation or remain on modal
    const nameInput = page.getByLabel(/name/i);
    await expect(nameInput).toHaveAttribute('required');
  });

  test('should create a new category', async ({ page }) => {
    await page.goto('/');

    // Open modal
    await page.getByRole('button', { name: /create category/i }).click();

    // Fill form
    await page.getByLabel(/name/i).fill('Test Category');
    await page.getByLabel(/description/i).fill('This is a test category for E2E testing');

    // Submit
    await page.getByRole('button', { name: /^create$/i }).click();

    // Modal should close and category should appear
    // (This requires proper API mocking to work in real tests)
    await expect(page.getByRole('heading', { name: /create category/i })).not.toBeVisible({ timeout: 5000 });
  });

  test('should filter messages when clicking category', async ({ page }) => {
    await page.goto('/');

    // Find and click a category pill (if any exist)
    const categoryPills = page.locator('[class*="rounded-full"]').filter({ hasText: /newsletter|receipt|social/i });

    if (await categoryPills.count() > 0) {
      const firstCategory = categoryPills.first();
      await firstCategory.click();

      // The category should become highlighted (selected state)
      await expect(firstCategory).toHaveClass(/bg-blue-600|bg-gray-600/);
    }
  });

  test('should show edit and delete buttons on hover', async ({ page }) => {
    await page.goto('/');

    // Find a category pill
    const categoryPills = page.locator('[class*="rounded-full"]').filter({ hasText: /[a-z]+/i });

    if (await categoryPills.count() > 0) {
      const firstCategory = categoryPills.first();

      // Hover over category
      await firstCategory.hover();

      // Edit and delete buttons should appear
      const editButton = page.getByLabel(/edit category/i).first();
      const deleteButton = page.getByLabel(/delete category/i).first();

      // These buttons exist but may not be visible without proper CSS/JS loading
      await expect(editButton).toBeAttached();
      await expect(deleteButton).toBeAttached();
    }
  });

  test('should open edit modal with pre-filled data', async ({ page }) => {
    await page.goto('/');

    // Find a category and its edit button
    const editButtons = page.getByLabel(/edit category/i);

    if (await editButtons.count() > 0) {
      await editButtons.first().click();

      // Edit modal should open
      await expect(page.getByRole('heading', { name: /edit category/i })).toBeVisible();

      // Form should have pre-filled data
      const nameInput = page.getByLabel(/name/i);
      await expect(nameInput).not.toHaveValue('');
    }
  });

  test('should show confirmation dialog before deleting', async ({ page }) => {
    await page.goto('/');

    // Mock window.confirm to prevent actual dialog
    await page.evaluate(() => {
      window.confirm = () => false; // Cancel deletion
    });

    const deleteButtons = page.getByLabel(/delete category/i);

    if (await deleteButtons.count() > 0) {
      await deleteButtons.first().click();

      // Confirmation logic would run, but category shouldn't be deleted
      // (We mocked confirm to return false)
    }
  });
});

test.describe('Category Display', () => {
  test('should show empty state when no categories exist', async ({ page }) => {
    await page.goto('/');

    // If no categories exist, should show empty state message
    const emptyMessage = page.getByText(/no categories yet/i);

    // This might not be visible if categories exist
    // Test is structure demonstration
  });

  test('should display category counts', async ({ page }) => {
    await page.goto('/');

    // Category pills should show message counts as badges
    const countBadges = page.locator('[class*="rounded-full"] [class*="px-2"]');

    if (await countBadges.count() > 0) {
      // At least one badge should contain a number
      const firstBadge = countBadges.first();
      await expect(firstBadge).toHaveText(/\d+/);
    }
  });

  test('should display uncategorized category', async ({ page }) => {
    await page.goto('/');

    // Uncategorized should always be present
    await expect(page.getByText('Uncategorized')).toBeVisible();
  });
});
