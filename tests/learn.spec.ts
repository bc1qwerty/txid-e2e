import { test, expect } from '@playwright/test';

const BASE = 'https://learn.txid.uk';

test.describe('learn.txid.uk - Education Site', () => {
  test('English page loads', async ({ page }) => {
    await page.goto(`${BASE}/en/`);
    await expect(page.locator('body')).toContainText(/bitcoin|blockchain|learn/i);
  });

  test('Korean page loads', async ({ page }) => {
    await page.goto(`${BASE}/ko/`);
    await expect(page.locator('body')).toContainText(/비트코인|블록체인|학습/);
  });

  test('Japanese page loads', async ({ page }) => {
    await page.goto(`${BASE}/ja/`);
    await expect(page.locator('body')).toContainText(/ビットコイン|ブロックチェーン|学/);
  });

  test('navigation menu exists', async ({ page }) => {
    await page.goto(`${BASE}/en/`);
    const nav = page.locator('nav');
    await expect(nav.first()).toBeVisible();
  });

  test('footer links work', async ({ page }) => {
    await page.goto(`${BASE}/en/`);
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    const footerLinks = footer.locator('a[href]');
    const count = await footerLinks.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Verify first footer link has a valid href
    const href = await footerLinks.first().getAttribute('href');
    expect(href).toBeTruthy();
  });
});
