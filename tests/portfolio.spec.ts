import { test, expect } from '@playwright/test';

const BASE = 'https://portfolio.txid.uk/en/';

test.describe('portfolio.txid.uk - Portfolio Tracker', () => {
  test('page loads', async ({ page }) => {
    const response = await page.goto(BASE);
    expect(response!.status()).toBeLessThan(400);
    await expect(page).toHaveTitle(/Portfolio Tracker/);
  });

  test('add address input exists', async ({ page }) => {
    await page.goto(BASE);
    const input = page.locator('#addr-input');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', /address/i);
  });

  test('theme toggle works', async ({ page }) => {
    await page.goto(BASE);
    const themeToggle = page.locator('#theme-btn');
    await expect(themeToggle).toBeVisible();
    const html = page.locator('html');
    const initialTheme = await html.getAttribute('data-theme');
    await themeToggle.click();
    await expect(html).not.toHaveAttribute('data-theme', initialTheme!);
  });
});
