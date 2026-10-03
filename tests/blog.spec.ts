import { test, expect } from '../fixtures';

const BASE = 'https://blog.txid.uk';

// 🔑 blog 는 2026-10-03 에 txid-web 에서 bc1qwerty/archive 로 옮겨 왔다. 거기 배포
//    워크플로의 스모크 잡은 `tests/<short>.spec.ts` 이름 규약으로만 스펙을 고르고,
//    **못 찾으면 배포를 실패시킨다**(검사 0건이 초록불이 되는 것을 막는 장치다).
//    그래서 이 파일이 있어야 blog 가 배포된다.
// ⚠ 글이 아직 한 편도 없다(src/content/posts 가 비어 있다). 글 목록을 단언하면
//   첫 글이 올라오기 전까지 영영 빨간불이라, 여기서는 **글과 무관한 뼈대**만 본다.
test.describe('blog.txid.uk', () => {
  test('page loads', async ({ page }) => {
    const response = await page.goto(BASE + '/');
    expect(response!.status()).toBeLessThan(400);
    await expect(page).toHaveTitle(/.+/);
  });

  test('공용 헤더가 있고 언어 고르개는 없다', async ({ page }) => {
    await page.goto(BASE + '/');
    await expect(page.locator('header .logo')).toBeVisible();
    await expect(page.locator('header .logo-sub')).toHaveText('Blog');
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

  test('RSS 와 사이트맵이 선다', async ({ request }) => {
    for (const p of ['/rss.xml', '/sitemap-index.xml']) {
      const r = await request.get(BASE + p);
      expect(r.status(), p).toBeLessThan(400);
    }
  });

  test('개인정보처리방침이 선다', async ({ page }) => {
    const r = await page.goto(BASE + '/privacy/');
    expect(r!.status()).toBeLessThan(400);
  });
});
