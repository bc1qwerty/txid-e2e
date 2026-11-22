import { test, expect } from '../fixtures';

const BASE = 'https://social.txid.uk';
const API = BASE + '/api/u/seowondeuk';

// 2026-11-22 신설(archive apps/social). 운동 기록 — 이름별 페이지 /@<NIP-05 이름>. 누구나 보는 요약(/api/u/<이름>/public)과
// 주인 계정만 보는 상세(/api/u/<이름>/private, Pages Function 이 api.txid.uk/auth/me 의 계정 번호로 판정)가 따로다.
// 🔑 이 파일이 있어야 archive 배포 워크플로가 social 을 배포한다(tests/<short>.spec.ts 규약).
// 기록 수는 GPX 를 올릴 때마다 바뀌므로 개수는 단언하지 않는다.
test.describe('social.txid.uk', () => {
  test('첫 주소는 (로그인 안 했으면) 메인 이름 페이지로 간다, 옛 이름 주소는 넘긴다', async ({ page, request }) => {
    await page.goto(BASE + '/');
    await expect(page).toHaveURL(/\/@seowondeuk\/$/);
    const old = await request.get(BASE + '/@bc1qwerty/', { maxRedirects: 0 });
    expect(old.status()).toBe(301);
    expect(old.headers()['location']).toContain('/@seowondeuk/');
  });

  test('키 주소(/@<라이트닝 키>)는 그 계정의 이름 주소로, 모르는 키는 404', async ({ request }) => {
    const key = await request.get(BASE + '/@02a1ab6832c21611fc73a40f9b5d0f16ba030f7cc455920b1a85c620d185d6b173', { maxRedirects: 0 });
    expect(key.status()).toBe(302);
    expect(key.headers()['location']).toBe('/@seowondeuk/');
    const unknown = await request.get(BASE + '/@03' + '0'.repeat(64), { maxRedirects: 0 });
    expect(unknown.status()).toBe(404);
  });

  test('첫 화면은 개요(이번 주·달 요약, 마일리지 그래프, 대회 기록)', async ({ page }) => {
    const response = await page.goto(BASE + '/@seowondeuk/');
    expect(response!.status()).toBe(200);
    await expect(page).toHaveTitle(/발자국/);
    // 요약 칸·그래프·대회 기록은 스크립트가 /api/public 으로 그린다.
    await expect(page.locator('#overviewView .o-tile')).toHaveCount(2); // 이번 주·이번 달
    await expect(page.locator('#oPbs .o-pb').first()).toBeVisible();
    await expect(page.locator('#oWeeks svg rect').first()).toBeVisible();
    await expect(page.locator('#oRaces .card').first()).toBeVisible();
  });

  test('피드 탭에 활동 목록이 뜬다', async ({ page }) => {
    await page.goto(BASE + '/@seowondeuk/#feed');
    await expect(page.locator('#feed .card').first()).toBeVisible();
  });

  test('공용 헤더가 있고 언어 고르개는 없다', async ({ page }) => {
    await page.goto(BASE + '/@seowondeuk/');
    await expect(page.locator('header .logo')).toContainText('발자국');
    await expect(page.locator('.lang-dropdown')).toHaveCount(0);
  });

  test('테마 토글이 실제로 테마를 바꾼다', async ({ page }) => {
    await page.goto(BASE + '/@seowondeuk/');
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await page.click('#theme-btn');
    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
      .not.toBe(before);
  });

  test('공개 요약에는 훈련 위치 좌표·시각·지점별 기록이 없다', async ({ request }) => {
    const r = await request.get(API + '/public');
    expect(r.status()).toBe(200);
    const { activities } = await r.json();
    expect(Array.isArray(activities)).toBe(true);
    for (const a of activities) {
      expect(a.start, a.id).toBeUndefined();
      expect(a.series, a.id).toBeUndefined();
      if (!a.race) {
        // 훈련 경로는 모양만: 위경도가 아니라 0~1000 정수 좌표.
        expect(a.route, a.id).toBeUndefined();
        for (const [x, y] of a.shape ?? []) expect(Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x <= 1000 && y >= 0 && y <= 1000, a.id).toBe(true);
      }
    }
  });

  test('로그인 없이는 상세 기록을 주지 않는다', async ({ request }) => {
    const r = await request.get(API + '/private');
    expect(r.status()).toBe(401);
    // 없는 이름도 데이터를 주지 않는다.
    expect((await request.get(BASE + '/api/u/nobody-here/public')).status()).toBe(404);
    expect(r.headers()['cache-control']).toContain('no-store');
    // 인코딩한 경로로 함수를 건너뛰어도 데이터가 아니라 화면 껍데기가 와야 한다.
    for (const p of ['/%61pi/u/seowondeuk/private', '/api%2Fu%2Fseowondeuk%2Fprivate']) {
      const e = await request.get(BASE + p);
      expect(await e.text(), p).not.toContain('"activities"');
    }
  });
});
