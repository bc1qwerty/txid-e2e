import { test, expect } from '@playwright/test';

// Locks in the 2026-08-31 ~ 09-01 full-fleet sweep fixes so they cannot
// silently regress. Each test names the incident it guards against.
// Request-level where possible: fast, no hydration flakes.

test.describe('sweep regressions (2026-09)', () => {
  test('www.txid.uk 301s to apex preserving path+query', async ({ request }) => {
    // Pages Function _middleware (txid-web 537a873). Before: www served
    // duplicate content with 200 (Rulesets-less token couldn't add a redirect).
    const res = await request.get('https://www.txid.uk/mining?x=1', { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    expect(res.headers()['location']).toBe('https://txid.uk/mining?x=1');
  });

  test('tx.txid.uk has no ghost learn-links.js and links to /articles/', async ({ request }) => {
    // archive 56881a5: the script never existed in any repo's history (404 on
    // every load), and /blog/ links 301-hopped since learn moved to /articles/.
    for (const lang of ['en', 'ko', 'ja']) {
      const html = await (await request.get(`https://tx.txid.uk/${lang}/`)).text();
      expect(html).not.toContain('learn-links.js');
      expect(html).not.toMatch(/learn\.txid\.uk\/[a-z]+\/blog\//);
      expect(html).toContain(`learn.txid.uk/${lang}/articles/what-is-txid/`);
    }
  });

  test('dev.txid.uk loads JetBrains Mono from a live CDN path', async ({ request }) => {
    // archive 56881a5: the old gh/JetBrains/JetBrainsMono /web/css path was
    // deleted upstream and 404ed for every visitor (fallback font only).
    const html = await (await request.get('https://dev.txid.uk/en/')).text();
    const cssUrl = html.match(/href="(https:\/\/cdn\.jsdelivr\.net\/npm\/@fontsource\/jetbrains-mono[^"]+index\.css)"/)?.[1];
    expect(cssUrl, 'fontsource CSS link must be present').toBeTruthy();
    expect((await request.get(cssUrl!)).status()).toBe(200);
  });

  test('lokl.txid.uk unknown path returns a real 404 page (not empty body)', async ({ request }) => {
    // VPS Caddy handle_errors + lokl 918ceeb. Before: status 404 with a
    // 0-byte body (blank screen). Status must stay 404 — no SPA soft-404.
    const res = await request.get('https://lokl.txid.uk/zzq-e2e-regression', { maxRedirects: 0 });
    expect(res.status()).toBe(404);
    const body = await res.text();
    expect(body).toContain('404');
    expect(body.length).toBeGreaterThan(100);
  });

  test('status.txid.uk serves /site/<slug>/ directly and lists no retired sites', async ({ request }) => {
    // status.txid.uk ced5569: card hrefs lacked trailing slash (301 hop) and
    // /api/sites leaked disabled rows, baking pages for retired unfog/map/....
    const direct = await request.get('https://status.txid.uk/site/api/', { maxRedirects: 0 });
    expect(direct.status()).toBe(200);

    const sites = await (await request.get('https://status.txid.uk/api/sites')).json();
    const slugs = sites.map((s: { slug: string }) => s.slug);
    for (const retired of ['unfog', 'chat', 'map', 'portfolio']) {
      expect(slugs).not.toContain(retired);
    }

    const notFound = await request.get('https://status.txid.uk/site/unfog/', { maxRedirects: 0 });
    expect(notFound.status()).toBe(404);
    expect(await notFound.text()).toContain('404');
  });

  test('matrix.txid.uk sends a CSP header', async ({ request }) => {
    // VPS Caddy hygiene fix: JSON-only host had no CSP at all.
    const res = await request.get('https://matrix.txid.uk/_matrix/client/versions');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-security-policy']).toContain("default-src 'none'");
  });

  test('api.txid.uk CORS allows ghs.txid.uk origin', async ({ request }) => {
    // api a3b3993: ghs was missed in the regex→allowlist migration, so the
    // txid-auth widget's fetches from ghs were rejected (4 rejects logged).
    const res = await request.get('https://api.txid.uk/glossary', {
      headers: { Origin: 'https://ghs.txid.uk' },
    });
    expect(res.status()).toBe(200);
    expect(res.headers()['access-control-allow-origin']).toBe('https://ghs.txid.uk');
  });

  test('api.txid.uk root index advertises only real board routes', async ({ request }) => {
    // api a3b3993: the self-doc advertised slug-era comment/vote paths that 404ed.
    const body = await (await request.get('https://api.txid.uk/')).json();
    const board = body.endpoints?.board ?? {};
    const advertised = Object.values(board).join(' ');
    expect(advertised).not.toContain('/board/:slug/posts/:id/comments');
    expect(advertised).toContain('GET /board/posts/:id');
  });

  test('apex homepage leaks no internal work-note comments', async ({ request }) => {
    // txid-web 0c9e1c1: .astro HTML comments ship to prod; two internal memos
    // (favicon history, a11y audit note) were visible in the page source.
    const html = await (await request.get('https://txid.uk/')).text();
    expect(html).not.toContain('a11y 전수');
    expect(html).not.toContain('파비콘 정본');
  });
});
