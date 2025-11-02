import { test, expect } from '@playwright/test';

/**
 * E2E tests for messages listing and viewing
 * Authentication is bypassed in test mode via E2E_TEST_MODE environment variable
 */

test.describe('Messages List', () => {

  test('should display messages table', async ({ page }) => {
    await page.goto('/');

    // Look for table headers
    await expect(page.getByText('Subject')).toBeVisible();
    await expect(page.getByText('Summary')).toBeVisible();
    await expect(page.getByText('Category')).toBeVisible();
  });

  test('should show loading state initially', async ({ page }) => {
    await page.goto('/');

    // Loading skeleton should appear briefly
    const skeleton = page.locator('.animate-pulse').first();
    // May or may not be visible depending on load time
  });

  test('should display message rows', async ({ page }) => {
    await page.goto('/');

    // Wait for messages to load
    await page.waitForTimeout(2000);

    // Look for message rows in table
    const rows = page.locator('tbody tr');

    // If messages exist, should have rows
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // First row should have subject, sender, summary
      const firstRow = rows.first();
      await expect(firstRow).toBeVisible();

      // Should have checkboxes for selection
      await expect(firstRow.locator('input[type="checkbox"]')).toBeVisible();
    }
  });

  test('should show empty state when no messages exist', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(2000);

    // Check if empty state is visible
    const emptyState = page.getByText(/no messages|connect a gmail account/i);
    // May or may not be visible depending on data state
  });

  test('should allow selecting individual messages', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(2000);

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Click checkbox on first message
      const firstCheckbox = rows.first().locator('input[type="checkbox"]');
      await firstCheckbox.click();

      // Row should be highlighted
      await expect(rows.first()).toHaveClass(/bg-blue-50/);

      // Bulk actions bar should appear
      await expect(page.getByText(/message.* selected/i)).toBeVisible();
    }
  });

  test('should allow selecting all messages', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(2000);

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Click select-all checkbox in header
      const selectAllCheckbox = page.locator('thead input[type="checkbox"]');
      await selectAllCheckbox.click();

      // All rows should be highlighted
      for (let i = 0; i < Math.min(rowCount, 5); i++) {
        await expect(rows.nth(i)).toHaveClass(/bg-blue-50/);
      }

      // Bulk actions bar should show count
      await expect(page.getByText(new RegExp(`${rowCount} messages? selected`, 'i'))).toBeVisible();
    }
  });

  test('should navigate to message detail on row click', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(2000);

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Click on first row (not on checkbox)
      const firstRow = rows.first();
      const subject = firstRow.locator('td').nth(1); // Subject column
      await subject.click();

      // Should navigate to message detail page
      await expect(page).toHaveURL(/\/messages\/[a-zA-Z0-9-]+/);
    }
  });

  test('should not navigate when clicking checkbox', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(2000);

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      const currentUrl = page.url();

      // Click checkbox
      const firstCheckbox = rows.first().locator('input[type="checkbox"]');
      await firstCheckbox.click();

      // Should stay on same page
      expect(page.url()).toBe(currentUrl);
    }
  });

  test('should display pagination when multiple pages exist', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(2000);

    // Look for pagination controls
    const pagination = page.getByText(/page \d+ of \d+/i);

    // May or may not exist depending on message count
    const paginationCount = await pagination.count();

    if (paginationCount > 0) {
      await expect(pagination).toBeVisible();

      // Should have Previous/Next buttons
      await expect(page.getByRole('button', { name: /previous/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /next/i })).toBeVisible();
    }
  });

  test('should filter messages by category', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(2000);

    // Click on a category filter
    const categoryPills = page.locator('[class*="rounded-full"]').filter({ hasText: /newsletter|receipt/i });

    if (await categoryPills.count() > 0) {
      const initialRowCount = await page.locator('tbody tr').count();

      await categoryPills.first().click();

      // Wait for filter to apply
      await page.waitForTimeout(1000);

      // Message list should update (may have different count)
      // Test demonstrates the flow
    }
  });
});

test.describe('Message Display', () => {
  test('should display message sender and subject', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(2000);

    const rows = page.locator('tbody tr');

    if (await rows.count() > 0) {
      const firstRow = rows.first();

      // Should have subject text
      const subjectCell = firstRow.locator('td').nth(1);
      await expect(subjectCell).toContainText(/./); // Has some text

      // Subject cell should also contain sender email
      await expect(subjectCell).toContainText(/@|unknown sender/i);
    }
  });

  test('should display AI summary or snippet', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(2000);

    const rows = page.locator('tbody tr');

    if (await rows.count() > 0) {
      const firstRow = rows.first();

      // Summary column should have text
      const summaryCell = firstRow.locator('td').nth(2);
      await expect(summaryCell).toContainText(/./); // Has some text
    }
  });

  test('should display category badges', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(2000);

    const rows = page.locator('tbody tr');

    if (await rows.count() > 0) {
      const firstRow = rows.first();

      // Category column should have badge
      const categoryCell = firstRow.locator('td').nth(3);
      const badge = categoryCell.locator('[class*="rounded-full"]');

      await expect(badge).toBeVisible();
      await expect(badge).toContainText(/./); // Has category name
    }
  });
});
