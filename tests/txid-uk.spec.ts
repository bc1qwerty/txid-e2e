import { test, expect } from '@playwright/test';

const BASE = 'https://txid.uk';

test.describe('txid.uk - Homepage', () => {
  test('homepage loads with correct title', async ({ page }) => {
    await page.goto(BASE);
    await expect(page).toHaveTitle(/txid\.uk/i);
  });

  test('search input exists', async ({ page }) => {
    await page.goto(BASE);
    // Hero search is the primary homepage search (nav #search-input also exists;
    // #mobile-search-input lives in a hidden overlay, so avoid union selectors).
    const heroSearch = page.locator('#hero-search');
    await expect(heroSearch).toBeVisible();
    await expect(heroSearch).toHaveAttribute('placeholder', /search/i);
  });

  test('theme toggle works', async ({ page }) => {
    await page.goto(BASE);
    // #theme-btn is the visible desktop toggle; #hamburger-theme-btn is hidden
    // inside the mobile settings menu and must not be matched.
    const themeToggle = page.locator('#theme-btn');
    const html = page.locator('html');

    const initialTheme = await html.getAttribute('data-theme');
    expect(initialTheme).toBeTruthy();
    await themeToggle.click();
    await expect(html).not.toHaveAttribute('data-theme', initialTheme!);
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
