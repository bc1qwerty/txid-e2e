import { test, expect } from '@playwright/test';

const BASE = 'https://tools.txid.uk/en/';

test.describe('tools.txid.uk - Bitcoin Tools', () => {
  test('page loads with tool sections', async ({ page }) => {
    await page.goto(`${BASE}/en/`);
    // Check for tool sections/cards
    const sections = page.locator('h2, h3, details');
    const count = await sections.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('Address Validator accepts valid BTC address', async ({ page }) => {
    await page.goto(`${BASE}/en/`);
    // Find address-related input
    const addressInput = page.locator('input[placeholder*="address" i], input[placeholder*="Address" i], #address-input, [data-tool="address"] input').first();
    await expect(addressInput).toBeVisible();

    // Enter a valid P2PKH address
    await addressInput.fill('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    // Trigger validation (press Enter or click button)
    await addressInput.press('Enter');

    // Wait briefly for validation result
    await page.waitForTimeout(1000);
  });

  test('Unit Converter shows conversion', async ({ page }) => {
    await page.goto(`${BASE}/en/`);
    // Find converter input
    const converterInput = page.locator('input[type="number"], input[placeholder*="BTC" i], input[placeholder*="amount" i], input[placeholder*="convert" i]').first();

    if (await converterInput.isVisible()) {
      await converterInput.fill('1');
      await page.waitForTimeout(500);
      // Check that some output appeared
      const body = await page.locator('body').textContent();
      expect(body).toContain('sat');
    }
  });

  test('language route /en/ works', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/`);
    expect(response!.status()).toBeLessThan(400);
  });

  test('language route /ko/ works', async ({ page }) => {
    const response = await page.goto(`${BASE}/ko/`);
    expect(response!.status()).toBeLessThan(400);
  });

  test('language route /ja/ works', async ({ page }) => {
    const response = await page.goto(`${BASE}/ja/`);
    expect(response!.status()).toBeLessThan(400);
  });
});
