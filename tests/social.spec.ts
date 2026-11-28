import { test, expect } from '../fixtures';

// 2026-11-28: 주소가 my.txid.uk 로 바뀌었다(옛 social.txid.uk, 이름도 「발자국」→「my」). 파일 이름은 배포 규약(tests/<앱 이름>.spec.ts)이라 그대로.
//   SOCIAL_BASE 는 주소를 옮기는 동안 옛 주소로 시험하려고 둔다.
const BASE = process.env.SOCIAL_BASE || 'https://my.txid.uk';
const API = BASE + '/api/u/seowondeuk';

// 2026-11-22 신설(archive apps/social). 운동 기록 — 이름별 페이지 /@<NIP-05 이름>. 누구나 보는 요약(/api/u/<이름>/public)과
// 주인 계정만 보는 상세(/api/u/<이름>/private, Pages Function 이 api.txid.uk/auth/me 의 계정 번호로 판정)가 따로다.
// 🔑 이 파일이 있어야 archive 배포 워크플로가 social 을 배포한다(tests/<short>.spec.ts 규약).
// 기록 수는 GPX 를 올릴 때마다 바뀌므로 개수는 단언하지 않는다.
test.describe('my.txid.uk (apps/social)', () => {
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

  test('운동 갈래(#fit)의 첫 화면은 개요(이번 주·달 요약, 마일리지 그래프, 대회 기록)', async ({ page }) => {
    const response = await page.goto(BASE + '/@seowondeuk/#fit');
    expect(response!.status()).toBe(200);
    await expect(page).toHaveTitle(/· my$/);
    // 요약 칸·그래프·대회 기록은 스크립트가 /api/public 으로 그린다.
    await expect(page.locator('#overviewView > .o-tiles > .o-tile')).toHaveCount(2); // 이번 주·이번 달
    await expect(page.locator('#overviewView .o-z2 .o-tile')).toHaveCount(2); // 존2 비율: 이번 주·이번 달
    await expect(page.locator('#oPbs .o-pb').first()).toBeVisible();
    await expect(page.locator('#oMonths svg rect').first()).toBeVisible();
    await expect(page.locator('#oRaces .card').first()).toBeVisible();
  });

  test('월간 마일리지 카드를 누르면 통계 탭(일간·주간·월간)으로 간다', async ({ page }) => {
    await page.goto(BASE + '/@seowondeuk/#fit');
    await page.locator('.o-mileage a.o-more').click();
    await expect(page).toHaveURL(/#stats$/);
    await expect(page.locator('#tabStats')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#stChart svg rect').first()).toBeVisible();
    // 기간 단추로 그래프를 바꾼다(일·주·월 한 그래프).
    await page.locator('[data-period="month"]').click();
    await expect(page.locator('[data-period="month"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.st-table tbody tr').first()).toBeVisible();
  });

  test('기록 탭(#feed)에 활동 목록만 뜬다', async ({ page }) => {
    await page.goto(BASE + '/@seowondeuk/#feed');
    await expect(page.locator('#feed .card').first()).toBeVisible();
    await expect(page.locator('#tabFeed')).toHaveText('기록');
    await expect(page.locator('aside.side')).toHaveCount(0); // 오른쪽 통계 패널은 걷었다(통계 탭과 같은 내용, 2026-11-26)
  });

  test('개요의 「전체 기록 보기」는 거리별 기록 페이지(#records)로 간다', async ({ page }) => {
    await page.goto(BASE + '/@seowondeuk/#fit');
    await page.locator('a.pb-all').click();
    await expect(page).toHaveURL(/#records$/);
    await expect(page.locator('#recordsView .pb-dist').first()).toBeVisible();
    await expect(page.locator('#recordsView .pb-dist .o-pb')).toHaveCount(23); // 단거리 5 + 로드·트레일 × 9 거리(빈칸 포함)
  });

  test('공용 헤더가 있고 언어 고르개는 없다', async ({ page }) => {
    await page.goto(BASE + '/@seowondeuk/');
    await expect(page.locator('header .logo')).toContainText('my');
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
    // 204 = «볼 것 없음»(4xx 는 모든 방문자 콘솔에 오류로 찍혀서, 2026-11-25).
    expect(r.status()).toBe(204);
    expect(await r.text()).toBe('');
    // 없는 이름도 데이터를 주지 않는다.
    expect((await request.get(BASE + '/api/u/nobody-here/public')).status()).toBe(404);
    expect(r.headers()['cache-control']).toContain('no-store');
    // 인코딩한 경로로 함수를 건너뛰어도 데이터가 아니라 화면 껍데기가 와야 한다.
    for (const p of ['/%61pi/u/seowondeuk/private', '/api%2Fu%2Fseowondeuk%2Fprivate']) {
      const e = await request.get(BASE + p);
      expect(await e.text(), p).not.toContain('"activities"');
    }
  });

  // ── 2026-11-27 에 더한 것들: 합계 단추·대회 비교·추이 묶음·상세 묶음·심박 기준 ──
  const stats = (page) => page.locator('#pStats .p-stat b').evaluateAll((els) => els.map((e) => parseFloat(e.textContent!.replace(/,/g, ''))));

  test('합계 단추(하이킹·걷기)는 활동 수·거리·누적고도·운동 시간을 함께 바꾼다, 기본은 둘 다 포함', async ({ page }) => {
    await page.goto(BASE + '/@seowondeuk/#fit');
    await expect(page.locator('#oRaces .card').first()).toBeVisible();
    for (const k of ['hike', 'walk']) await expect(page.locator(`.chip-toggle.t-${k}`)).toHaveAttribute('aria-pressed', 'true');
    let before = await stats(page);
    expect(before).toHaveLength(4);
    for (const k of ['walk', 'hike']) {
      await page.locator(`.chip-toggle.t-${k}`).click();
      await expect(page.locator(`.chip-toggle.t-${k}`)).toHaveAttribute('aria-pressed', 'false');
      const after = await stats(page);
      // 넷 다 줄어든다(같은 기준). 시간은 «시간» 단위로 반올림돼 같을 수는 있어도 늘지는 않는다.
      expect(after[0], k + ' 활동 수').toBeLessThan(before[0]);
      expect(after[1], k + ' 거리').toBeLessThan(before[1]);
      expect(after[2], k + ' 누적고도').toBeLessThanOrEqual(before[2]);
      expect(after[3], k + ' 운동 시간').toBeLessThanOrEqual(before[3]);
      before = after;
    }
  });

  test('개요: 대회 전반·후반 표, 공개분에 다음 대회가 있으면 그 칸', async ({ page, request }) => {
    const pub = await (await request.get(API + '/public')).json();
    await page.goto(BASE + '/@seowondeuk/#fit');
    await expect(page.locator('#oRaces .card').first()).toBeVisible();
    const withHalves = pub.activities.filter((a) => a.race && Array.isArray(a.halves)).length;
    if (withHalves >= 2) await expect(page.locator('.rc-table tbody tr')).toHaveCount(withHalves);
    if (pub.next && pub.next.title) {
      await expect(page.locator('.o-next .nx-title')).toHaveText(pub.next.title);
      await expect(page.locator('.o-next tbody tr.cur')).toHaveCount(1);
    } else {
      await expect(page.locator('.o-next')).toHaveCount(0);
    }
  });

  test('추이: 묶음 다섯·새 그래프가 뜨고, 본인 전용 칸은 숨고, 묶음을 접으면 그 그래프가 사라진다', async ({ page }) => {
    await page.goto(BASE + '/@seowondeuk/#trends');
    await expect(page.locator('.tg-btn')).toHaveCount(5);
    for (const k of ['vam', 'downPace', 'cadRun', 'strideRun', 'vo2max', 'lt', 'ltPace']) {
      await expect(page.locator(`#trendsView [data-key="${k}"] .t-chart svg`), k).toBeVisible();
    }
    // 휴식 심박·수면은 로그인한 주인에게만(공개분에 값이 없다).
    for (const k of ['rest', 'sleep']) await expect(page.locator(`#trendsView [data-key="${k}"]`), k).toBeHidden();
    await expect(page.locator('.ld-now')).toContainText('컨디션');
    await expect(page.locator('.ld-rest')).toHaveCount(0);
    const first = page.locator('.tg-btn').first();
    await first.click();
    await expect(first).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#trendsView [data-key="paceMoving"]')).toBeHidden();
    await first.click();
    await expect(page.locator('#trendsView [data-key="paceMoving"] .t-chart svg')).toBeVisible();
  });

  test('상세: 숫자 칸이 묶음으로 나뉘고 심박 구간은 그날의 역치 기준', async ({ page, request }) => {
    const pub = await (await request.get(API + '/public')).json();
    const race = pub.activities.find((a) => a.race);
    await page.goto(BASE + '/@seowondeuk/#' + race.id);
    await expect(page.locator('#dIn .d-stats .d-group')).toHaveText(['기록', '코스', '몸', '발놀림']);
    // 묶음마다 빈 칸이 남지 않는다: 칸 수가 홀수면 마지막 칸이 한 줄을 쓴다.
    const odd = await page.locator('#dIn .d-stats').evaluate((box) => {
      const groups: Element[][] = [];
      for (const e of Array.from(box.children)) { if (e.matches('.d-group')) groups.push([]); else if (!e.matches('.d-note') && groups.length) groups[groups.length - 1].push(e); }
      return groups.filter((g) => g.length % 2 === 1 && !g[g.length - 1].matches('.wide')).length;
    });
    expect(odd).toBe(0);
    await expect(page.locator('#dIn')).toContainText(`그날 역치 ${race.lt} 기준`);
    await expect(page.locator('#dZLegend')).toContainText(`${race.hz[0]}~${race.hz[1] - 1}`);
  });

  test('공개분의 심박 기준: 구간 경계 넷이 오름차순이고 활동마다 그날 값이 실린다, 본인 지표는 없다', async ({ request }) => {
    const pub = await (await request.get(API + '/public')).json();
    const up = (z: number[]) => z.length === 4 && z.every((v, i) => Number.isInteger(v) && (i === 0 || v > z[i - 1]));
    expect(up(pub.hr.zones)).toBe(true);
    expect(pub.hr.lt).toBeGreaterThan(pub.hr.zones[3] - 1);
    for (const a of pub.activities) {
      if (a.hrHist) { expect(up(a.hz), a.id).toBe(true); expect(a.hz[3], a.id).toBeLessThanOrEqual(a.lt); }
      expect(a.shoe, a.id).toBeUndefined();
    }
    for (const k of ['daily', 'weight', 'gear']) expect(pub[k], k).toBeUndefined();
  });

  // ── 2026-11-28: 한 사람의 페이지 — 프로필(첫 화면)·운동·이력 세 갈래 ──
  test('첫 화면은 프로필: 갈래 요약 카드 둘과 최근 기록, 갈래를 오가면 주소와 화면이 같이 바뀐다', async ({ page }) => {
    await page.goto(BASE + '/@seowondeuk/');
    await expect(page.locator('#secProfile')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#profileView .h-card')).toHaveCount(2);
    await expect(page.locator('#profileView .h-row').first()).toBeVisible();
    await expect(page.locator('#fitBar')).toBeHidden();
    await page.locator('#profileView .h-card[href="#fit"]').click();
    await expect(page).toHaveURL(/#fit$/);
    await expect(page.locator('#oRaces .card').first()).toBeVisible();
    await page.locator('#secCareer').click();
    await expect(page).toHaveURL(/#career$/);
    await expect(page.locator('#careerView .panel').first()).toBeVisible();
    await expect(page.locator('#fitLayout')).toBeHidden();
    await page.locator('#secProfile').click();
    await expect(page.locator('#profileView .h-card').first()).toBeVisible();
  });

  test('프로필의 최근 기록에서 연 상세는 닫으면 프로필로 돌아온다', async ({ page }) => {
    await page.goto(BASE + '/@seowondeuk/');
    await page.locator('#profileView .h-row').first().click();
    await expect(page.locator('#detail')).toBeVisible();
    await page.locator('#backBtn').click();
    await expect(page.locator('#detail')).toBeHidden();
    await expect(page.locator('#secProfile')).toHaveAttribute('aria-current', 'page');
  });

  test('이력: 공개분에 실린 줄만 보이고, 본인 전용 줄과 증빙·메모는 나가지 않는다', async ({ page, request }) => {
    const pub = await (await request.get(API + '/public')).json();
    const allow: Record<string, string[]> = { certs: ['name', 'issuer', 'date', 'expires', 'field'], education: ['school', 'major', 'degree', 'start', 'end'],
      training: ['name', 'org', 'from', 'to', 'hours'], career: ['org', 'from', 'to', 'title', 'work'],
      grades: ['name', 'level', 'issuer', 'date'], awards: ['name', 'issuer', 'date'], tests: ['name', 'score', 'best', 'date', 'expires', 'issuer'],
      military: ['name', 'from', 'to'], activities: ['name', 'from', 'to'], volunteer: ['name', 'org', 'from', 'to'] };
    const common = ['detail', 'history']; // 눌러서 펼치는 설명·지난 기록 표
    for (const [kind, ok] of Object.entries(allow)) {
      for (const row of pub.profile[kind] ?? []) for (const k of Object.keys(row)) expect([...ok, ...common], `${kind}.${k}`).toContain(k);
    }
    await page.goto(BASE + '/@seowondeuk/#career');
    await expect(page.locator('#careerView .cv-cert')).toHaveCount((pub.profile.certs ?? []).length + (pub.profile.grades ?? []).length + (pub.profile.tests ?? []).length); // 자격증·등급·어학 카드
    // 자세한 내용이 있는 항목은 누르면 펼쳐진다.
    const withMore = Object.keys(allow).flatMap((k) => pub.profile[k] ?? []).filter((r) => r.detail || (r.history ?? []).length).length;
    await expect(page.locator('#careerView details')).toHaveCount(withMore);
    if (withMore) {
      const first = page.locator('#careerView details').first();
      await first.locator('summary').click();
      await expect(first.locator('.cv-extra')).toBeVisible();
    }
    // 로그인 전에는 자물쇠 줄이 없다.
    await expect(page.locator('#careerView .lock')).toHaveCount(0);
    await expect(page.locator('#careerView .own')).toHaveCount(0);
  });

  // ── 2026-11-28: my.txid.uk 로 합침 — 어두운 기본 화면, 본인 전용 화면(/career) ──
  test('기기가 밝은 설정이어도 기본은 어두운 화면이다', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'light' });
    const page = await ctx.newPage();
    await page.goto(BASE + '/@seowondeuk/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await ctx.close();
  });

  test('본인 전용 화면(/career·/api/jobs)은 로그인 없이는 내용을 주지 않고, 갈래 줄에도 보이지 않는다', async ({ page, request }) => {
    const career = await request.get(BASE + '/career');
    expect(career.status()).toBe(401);
    expect(career.headers()['cache-control']).toContain('no-store');
    const body = await career.text();
    expect(body).toContain('로그인이 필요합니다');
    expect(body).not.toContain('jw-snapshot'); // 본문(전수조사 화면)의 표식
    const jobs = await request.get(BASE + '/api/jobs');
    expect(jobs.status()).toBe(401);
    expect(await jobs.text()).not.toContain('"jobs"');
    await page.goto(BASE + '/@seowondeuk/');
    await expect(page.locator('#profileView .h-card').first()).toBeVisible();
    await expect(page.locator('#secJobs')).toBeHidden();
  });
});
