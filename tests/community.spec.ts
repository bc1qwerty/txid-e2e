import { test, expect } from '../fixtures';

const BASE = 'https://community.txid.uk';

// community.txid.uk is a Next.js app: post lists/details are fetched client-side
// from api.txid.uk, so data-dependent assertions use generous timeouts.
// Internal post links use href^="/post/" (news sidebar links go to news.txid.uk).
const LOAD_TIMEOUT = 20000;

test.describe('community.txid.uk - Community Board (Lightning paywall)', () => {
  test('homepage loads with header and main navigation', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await expect(page).toHaveTitle(/TXID Community/);
    await expect(page.locator('header')).toBeVisible();
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();
    await expect(nav.locator('a[href="/board/free/"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Toggle theme"]')).toBeVisible();
  });

  test('board list loads and renders post items', async ({ page }) => {
    await page.goto(`${BASE}/board/free/`);
    const postLinks = page.locator('article a[href^="/post/"]');
    await expect(postLinks.first()).toBeVisible({ timeout: LOAD_TIMEOUT });
    const count = await postLinks.count();
    expect(count).toBeGreaterThanOrEqual(1);
    const title = await postLinks.first().textContent();
    expect(title?.trim().length).toBeGreaterThan(0);
  });

  test('board tab navigation renders board categories', async ({ page }) => {
    await page.goto(`${BASE}/board/free/`);
    const tabs = page.locator('nav[aria-label="Board navigation"] a[role="tab"]');
    await expect(tabs.first()).toBeVisible({ timeout: LOAD_TIMEOUT });
    const count = await tabs.count();
    expect(count).toBeGreaterThanOrEqual(3);
    await expect(
      page.locator('nav[aria-label="Board navigation"] a[href="/board/discussions/"]'),
    ).toBeVisible();
  });

  test('post detail page renders title and comments section', async ({ page }) => {
    await page.goto(`${BASE}/board/free/`);
    const firstPost = page.locator('article a[href^="/post/"]').first();
    await expect(firstPost).toBeVisible({ timeout: LOAD_TIMEOUT });
    const href = await firstPost.getAttribute('href');
    expect(href).toBeTruthy();

    await page.goto(`${BASE}${href}`);
    const heading = page.locator('h1');
    await expect(heading.first()).toBeVisible({ timeout: LOAD_TIMEOUT });
    const headingText = await heading.first().textContent();
    expect(headingText?.trim().length).toBeGreaterThan(0);
    await expect(page.locator('h2', { hasText: /Comments/ }).first()).toBeVisible({
      timeout: LOAD_TIMEOUT,
    });
  });

  test('paywalled post shows lock badge in list and LockCard on detail', async ({ page }) => {
    await page.goto(`${BASE}/board/free/`);
    await expect(page.locator('article a[href^="/post/"]').first()).toBeVisible({
      timeout: LOAD_TIMEOUT,
    });

    // PaywallBadge: span[aria-label="<N> sats — Paywalled"] with lock icon
    const lockedArticles = page.locator('article', {
      has: page.locator('span[aria-label*="Paywalled"]'),
    });
    const lockedCount = await lockedArticles.count();
    test.skip(lockedCount === 0, 'no paywalled post in public list');

    const badge = lockedArticles.first().locator('span[aria-label*="Paywalled"]');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText(/sats/);

    // Navigate to the locked post detail and verify the LockCard.
    // NEVER click the unlock button (would create a Lightning invoice).
    const href = await lockedArticles.first().locator('a[href^="/post/"]').getAttribute('href');
    expect(href).toBeTruthy();
    await page.goto(`${BASE}${href}`);

    await expect(page.locator('h2', { hasText: 'Continue reading' })).toBeVisible({
      timeout: LOAD_TIMEOUT,
    });
    await expect(page.locator('text=/Pay \\d+ sats to unlock/').first()).toBeVisible();
    await expect(page.locator('button', { hasText: /unlock/i }).first()).toBeVisible();
  });

  test('write page requires login when logged out', async ({ page }) => {
    await page.goto(`${BASE}/write/`);
    await expect(page.locator('h1', { hasText: 'Login required' })).toBeVisible({
      timeout: LOAD_TIMEOUT,
    });
    await expect(page.locator('text=Sign in to continue').first()).toBeVisible();
  });

  test('theme toggle switches between dark and light', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    const toggle = page.locator('button[aria-label="Toggle theme"]');
    await expect(toggle).toBeVisible();

    const before = (await page.locator('html').getAttribute('class')) || '';
    const wasDark = /\bdark\b/.test(before);
    await toggle.click();
    await expect(page.locator('html')).toHaveClass(wasDark ? /light/ : /dark/, {
      timeout: LOAD_TIMEOUT,
    });
  });
});
