import { Page } from '@playwright/test';

/**
 * BasePage
 * Thin base class – holds the Playwright Page reference and provides the two
 * helpers that every page object genuinely shares: navigation and a controlled
 * pause. All element interactions belong in the concrete page object so that
 * typed Locators (not raw selector strings) are used throughout.
 */
export class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** Navigate to a URL relative to baseURL (or an absolute URL). */
  async navigateTo(url: string): Promise<void> {
    await this.page.goto(url);
  }

  /** Explicit wait – use sparingly and only when a network/event-based wait is not possible. */
  protected async pause(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }
}
