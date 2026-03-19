import { test, expect } from '@playwright/test';

const BASE = 'https://tx.txid.uk/en/';

test.describe('tx.txid.uk - Transaction Tools', () => {
  test('page loads with 3 tabs', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/`);
    expect(response!.status()).toBeLessThan(400);

    const tabs = page.locator('.tab-btn, [role="tab"], button[data-tab]');
    const count = await tabs.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('tab switching works (Broadcast, Decode, Lookup)', async ({ page }) => {
    await page.goto(`${BASE}/en/`);
    const tabs = page.locator('.tab-btn, [role="tab"], button[data-tab]');

    // Click each tab and verify it becomes selected
    const tabCount = await tabs.count();
    for (let i = 0; i < Math.min(tabCount, 3); i++) {
      await tabs.nth(i).click();
      await page.waitForTimeout(300);

      const ariaSelected = await tabs.nth(i).getAttribute('aria-selected');
      expect(ariaSelected).toBe('true');
    }
  });

  test('ARIA attributes present (role="tab", aria-selected)', async ({ page }) => {
    await page.goto(`${BASE}/en/`);

    // Check tablist exists
    const tablist = page.locator('[role="tablist"]');
    await expect(tablist.first()).toBeVisible();

    // Check tabs have proper ARIA
    const tabs = page.locator('.tab-btn, [role="tab"], button[data-tab]');
    const firstTab = tabs.first();
    const ariaSelected = await firstTab.getAttribute('aria-selected');
    expect(ariaSelected).toBeTruthy();

    // Check tabpanels exist
    const tabpanels = page.locator('[role="tabpanel"]');
    const panelCount = await tabpanels.count();
    expect(panelCount).toBeGreaterThanOrEqual(1);
  });
});
