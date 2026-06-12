import { test, expect } from '@playwright/test';

const BASE = 'https://apps.txid.uk';

test.describe('apps.txid.uk - App Directory', () => {
  test('page loads with app cards', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/`);
    expect(response!.status()).toBeLessThan(400);

    const cards = page.locator('a.app-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('category sections group app cards', async ({ page }) => {
    // The old interactive filter buttons were removed when the site was
    // refactored to the [lang]/[app].astro content collection structure.
    // Apps are now grouped into static category sections instead.
    await page.goto(`${BASE}/en/`);

    const sections = page.locator('section.category-section');
    expect(await sections.count()).toBeGreaterThanOrEqual(4);

    for (const category of ['platform', 'bot', 'app', 'dev']) {
      const section = page.locator(`#app-grid-${category}`);
      await expect(section.locator('h2')).toBeVisible();

      const cards = section.locator(`a.app-card[data-category="${category}"]`);
      expect(await cards.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('app cards link to valid detail pages', async ({ page }) => {
    await page.goto(`${BASE}/en/`);

    const cards = page.locator('a.app-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Cards now point to internal detail routes (/en/<slug>/)
    for (let i = 0; i < Math.min(count, 20); i++) {
      const href = await cards.nth(i).getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).toMatch(/^\/en\/[a-z0-9-]+\/$/);
    }

    // Navigating into the first card opens an app detail page
    await cards.first().click();
    await expect(page.locator('h1.detail-title')).toBeVisible();
    expect(page.url()).toMatch(/^https:\/\/apps\.txid\.uk\/en\/[a-z0-9-]+\/$/);
  });
});
