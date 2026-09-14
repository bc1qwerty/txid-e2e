import { test, expect } from '../fixtures';

// 야간 스모크에 빠져 있던 라이브 사이트들의 최소 가용성 체크(2026-09-13).
// Request-level only: fast, no hydration flakes, and no tracker JS runs —
// txt.txid.uk 의 no-tracking 선언과도 충돌하지 않는다.
// NOTE: 블로그의 실주소는 blog.txid.uk 다 (txid.uk/blog/ 는 404).

const SITES: Array<[url: string, marker: string]> = [
  ['https://ghs.txid.uk/', 'Transport Label Generator'],
  ['https://dash.txid.uk/', 'Dashboard | txid.uk'],
  ['https://txt.txid.uk/', 'text-only mirror'],
  ['https://blog.txid.uk/', 'txid.uk 블로그'],
];

test.describe('fleet smoke - request-level availability', () => {
  for (const [url, marker] of SITES) {
    test(`${new URL(url).host} serves 200 with expected content`, async ({ request }) => {
      const res = await request.get(url);
      expect(res.status()).toBe(200);
      expect(await res.text()).toContain(marker);
    });
  }
});
