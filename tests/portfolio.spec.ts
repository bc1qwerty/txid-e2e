import { test, expect } from '@playwright/test';

const BASE = 'https://portfolio.txid.uk/en/';

test.describe('portfolio.txid.uk - Portfolio Tracker', () => {
  test('page loads', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/`);
    expect(response!.status()).toBeLessThan(400);
    await expect(page).toHaveTitle(/.+/);
  });

  test('add address input exists', async ({ page }) => {
    await page.goto(`${BASE}/en/`);
    const input = page.locator('input[placeholder*="address" i], input[placeholder*="Address" i], input[type="text"], #address-input, [class*="address"] input');
    await expect(input.first()).toBeVisible();
  });

  test('theme toggle works', async ({ page }) => {
    await page.goto(`${BASE}/en/`);
    const themeToggle = page.locator('[data-theme-toggle], button:has([class*="theme"]), button:has([class*="dark"]), #theme-toggle, .theme-toggle, button[aria-label*="theme" i]');
    const html = page.locator('html');

    if (await themeToggle.count() > 0) {
      const initialTheme = await html.getAttribute('data-theme');
      await themeToggle.first().click();
      const newTheme = await html.getAttribute('data-theme');
      expect(newTheme).not.toBe(initialTheme);
    }
  });
});
