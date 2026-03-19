import { test, expect } from '@playwright/test';

const BASE = 'https://macro.txid.uk';

test.describe('macro.txid.uk - Macro Dashboard', () => {
  test('dashboard loads', async ({ page }) => {
    const response = await page.goto(BASE);
    expect(response!.status()).toBeLessThan(400);
    await expect(page).toHaveTitle(/.+/);
  });

  test('crypto section has BTC price placeholder', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('domcontentloaded');

    const btcSection = page.locator('text=/BTC|Bitcoin|비트코인/i');
    const count = await btcSection.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('news tabs exist', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('domcontentloaded');

    const tabs = page.locator('[role="tab"], [class*="tab"] button, [class*="tab"] a, button:has-text("News"), button:has-text("뉴스")');
    const count = await tabs.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('Network section exists', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('domcontentloaded');

    const networkSection = page.locator('text=/network|네트워크|hashrate|difficulty|mempool/i');
    const count = await networkSection.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
