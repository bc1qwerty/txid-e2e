import { test, expect } from '../fixtures';

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

  // 헤더의 로그인 단추는 api.txid.uk 의 SDK 가 그린다 — SDK 가 404 면 전 사이트에서 로그인이 사라진다.
  test.describe('login surface', () => {
    test.use({ liveAuth: true });
    test('header shows the login button drawn by the auth SDK', async ({ page }) => {
      await page.goto(BASE);
      await expect(page.locator('.txid-auth-btn:visible').first()).toBeVisible({ timeout: 15_000 });
    });
  });

  // 사이트 간 검색(Ctrl+Shift+K). 스크립트가 빠지면 단축키가 조용히 아무 일도 안 한다.
  test('platform search opens and finds a tool', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('load');
    await page.keyboard.press('Control+Shift+K');
    const input = page.locator('#ps-input');
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill('address');
    await expect(page.locator('#ps-results a').first()).toBeVisible();
  });

  test('footer and canonical are present', async ({ page }) => {
    const res = await page.goto(BASE);
    expect(await res!.text()).toMatch(/<link[^>]*rel="canonical"[^>]*href="https:\/\/txid\.uk\/"/);
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
    expect(await footer.locator('a[href]').count()).toBeGreaterThanOrEqual(3);
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
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.locator('#lang-btn').click();
    await page.locator('#lang-menu button[data-lang="ko"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  });

  test('security headers present', async ({ page }) => {
    const response = await page.goto(BASE);
    expect(response).not.toBeNull();
    const headers = response!.headers();

    // Check for security headers (Cloudflare may set these)
    // report-only 만 남으면 아무것도 막지 않는다 — 강제 헤더여야 한다.
    const hasCSP = !!headers['content-security-policy'];
    const hasHSTS = !!headers['strict-transport-security'];

    expect(hasHSTS, 'HSTS').toBeTruthy();
    expect(hasCSP, 'CSP').toBeTruthy();
  });
});
