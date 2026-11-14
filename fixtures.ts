import { test as base, expect, type Page, type Route } from '@playwright/test';

type Options = {
  /** 로그인 표면을 보는 스펙만 true — api.txid.uk 의 SDK·`/auth/me` 를 실물로 받는다. */
  liveAuth: boolean;
  /** 깨진 페이지를 일부러 여는 스펙(가짜 호스트 등)만 false. */
  assetGuard: boolean;
};

// 워커당 한 번만 실물을 받아 재사용한다 — 페이지마다 받으면 실행 한 번에 api 로 160건이 넘게 나간다.
const sdkCache = new Map<string, { status: number; headers: Record<string, string>; body: Buffer }>();

async function serveSdkOnce(route: Route) {
  const url = route.request().url().split('?')[0];
  let hit = sdkCache.get(url);
  if (!hit) {
    try {
      const res = await route.fetch();
      hit = { status: res.status(), headers: res.headers(), body: await res.body() };
    } catch {
      // 받는 도중 테스트가 끝났다(페이지가 닫힘) — 그 요청은 버린다.
      await route.abort().catch(() => {});
      return;
    }
    // 실패 응답은 기억하지 않는다 — 일시 오류 한 번이 그 워커의 남은 테스트를 전부 물들인다.
    if (hit.status === 200) sdkCache.set(url, hit);
  }
  await route.fulfill({ status: hit.status, headers: hit.headers, body: hit.body }).catch(() => {});
}

// `/auth/me` 의 비로그인 응답. 테스트 컨텍스트에는 세션 쿠키가 없어 실물도 늘 이 값이다.
async function fakeAuthMe(route: Route) {
  const origin = route.request().headers()['origin'];
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: origin
      ? { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', vary: 'Origin' }
      : {},
    body: JSON.stringify({ authenticated: false }),
  }).catch(() => {});
}

const isOurs = (host: string) => host === 'txid.uk' || host.endsWith('.txid.uk');

// 우리 호스트가 준 스크립트·스타일의 4xx/5xx 와 잡히지 않은 JS 예외를 모은다.
// 요소 하나가 보이는지만 보는 테스트는 CSS 가 통째로 404 여도, 공용 스크립트가 예외로 죽어도 통과한다.
export function watchAssets(page: Page) {
  const problems: string[] = [];
  const asset = (url: string) => {
    let u: URL;
    try { u = new URL(url); } catch { return null; }
    if (!isOurs(u.hostname) || u.hostname === 'umami.txid.uk') return null;
    return /\.(js|mjs|css)$/.test(u.pathname) ? u : null;
  };
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message.slice(0, 120)}`));
  page.on('response', (r) => {
    const u = r.status() >= 400 ? asset(r.url()) : null;
    if (u) problems.push(`${r.status()} ${u.hostname}${u.pathname}`);
  });
  // 🔴 404 인 스타일시트는 `response` 로 안 온다 — nosniff 아래에서 MIME 이 text/css 가 아니면 브라우저가
  //    응답을 넘기기 전에 막는다(Playwright 에는 응답 없는 ERR_ABORTED 로만 보이고, 페이지를 떠나며
  //    끊긴 요청과 구별되지 않는다). 그래서 끝에 문서의 Resource Timing 에서 상태 코드를 읽는다.
  const settle = async () => {
    const bad = await page
      .evaluate(() =>
        (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
          // 같은 출처 자원의 상태 0 = 응답을 못 받았거나 브라우저가 막았다(다른 출처는 원래 0 일 수 있다).
          .filter((e) => {
            const st = (e as any).responseStatus;
            return st >= 400 || (st === 0 && new URL(e.name).host === location.host);
          })
          .map((e) => `${(e as any).responseStatus || 'blocked'} ${e.name}`),
      )
      .catch(() => [] as string[]);
    for (const line of bad) {
      const [status, url] = line.split(' ');
      const u = asset(url);
      const msg = u && `${status} ${u.hostname}${u.pathname}`;
      if (msg && !problems.includes(msg)) problems.push(msg);
    }
  };
  return { problems, settle };
}

// 이 스위트는 프로덕션을 직접 치므로, 모든 문서에서 umami 계측을 끈다.
// (umami 트래커는 localStorage 'umami.disabled'가 있으면 전송하지 않는다.)
export const test = base.extend<Options>({
  liveAuth: [false, { option: true }],
  assetGuard: [true, { option: true }],

  context: async ({ context, liveAuth }, use) => {
    await context.addInitScript(() => {
      try {
        localStorage.setItem('umami.disabled', '1');
      } catch {
        // opaque origin 등 localStorage 접근 불가 문서는 그냥 둔다
      }
    });
    // 테스트가 연 페이지의 Web Vitals 가 운영 계측에 섞이지 않게 한다.
    await context.route('https://api.txid.uk/vitals', (r) => r.abort());
    if (!liveAuth) {
      await context.route('https://api.txid.uk/auth/me', fakeAuthMe);
      await context.route(/^https:\/\/api\.txid\.uk\/txid-auth\.(js|css)(\?.*)?$/, serveSdkOnce);
    }
    await use(context);
  },

  // page 를 쓰는 테스트에만 걸린다(요청만 보내는 테스트는 브라우저를 띄우지 않는다).
  page: async ({ page, assetGuard }, use) => {
    const { problems, settle } = watchAssets(page);
    await use(page);
    await settle();
    if (assetGuard) expect(problems, '깨진 스크립트·스타일 또는 JS 예외').toEqual([]);
  },
});

export { expect } from '@playwright/test';
export type { Page } from '@playwright/test';
