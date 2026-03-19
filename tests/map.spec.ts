import { test, expect } from '@playwright/test';

const BASE = 'https://map.txid.uk';

test.describe('map.txid.uk - Bitcoin World Map', () => {
  test('English page loads', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/`);
    expect(response!.status()).toBeLessThan(400);
    await expect(page).toHaveTitle(/.+/);
  });

  test('globe canvas exists', async ({ page }) => {
    await page.goto(`${BASE}/en/`);
    await page.waitForLoadState('domcontentloaded');

    const canvas = page.locator('canvas, [class*="globe"], #globe, [id*="globe"]');
    const count = await canvas.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('country list renders', async ({ page }) => {
    await page.goto(`${BASE}/en/`);
    await page.waitForLoadState('domcontentloaded');

    const countryItems = page.locator('[class*="country"], li, tr, [class*="list"] > *');
    const count = await countryItems.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('tab switching (Lightning/Mining) works', async ({ page }) => {
    await page.goto(`${BASE}/en/`);
    await page.waitForLoadState('domcontentloaded');

    const tabs = page.locator('[role="tab"], button:has-text("Lightning"), button:has-text("Mining"), [class*="tab"] button, [class*="tab"] a');
    const count = await tabs.count();

    if (count >= 2) {
      // Click the second tab
      await tabs.nth(1).click();
      await page.waitForTimeout(500);

      // Verify tab changed (aria-selected or active class)
      const isSelected = await tabs.nth(1).getAttribute('aria-selected');
      const hasActive = await tabs.nth(1).getAttribute('class');

      expect(
        isSelected === 'true' || hasActive?.includes('active') || hasActive?.includes('selected')
      ).toBeTruthy();
    }
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
