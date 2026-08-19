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

  // Layer switching is a MOBILE affordance. The Lightning/Mining buttons live in
  // #mobile-tab-overlay, which carries .mobile-only (display:none above 768px in
  // global.css). On desktop there is nothing to switch: the quad view shows the
  // ln / mining / fullnode / isp cells side by side at once.
  //
  // This spec previously looked for `.layer-chip[data-layer]` with aria-pressed
  // toggles. No such markup exists on the site — it asserted an interface that
  // was never built, so it failed on every run rather than catching a regression.
  test('layer switching (Lightning/Mining) works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/en/`);
    await page.waitForLoadState('load');

    const lightning = page.locator('#tab-ln');
    const mining = page.locator('#tab-mining');
    await expect(lightning).toBeVisible();
    await expect(mining).toBeVisible();

    // What switchTab() does, and what can actually be observed here:
    //  - moves .active between the two tab buttons          <- asserted
    //  - sets inline display on every .ln-only section      <- asserted
    //  - shows #mining-period-wrap, re-renders the globe    <- NOT assertable
    // The last group is out of reach in CI: that UI is built inside init(),
    // after waitForThree()/initGlobe(), and headless chromium has no WebGL, so
    // init() bails and the element is never created. toBeVisible() on the
    // .ln-only sections is no good either — they sit in .map-left-col, which is
    // display:none below 1280px. The inline style is the honest probe: it is
    // set by switchTab() itself and does not depend on layout or the globe.
    const lnOnlyDisplay = () =>
      page.$$eval('.ln-only', (els) => els.map((el) => (el as HTMLElement).style.display));

    await expect(lightning).toHaveClass(/active/);
    await expect(mining).not.toHaveClass(/active/);

    await mining.click();

    await expect(mining).toHaveClass(/active/);
    await expect(lightning).not.toHaveClass(/active/);
    const hidden = await lnOnlyDisplay();
    expect(hidden.length).toBeGreaterThanOrEqual(1);
    expect(hidden.every((d) => d === 'none')).toBe(true);

    // ...and switching back clears it again.
    await lightning.click();
    await expect(lightning).toHaveClass(/active/);
    await expect(mining).not.toHaveClass(/active/);
    expect((await lnOnlyDisplay()).every((d) => d === '')).toBe(true);
  });

  test('desktop shows every layer at once instead of switching', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE}/en/`);
    await page.waitForLoadState('load');

    // The counterpart to the test above: no tab overlay on desktop, and all four
    // quad cells are present. If a desktop layer switcher is ever added, this is
    // the test that should be rewritten rather than the mobile one.
    await expect(page.locator('#mobile-tab-overlay')).toBeHidden();
    for (const quad of ['ln', 'mining', 'fullnode', 'isp']) {
      await expect(page.locator(`.quad-cell[data-quad="${quad}"]`)).toBeVisible();
    }
  });
});
