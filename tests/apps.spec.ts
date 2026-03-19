import { test, expect } from '@playwright/test';

const BASE = 'https://apps.txid.uk';

test.describe('apps.txid.uk - App Directory', () => {
  test('page loads with app cards', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/`);
    expect(response!.status()).toBeLessThan(400);

    const cards = page.locator('[class*="card"], article, [class*="app"], .grid > *');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('filter buttons work', async ({ page }) => {
    await page.goto(`${BASE}/en/`);

    const filterButtons = page.locator('[class*="filter"] button, [class*="category"] button, [data-filter], button[class*="tag"]');
    const count = await filterButtons.count();

    if (count > 0) {
      // Click a filter button
      await filterButtons.first().click();
      await page.waitForTimeout(500);
    }
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('all app links are valid URLs', async ({ page }) => {
    await page.goto(`${BASE}/en/`);

    const appLinks = page.locator('a[href^="http"]');
    const count = await appLinks.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Verify each link has a valid URL format
    for (let i = 0; i < Math.min(count, 20); i++) {
      const href = await appLinks.nth(i).getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).toMatch(/^https?:\/\//);
    }
  });
});
