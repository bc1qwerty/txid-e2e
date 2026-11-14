import { test, expect } from '../fixtures';

const BASE = 'https://news.txid.uk';

// 2026-11-04 메인이 신문 1면(마스트헤드·티저 칸·기사 모달)에서 최신순 블로그형으로
// 바뀌었다(news.txid.uk b173388): 최신 1편(h2) + 목록(h3) + 사이드바 «Daily digest».
// 기사 모달도 없어져 제목을 누르면 /post/ 페이지로 바로 간다.
test.describe('news.txid.uk - Front Page', () => {
  test('site title is the page h1', async ({ page }) => {
    const res = await page.goto(`${BASE}/`);
    // h1 은 sr-only 이고 하이드레이션이 다시 채운다 — 서버가 준 원문에 있어야 검색엔진이 읽는다.
    expect(await res!.text()).toMatch(/<h1[^>]*>\s*TXID News/i);
    await expect(page.locator('main h1')).toHaveText(/TXID News/i);
  });

  test('front page shows the latest post and a list of posts', async ({ page }) => {
    await page.goto(`${BASE}/`);
    const lead = page.locator('main article').first();
    const leadLink = lead.locator('h2 a[href^="/post/"]');
    await expect(leadLink).toBeVisible();
    expect((await leadLink.textContent())!.trim().length).toBeGreaterThan(10);
    await expect(lead.locator('a[href^="/category/"]').first()).toHaveText(
      /bitcoin|macro|politics|opinion/i
    );
    // 최신 1편 + 목록(14편 안팎)
    expect(await page.locator('main article h3 a[href^="/post/"]').count()).toBeGreaterThanOrEqual(10);
  });

  test('sidebar shows the daily digest', async ({ page }) => {
    await page.goto(`${BASE}/`);
    const digest = page.locator('main details').filter({ hasText: 'Daily digest' });
    await expect(digest).toHaveCount(1);
    await expect(digest.locator('a[href^="/digest/"]')).toHaveAttribute('href', /\/digest\/\d{4}-\d{2}-\d{2}$/);
  });

  test('clicking the latest post opens its article page', async ({ page }) => {
    await page.goto(`${BASE}/`);
    const leadLink = page.locator('main article').first().locator('h2 a[href^="/post/"]');
    const headline = (await leadLink.textContent())!.trim();
    const href = await leadLink.getAttribute('href');
    await leadLink.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.locator('article')).toBeVisible();
    await expect(page.locator('article')).toContainText(headline.slice(0, 40));
  });

  test('header nav links to category pages', async ({ page }) => {
    await page.goto(`${BASE}/`);
    const nav = page.locator('header nav');
    await expect(nav.locator('a[href="/category/bitcoin"]')).toBeVisible();
    await expect(nav.locator('a[href="/category/macro"]')).toBeVisible();
    await expect(nav.locator('a[href="/category/politics"]')).toBeVisible();
  });

  test('category page /category/bitcoin renders post list', async ({ page }) => {
    const response = await page.goto(`${BASE}/category/bitcoin`);
    expect(response!.status()).toBe(200);
    await expect(page.locator('h1').first()).toHaveText(/bitcoin/i);
    const postLinks = page.locator('a[href^="/post/"]');
    // 한 쪽에 12편.
    expect(await postLinks.count()).toBeGreaterThanOrEqual(8);
  });

  test('macro and politics category routes work', async ({ page }) => {
    const macro = await page.goto(`${BASE}/category/macro`);
    expect(macro!.status()).toBe(200);
    await expect(page.locator('h1').first()).toHaveText(/macro/i);

    const politics = await page.goto(`${BASE}/category/politics`);
    expect(politics!.status()).toBe(200);
    await expect(page.locator('h1').first()).toHaveText(/politics/i);
  });

  test('individual post page renders with h1 title', async ({ page }) => {
    // Pick the newest post from the category list instead of hardcoding a slug
    await page.goto(`${BASE}/category/bitcoin`);
    const href = await page.locator('a[href^="/post/"]').first().getAttribute('href');
    expect(href).toBeTruthy();

    const response = await page.goto(`${BASE}${href}`);
    expect(response!.status()).toBe(200);
    await expect(page.locator('article')).toBeVisible();
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    expect((await h1.textContent())!.trim().length).toBeGreaterThan(5);
  });

  test('txt-feed.json and feed.xml are served', async ({ request }) => {
    const txt = await request.get(`${BASE}/txt-feed.json`);
    expect(txt.status()).toBe(200);
    const json = await txt.json();
    expect(json.source).toBe('news.txid.uk');
    expect(Array.isArray(json.posts)).toBe(true);
    // 2026-11 기준 약 400편. 통째로 줄어든 것을 잡을 만큼만.
    expect(json.posts.length).toBeGreaterThan(200);

    const rss = await request.get(`${BASE}/feed.xml`);
    expect(rss.status()).toBe(200);
    const xml = await rss.text();
    expect(xml).toContain('<rss');
    expect((xml.match(/<item>/g) || []).length, 'feed.xml 의 item 수').toBeGreaterThanOrEqual(20);
  });
});
