import { test, expect } from '../fixtures';

const BASE = 'https://blog.txid.uk';

// 🔑 blog 는 2026-10-03 에 txid-web 에서 bc1qwerty/archive 로 옮겨 왔다. 거기 배포
//    워크플로의 스모크 잡은 `tests/<short>.spec.ts` 이름 규약으로만 스펙을 고르고,
//    **못 찾으면 배포를 실패시킨다**(검사 0건이 초록불이 되는 것을 막는 장치다).
//    그래서 이 파일이 있어야 blog 가 배포된다.
// 2026-11-10 부터 log.txid.uk(티스토리) 글의 noindex 사본이다. 글 수는 매시 동기화로
//   바뀌므로 개수는 단언하지 않고, 목록·카테고리 줄·검색 같은 **뼈대**를 본다.
test.describe('blog.txid.uk', () => {
  test('page loads', async ({ page }) => {
    const response = await page.goto(BASE + '/');
    expect(response!.status()).toBeLessThan(400);
    await expect(page).toHaveTitle(/.+/);
  });

  test('공용 헤더가 있고 언어 고르개는 없다', async ({ page }) => {
    await page.goto(BASE + '/');
    // 로고 자리에 사이트 이름(blog.txid.uk)을 둔다 — 예전 «txid.uk / Blog» 의 logo-sub 는 없앴다.
    await expect(page.locator('header .logo')).toHaveText('blog.txid.uk');
    // 한국어 한 벌짜리 사이트다 — 고르개가 보이면 없는 번역을 약속하는 셈이다.
    await expect(page.locator('.lang-dropdown')).toHaveCount(0);
    await expect(page.locator('#hamburger-panel .settings-lang-row')).toHaveCount(0);
  });

  test('테마 토글이 실제로 테마를 바꾼다', async ({ page }) => {
    await page.goto(BASE + '/');
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await page.click('#theme-btn');
    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
      .not.toBe(before);
  });

  test('스킵 링크가 실재하는 대상을 가리킨다', async ({ page }) => {
    await page.goto(BASE + '/');
    const skip = page.locator('a.skip-link');
    await expect(skip).toHaveCount(1);
    const href = await skip.getAttribute('href');
    expect(href).toBeTruthy();
    await expect(page.locator(href!)).toHaveCount(1);
  });

  test('카테고리 줄과 글 목록이 있고 글이 열린다', async ({ page }) => {
    await page.goto(BASE + '/');
    await expect(page.locator('header .cat-nav a')).not.toHaveCount(0);
    // 홈은 log.txid.uk 처럼 카테고리 상자에 제목만 나열한다 — 모양이 아니라 «글로 가는 링크»를 고른다.
    const first = page.locator('main a[href^="/post/"]').first();
    await expect(first).toBeVisible();
    const href = await first.getAttribute('href');
    const r = await page.goto(BASE + href!);
    expect(r!.status()).toBeLessThan(400);
    await expect(page.locator('article h1')).toBeVisible();
  });

  test('검색 색인이 서고 검색이 결과를 낸다', async ({ page }) => {
    await page.goto(BASE + '/search/?q=MSDS');
    await expect(page.locator('#results li').first()).toBeVisible();
  });

  test('RSS 가 선다', async ({ request }) => {
    const r = await request.get(BASE + '/rss.xml');
    expect(r.status()).toBeLessThan(400);
  });

  // 공개 글이 0편이면 사이트 전체가 noindex 이고 사이트맵이 없다(2026-10-10). 셋은 같은
  // 글 수로 정해지므로 서로 어긋나면 안 된다 — 첫 글 뒤에 noindex 가 남는 것이 최악이다.
  test('robots.txt·사이트맵·robots 메타가 서로 맞는다', async ({ request, page }) => {
    const robots = await (await request.get(BASE + '/robots.txt')).text();
    expect(robots).toContain('Allow: /');
    const hasSitemap = /^Sitemap:/m.test(robots);
    await page.goto(BASE + '/');
    const meta = await page.locator('meta[name="robots"]').getAttribute('content');
    if (hasSitemap) {
      expect(meta).not.toContain('noindex');
      const r = await request.get(BASE + '/sitemap-index.xml');
      expect(r.status()).toBeLessThan(400);
    } else {
      expect(meta).toContain('noindex');
    }
  });

  test('개인정보처리방침이 선다', async ({ page }) => {
    const r = await page.goto(BASE + '/privacy/');
    expect(r!.status()).toBeLessThan(400);
  });
});
