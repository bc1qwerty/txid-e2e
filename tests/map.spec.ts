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

  test('layer switching (Lightning/Mining) works', async ({ page }) => {
    // Old tab UI was replaced by layer chips (nav.layer-chips, aria-pressed toggles)
    await page.goto(`${BASE}/en/`);
    await page.waitForLoadState('load');

    const chips = page.locator('.layer-chip');
    const count = await chips.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const lightning = page.locator('.layer-chip[data-layer="ln"]');
    const mining = page.locator('.layer-chip[data-layer="mining"]');

    // Lightning layer is active by default
    await expect(lightning).toHaveAttribute('aria-pressed', 'true');
    await expect(mining).toHaveAttribute('aria-pressed', 'false');

    // Wait for hydration, then switch to the Mining layer
    await page.waitForTimeout(500);
    await mining.click();

    await expect(mining).toHaveAttribute('aria-pressed', 'true');
    await expect(lightning).toHaveAttribute('aria-pressed', 'false');
  });
});
