import { chromium, Browser, BrowserContext, Page } from 'playwright';

export type LocatorType = 'label' | 'role';

/**
 * PlaywrightClient - Automation client for web interactions
 * Maintains session state and provides simple methods for page interaction
 */
export class PlaywrightClient {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private defaultTimeout: number = 10000; // 10 seconds default timeout

  /**
   * Initialize browser and create a new page with persistent context
   */
  async initialize(options?: { headless?: boolean }): Promise<void> {
    this.browser = await chromium.launch({
      headless: options?.headless !== false, // Default to headless
    });

    // Create persistent context to maintain session
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });

    this.page = await this.context.newPage();
  }

  /**
   * Open a URL in the current page
   */
  async openPage(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('PlaywrightClient not initialized. Call initialize() first.');
    }

    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  /**
   * Get the current page content (DOM)
   */
  async getPageContent(): Promise<string> {
    if (!this.page) {
      throw new Error('PlaywrightClient not initialized. Call initialize() first.');
    }

    return await this.page.content();
  }

  /**
   * Get a screenshot of the current page as base64
   */
  async getScreenshot(): Promise<string> {
    if (!this.page) {
      throw new Error('PlaywrightClient not initialized. Call initialize() first.');
    }

    const screenshot = await this.page.screenshot({
      type: 'png',
      fullPage: true,
    });

    return screenshot.toString('base64');
  }

  /**
   * Fill an input field
   * @param locatorType - 'label' or 'role'
   * @param locatorValue - The label text or role name
   * @param value - The value to fill
   * @param roleOptions - Optional role options (name, exact) for role-based locators
   * @param timeout - Optional timeout in milliseconds (default: 30000)
   */
  async fill(
    locatorType: LocatorType,
    locatorValue: string,
    value: string,
    roleOptions?: { name?: string; exact?: boolean },
    timeout?: number
  ): Promise<void> {
    if (!this.page) {
      throw new Error('PlaywrightClient not initialized. Call initialize() first.');
    }

    const locator =
      locatorType === 'label'
        ? this.page.getByLabel(locatorValue)
        : this.page.getByRole(locatorValue as any, roleOptions ?? {});

    try {
      // Wait for element to be visible and editable
      await locator.waitFor({
        state: 'visible',
        timeout: timeout ?? this.defaultTimeout,
      });

      // Fill the input
      await locator.fill(value, { timeout: timeout ?? this.defaultTimeout });
    } catch (error) {
      const locatorDesc =
        locatorType === 'label'
          ? `label="${locatorValue}"`
          : `role="${locatorValue}"${roleOptions?.name ? ` name="${roleOptions.name}"` : ''}`;

      throw new Error(
        `Failed to fill element (${locatorDesc}): ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check a checkbox
   * @param locatorType - 'label' or 'role'
   * @param locatorValue - The label text or role name
   * @param roleOptions - Optional role options (name, exact) for role-based locators
   * @param timeout - Optional timeout in milliseconds (default: 30000)
   */
  async check(
    locatorType: LocatorType,
    locatorValue: string,
    roleOptions?: { name?: string; exact?: boolean },
    timeout?: number
  ): Promise<void> {
    if (!this.page) {
      throw new Error('PlaywrightClient not initialized. Call initialize() first.');
    }

    const locator =
      locatorType === 'label'
        ? this.page.getByLabel(locatorValue)
        : this.page.getByRole(locatorValue as any, roleOptions ?? {});

    try {
      // Wait for element to be visible and enabled
      await locator.waitFor({
        state: 'visible',
        timeout: timeout ?? this.defaultTimeout,
      });

      // Check the checkbox
      await locator.check({ timeout: timeout ?? this.defaultTimeout });
    } catch (error) {
      const locatorDesc =
        locatorType === 'label'
          ? `label="${locatorValue}"`
          : `role="${locatorValue}"${roleOptions?.name ? ` name="${roleOptions.name}"` : ''}`;

      throw new Error(
        `Failed to check element (${locatorDesc}): ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Select an option from a dropdown
   * @param locatorType - 'label' or 'role'
   * @param locatorValue - The label text or role name
   * @param value - The option value to select
   * @param roleOptions - Optional role options (name, exact) for role-based locators
   * @param timeout - Optional timeout in milliseconds (default: 30000)
   */
  async selectOption(
    locatorType: LocatorType,
    locatorValue: string,
    value: string,
    roleOptions?: { name?: string; exact?: boolean },
    timeout?: number
  ): Promise<void> {
    if (!this.page) {
      throw new Error('PlaywrightClient not initialized. Call initialize() first.');
    }

    const locator =
      locatorType === 'label'
        ? this.page.getByLabel(locatorValue)
        : this.page.getByRole(locatorValue as any, roleOptions ?? {});

    try {
      // Wait for element to be visible and enabled
      await locator.waitFor({
        state: 'visible',
        timeout: timeout ?? this.defaultTimeout,
      });

      // Select the option
      await locator.selectOption(value, { timeout: timeout ?? this.defaultTimeout });
    } catch (error) {
      const locatorDesc =
        locatorType === 'label'
          ? `label="${locatorValue}"`
          : `role="${locatorValue}"${roleOptions?.name ? ` name="${roleOptions.name}"` : ''}`;

      throw new Error(
        `Failed to select option in element (${locatorDesc}): ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Click an element
   * @param locatorType - 'label' or 'role'
   * @param locatorValue - The label text or role name
   * @param roleOptions - Optional role options (name, exact) for role-based locators
   * @param timeout - Optional timeout in milliseconds (default: 30000)
   */
  async click(
    locatorType: LocatorType,
    locatorValue: string,
    roleOptions?: { name?: string; exact?: boolean },
    timeout?: number
  ): Promise<void> {
    if (!this.page) {
      throw new Error('PlaywrightClient not initialized. Call initialize() first.');
    }

    const locator =
      locatorType === 'label'
        ? this.page.getByLabel(locatorValue)
        : this.page.getByRole(locatorValue as any, roleOptions ?? {});

    try {
      // Wait for element to be visible and attached to DOM
      await locator.waitFor({
        state: 'visible',
        timeout: timeout ?? this.defaultTimeout,
      });

      // Perform the click
      await locator.click({ timeout: timeout ?? this.defaultTimeout });
    } catch (error) {
      const locatorDesc =
        locatorType === 'label'
          ? `label="${locatorValue}"`
          : `role="${locatorValue}"${roleOptions?.name ? ` name="${roleOptions.name}"` : ''}`;

      throw new Error(
        `Failed to click element (${locatorDesc}): ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(): Promise<void> {
    if (!this.page) {
      throw new Error('PlaywrightClient not initialized. Call initialize() first.');
    }

    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Close the browser and cleanup resources
   */
  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }

    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Get the current page instance (for advanced usage)
   */
  getPage(): Page | null {
    return this.page;
  }
}
