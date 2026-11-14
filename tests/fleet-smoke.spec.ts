import { test, expect } from '../fixtures';

// 야간 스모크에 빠져 있던 라이브 사이트들의 최소 가용성 체크(2026-09-13).
// Request-level only: fast, no hydration flakes, and no tracker JS runs —
// txt.txid.uk 의 no-tracking 선언과도 충돌하지 않는다.
// NOTE: 블로그의 실주소는 blog.txid.uk 다 (txid.uk/blog/ 는 404).

const SITES: Array<[url: string, marker: string]> = [
  ['https://ghs.txid.uk/', 'Transport Label Generator'],
  ['https://ghs.txid.uk/', 'id="ghs-topbar"'],
  ['https://dash.txid.uk/', 'Dashboard | txid.uk'],
  ['https://dash.txid.uk/', 'id="auth-gate"'],
  // 마커 둘만 든 빈 껍데기도 통과했다 — 앱을 실제로 띄우는 스크립트와 본문 틀까지.
  ['https://dash.txid.uk/', 'src="/app.js"'],
  ['https://dash.txid.uk/', 'id="alert-list"'],
  ['https://ghs.txid.uk/', 'id="root"'],
  ['https://txt.txid.uk/', '<h2>Latest News'],
  ['https://txt.txid.uk/', '<h2>Latest from Learn'],
  ['https://map.txid.uk/', 'id="viewer"'],
  ['https://txt.txid.uk/', 'text-only mirror'],
  ['https://txt.txid.uk/', '<h1>txt.txid.uk</h1>'],
  // lib·shop 은 자기 리포에 e2e 가 있다 — 여기선 «떠 있고 제 얼굴인가» 만.
  ['https://lib.txid.uk/', 'lib.txid.uk</title>'],
  ['https://shop.txid.uk/login', '다오랩'],
  ['https://id.txid.uk/ko/login/', '<html lang="ko"'],
  ['https://blog.txid.uk/', 'Toward Personal Liberation'],  // 2026-11-10 블로그 제목 변경
  // map 은 2026-08-21 은퇴 때 감시에서 빠졌고 2026-09-23 재가동 때 돌아오지 않았다(2026-09-28 복귀).
  ['https://map.txid.uk/', 'Equal Earth'],
];

test.describe('fleet smoke - request-level availability', () => {
  for (const [url, marker] of SITES) {
    test(`${new URL(url).host}${new URL(url).pathname} serves 200 with ${marker.slice(0, 24)}`, async ({ request }) => {
      const res = await request.get(url);
      expect(res.status()).toBe(200);
      expect(await res.text()).toContain(marker);
    });
  }

  // 껍데기 HTML 은 200 인데 앱 번들이 404 인 배포를 잡는다(요청만 보내므로 브라우저 가드에 안 걸린다).
  test('dash and ghs serve the app bundles their HTML points at', async ({ request }) => {
    expect((await request.get('https://dash.txid.uk/app.js')).status()).toBe(200);
    const ghs = await (await request.get('https://ghs.txid.uk/')).text();
    const assets = [...ghs.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);
    expect(assets.length, 'ghs index 에 번들 참조가 없다').toBeGreaterThanOrEqual(2);
    for (const a of assets) {
      expect((await request.get(`https://ghs.txid.uk${a}`)).status(), a).toBe(200);
    }
  });

  test('txt.txid.uk lists posts', async ({ request }) => {
    const html = await (await request.get('https://txt.txid.uk/')).text();
    // 실제 약 30개 링크. 피드가 비면 머리말만 남는다.
    expect((html.match(/<a /g) || []).length).toBeGreaterThanOrEqual(20);
  });

  // map 의 실제 사고 모양은 «빈 키로 200» 이다 — 배포가 VWorld 키 자리표시를 못 바꾼 채 나간 경우.
  test('map.txid.uk app.js has its key stamped and /where answers', async ({ request }) => {
    const html = await (await request.get('https://map.txid.uk/')).text();
    const src = html.match(/assets\/app\.js\?v=[0-9a-f]+/)?.[0];
    expect(src, 'index 에 스탬프된 app.js 가 없다').toBeTruthy();
    const js = await request.get(`https://map.txid.uk/${src}`);
    expect(js.status()).toBe(200);
    expect(await js.text()).not.toContain('VWORLD_KEY_PLACEHOLDER');
    expect((await request.get('https://map.txid.uk/where')).status()).toBe(200);
  });

  // server_name 이 txid.uk 라 이 두 파일이 죽으면 Matrix 페더레이션·클라이언트 발견이 끊긴다.
  test('txid.uk matrix delegation files', async ({ request }) => {
    const server = await request.get('https://txid.uk/.well-known/matrix/server');
    expect(server.status()).toBe(200);
    expect((await server.json())['m.server']).toMatch(/^matrix\.txid\.uk(:\d+)?$/);
    const client = await request.get('https://txid.uk/.well-known/matrix/client');
    expect(client.status()).toBe(200);
    expect((await client.json())['m.homeserver'].base_url).toMatch(/^https:\/\/matrix\.txid\.uk\/?$/);
  });

  // Matrix Lightning Login 의 첫 걸음. redirect_uri 가 api DB 와 어긋나면 400 이 된다(2026-11-04 사고).
  test('matrix SSO authorize redirects', async ({ request }) => {
    const res = await request.get(
      'https://api.txid.uk/oauth/authorize?response_type=code&client_id=synapse&redirect_uri=https%3A%2F%2Fmatrix.txid.uk%2F_synapse%2Fclient%2Foidc%2Fcallback&scope=openid&nonce=e2e-probe',
      { maxRedirects: 0 },
    );
    expect(res.status()).toBe(302);
    expect(res.headers()['location']).toContain('id.txid.uk');
  });

  test('relay.txid.uk serves NIP-11', async ({ request }) => {
    const res = await request.get('https://relay.txid.uk/', { headers: { Accept: 'application/nostr+json' } });
    expect(res.status()).toBe(200);
    const info = await res.json();
    expect(info.name).toBe('relay.txid.uk');
    expect(info.supported_nips).toEqual(expect.arrayContaining([1, 11]));
  });
});
