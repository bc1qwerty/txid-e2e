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
