import { test, expect } from '@playwright/test';

const BASE = 'https://sim.txid.uk';

test.describe('sim.txid.uk - Bitcoin Simulator', () => {
  test('homepage loads with 6 module cards', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/`);
    expect(response!.status()).toBeLessThan(400);

    const cards = page.locator('.module-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(6);
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

  test('transaction builder module link works', async ({ page }) => {
    // Old /en/transaction/ route was renamed to /en/tx-builder/
    const response = await page.goto(`${BASE}/en/tx-builder/`);
    expect(response!.status()).toBeLessThan(400);
    await expect(page).toHaveTitle(/transaction builder/i);
  });

  test('merkle module link works', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/merkle/`);
    expect(response!.status()).toBeLessThan(400);
    await expect(page).toHaveTitle(/merkle/i);
  });

  test('blockchain module link works', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/blockchain/`);
    expect(response!.status()).toBeLessThan(400);
  });
});
