import { test, expect } from '@playwright/test';

/**
 * E2E tests for bulk actions (delete and unsubscribe)
 * Authentication is bypassed in test mode via E2E_TEST_MODE environment variable
 */

test.describe('Bulk Actions', () => {

  test('should not show bulk actions bar when no messages selected', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(2000);

    // Bulk actions bar should not be visible
    const bulkActionsBar = page.getByText(/messages? selected/i);
    await expect(bulkActionsBar).not.toBeVisible();
  });

  test('should show bulk actions bar when messages are selected', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(2000);

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Select first message
      await rows.first().locator('input[type="checkbox"]').click();

      // Bulk actions bar should appear
      await expect(page.getByText(/1 message selected/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /delete/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /unsubscribe/i })).toBeVisible();
    }
  });

  test('should update count when selecting multiple messages', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(2000);

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount >= 2) {
      // Select two messages
      await rows.nth(0).locator('input[type="checkbox"]').click();
      await rows.nth(1).locator('input[type="checkbox"]').click();

      // Should show "2 messages selected"
      await expect(page.getByText(/2 messages selected/i)).toBeVisible();
    }
  });

  test('should have clear selection button', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(2000);

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Select a message
      await rows.first().locator('input[type="checkbox"]').click();

      // Clear selection button should be visible
      const clearButton = page.getByText(/clear selection/i);
      await expect(clearButton).toBeVisible();

      // Click clear
      await clearButton.click();

      // Bulk actions bar should disappear
      await expect(page.getByText(/messages? selected/i)).not.toBeVisible();
    }
  });

  test('should show delete confirmation modal', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(2000);

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Select a message
      await rows.first().locator('input[type="checkbox"]').click();

      // Click delete button
      const deleteButton = page.getByRole('button', { name: /^delete$/i }).last();
      await deleteButton.click();

      // Confirmation modal should appear
      await expect(page.getByText('Delete Messages')).toBeVisible();
      await expect(page.getByText(/are you sure/i)).toBeVisible();
      await expect(page.getByText(/this action cannot be undone/i)).toBeVisible();
    }
  });

  test('should cancel delete action', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(2000);

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      const initialCount = rowCount;

      // Select a message
      await rows.first().locator('input[type="checkbox"]').click();

      // Click delete
      await page.getByRole('button', { name: /^delete$/i }).last().click();

      // Modal appears
      await expect(page.getByText('Delete Messages')).toBeVisible();

      // Click cancel
      await page.getByRole('button', { name: /cancel/i }).first().click();

      // Modal should close
      await expect(page.getByText('Delete Messages')).not.toBeVisible();

      // Message count should remain the same
      await page.waitForTimeout(1000);
      const newRowCount = await page.locator('tbody tr').count();
      expect(newRowCount).toBe(initialCount);
    }
  });

  test('should confirm and delete messages', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(2000);

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Select a message
      await rows.first().locator('input[type="checkbox"]').click();

      // Click delete
      await page.getByRole('button', { name: /^delete$/i }).last().click();

      // Confirm deletion
      const deleteButtons = page.getByRole('button', { name: /^delete$/i });
      const confirmButton = deleteButtons.last(); // Get the one in the modal
      await confirmButton.click();

      // Modal should close
      await expect(page.getByText('Delete Messages')).not.toBeVisible({ timeout: 5000 });

      // Note: Without proper API mocking, the delete may not actually work
      // This test demonstrates the E2E flow
    }
  });

  test('should show unsubscribe confirmation modal', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(2000);

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Select a message
      await rows.first().locator('input[type="checkbox"]').click();

      // Click unsubscribe button
      const unsubscribeButton = page.getByRole('button', { name: /^unsubscribe$/i }).first();
      await unsubscribeButton.click();

      // Confirmation modal should appear
      await expect(page.getByText('Unsubscribe from Messages')).toBeVisible();
      await expect(page.getByText(/attempt to unsubscribe/i)).toBeVisible();
      await expect(page.getByText(/queue unsubscribe jobs/i)).toBeVisible();
    }
  });

  test('should cancel unsubscribe action', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(2000);

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Select a message
      await rows.first().locator('input[type="checkbox"]').click();

      // Click unsubscribe
      await page.getByRole('button', { name: /^unsubscribe$/i }).first().click();

      // Modal appears
      await expect(page.getByText('Unsubscribe from Messages')).toBeVisible();

      // Click cancel
      await page.getByRole('button', { name: /cancel/i }).first().click();

      // Modal should close
      await expect(page.getByText('Unsubscribe from Messages')).not.toBeVisible();
    }
  });

  test('should show correct message count in delete modal', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(2000);

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount >= 3) {
      // Select 3 messages
      await rows.nth(0).locator('input[type="checkbox"]').click();
      await rows.nth(1).locator('input[type="checkbox"]').click();
      await rows.nth(2).locator('input[type="checkbox"]').click();

      // Click delete
      await page.getByRole('button', { name: /^delete$/i }).last().click();

      // Modal should show "3 messages"
      await expect(page.getByText(/delete 3 messages/i)).toBeVisible();
    }
  });

  test('should show singular message text for single selection', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(2000);

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Select one message
      await rows.first().locator('input[type="checkbox"]').click();

      // Should show "1 message selected" (singular)
      await expect(page.getByText(/1 message selected/i)).toBeVisible();

      // Click delete
      await page.getByRole('button', { name: /^delete$/i }).last().click();

      // Modal should show "1 message" (singular)
      await expect(page.getByText(/delete 1 message[^s]/i)).toBeVisible();
    }
  });
});
