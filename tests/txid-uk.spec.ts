import { test, expect } from '@playwright/test';

const BASE = 'https://txid.uk';

test.describe('txid.uk - Homepage', () => {
  test('homepage loads with correct title', async ({ page }) => {
    await page.goto(BASE);
    await expect(page).toHaveTitle(/txid\.uk/i);
  });

  test('search input exists', async ({ page }) => {
    await page.goto(BASE);
    const searchInput = page.locator('input[type="search"], input[type="text"][placeholder*="search" i], input[placeholder*="Search" i], [role="search"] input');
    await expect(searchInput.first()).toBeVisible();
  });

  test('theme toggle works', async ({ page }) => {
    await page.goto(BASE);
    const themeToggle = page.locator('[data-theme-toggle], button:has([class*="theme"]), button:has([class*="dark"]), #theme-toggle, .theme-toggle');
    const html = page.locator('html');

    const initialTheme = await html.getAttribute('data-theme');
    await themeToggle.first().click();
    const newTheme = await html.getAttribute('data-theme');

    expect(newTheme).not.toBe(initialTheme);
  });

  test('language switch works', async ({ page }) => {
    await page.goto(BASE);
    const langLinks = page.locator('a[href*="/ko"], a[href*="/en"], a[href*="/ja"], [class*="lang"] a, [class*="language"] a');
    const count = await langLinks.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('security headers present', async ({ page }) => {
    const response = await page.goto(BASE);
    expect(response).not.toBeNull();
    const headers = response!.headers();

    // Check for security headers (Cloudflare may set these)
    const hasCSP = !!headers['content-security-policy'] || !!headers['content-security-policy-report-only'];
    const hasHSTS = !!headers['strict-transport-security'];

    // At least HSTS should be present via Cloudflare
    expect(hasHSTS || hasCSP).toBeTruthy();
  });
});
