import { test, expect } from '../fixtures';

const BASE = 'https://social.txid.uk';
const API = BASE + '/api/u/bc1qwerty';

// 2026-11-22 신설(archive apps/social). 운동 기록 — 이름별 페이지 /@<NIP-05 이름>. 누구나 보는 요약(/api/u/<이름>/public)과
// 주인 계정만 보는 상세(/api/u/<이름>/private, Pages Function 이 api.txid.uk/auth/me 의 계정 번호로 판정)가 따로다.
// 🔑 이 파일이 있어야 archive 배포 워크플로가 social 을 배포한다(tests/<short>.spec.ts 규약).
// 기록 수는 GPX 를 올릴 때마다 바뀌므로 개수는 단언하지 않는다.
test.describe('social.txid.uk', () => {
  test('첫 주소는 메인 이름 페이지로 넘긴다', async ({ request }) => {
    const r = await request.get(BASE + '/', { maxRedirects: 0 });
    expect(r.status()).toBe(302);
    expect(r.headers()['location']).toContain('/@bc1qwerty/');
  });

  test('첫 화면은 개요(이번 주·달 요약, 마일리지 그래프)', async ({ page }) => {
    const response = await page.goto(BASE + '/@bc1qwerty/');
    expect(response!.status()).toBe(200);
    await expect(page).toHaveTitle(/social\.txid\.uk/);
    // 요약 칸·그래프·최근 기록은 스크립트가 /api/public 으로 그린다.
    await expect(page.locator('#overviewView .o-tile')).toHaveCount(2);
    await expect(page.locator('#oWeeks svg rect').first()).toBeVisible();
    await expect(page.locator('#oRecent .card').first()).toBeVisible();
  });

  test('피드 탭에 활동 목록이 뜬다', async ({ page }) => {
    await page.goto(BASE + '/@bc1qwerty/#feed');
    await expect(page.locator('#feed .card').first()).toBeVisible();
  });

  test('공용 헤더가 있고 언어 고르개는 없다', async ({ page }) => {
    await page.goto(BASE + '/@bc1qwerty/');
    await expect(page.locator('header .logo')).toContainText('social');
    await expect(page.locator('.lang-dropdown')).toHaveCount(0);
  });

  test('테마 토글이 실제로 테마를 바꾼다', async ({ page }) => {
    await page.goto(BASE + '/@bc1qwerty/');
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await page.click('#theme-btn');
    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
      .not.toBe(before);
  });

  test('공개 요약에는 훈련 경로·시각·지점별 기록이 없다', async ({ request }) => {
    const r = await request.get(API + '/public');
    expect(r.status()).toBe(200);
    const { activities } = await r.json();
    expect(Array.isArray(activities)).toBe(true);
    for (const a of activities) {
      expect(a.start, a.id).toBeUndefined();
      expect(a.series, a.id).toBeUndefined();
      if (!a.race) expect(a.route, a.id).toBeUndefined();
    }
  });

  test('로그인 없이는 상세 기록을 주지 않는다', async ({ request }) => {
    const r = await request.get(API + '/private');
    expect(r.status()).toBe(401);
    // 없는 이름도 데이터를 주지 않는다.
    expect((await request.get(BASE + '/api/u/nobody-here/public')).status()).toBe(404);
    expect(r.headers()['cache-control']).toContain('no-store');
    // 인코딩한 경로로 함수를 건너뛰어도 데이터가 아니라 화면 껍데기가 와야 한다.
    for (const p of ['/%61pi/u/bc1qwerty/private', '/api%2Fu%2Fbc1qwerty%2Fprivate']) {
      const e = await request.get(BASE + p);
      expect(await e.text(), p).not.toContain('"activities"');
    }
  });
});
