import { test, expect } from '@playwright/test';

const BASE = 'https://sim.txid.uk';

test.describe('sim.txid.uk - Bitcoin Simulator', () => {
  test('homepage loads with 5 module cards', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/`);
    expect(response!.status()).toBeLessThan(400);

    const cards = page.locator('[class*="card"], article, [class*="module"], .grid > a, .grid > div');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('hash module link works', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/hash/`);
    expect(response!.status()).toBeLessThan(400);
    await expect(page.locator('body')).toContainText(/hash/i);
  });

  test('mining module link works', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/mining/`);
    expect(response!.status()).toBeLessThan(400);
    await expect(page.locator('body')).toContainText(/min/i);
  });

  test('keys module link works', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/keys/`);
    expect(response!.status()).toBeLessThan(400);
  });

  test('transaction module link works', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/transaction/`);
    expect(response!.status()).toBeLessThan(400);
  });

  test('blockchain module link works', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/blockchain/`);
    expect(response!.status()).toBeLessThan(400);
  });
});
