import { test, expect } from '@playwright/test';

/**
 * E2E tests for authentication flow
 * NOTE: Authentication is bypassed in test mode via E2E_TEST_MODE environment variable
 */

test.describe('Authentication', () => {
  test('should allow access to dashboard in test mode', async ({ page }) => {
    // In test mode, authentication is bypassed
    await page.goto('/');

    // Should show dashboard elements (Email Categories section)
    await expect(page.getByText('Email Categories')).toBeVisible();
  });

  test('should display sign-in page when accessed directly', async ({ page }) => {
    await page.goto('/auth/signin');

    // Check for sign-in elements
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
  });
});

test.describe('Authenticated Access', () => {
  test('should have navigation elements', async ({ page }) => {
    await page.goto('/');

    // Look for navigation or user interface elements
    // Dashboard should be accessible in test mode
    await expect(page.getByText('Email Categories')).toBeVisible();
  });
});
