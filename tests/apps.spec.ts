import { test, expect } from '../fixtures';
import { expectLocaleLanding } from '../locale-helpers';

const BASE = 'https://apps.txid.uk';

test.describe('apps.txid.uk - App Directory', () => {
  test('page loads with app cards', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/`);
    expect(response!.status()).toBeLessThan(400);

    const cards = page.locator('a.app-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('category sections group app cards', async ({ page }) => {
    // The old interactive filter buttons were removed when the site was
    // refactored to the [lang]/[app].astro content collection structure.
    // Apps are now grouped into static category sections instead.
    await page.goto(`${BASE}/en/`);

    const sections = page.locator('section.category-section');
    expect(await sections.count()).toBeGreaterThanOrEqual(4);

    for (const category of ['platform', 'bot', 'app', 'dev']) {
      const section = page.locator(`#app-grid-${category}`);
      await expect(section.locator('h2')).toBeVisible();

      const cards = section.locator(`a.app-card[data-category="${category}"]`);
      expect(await cards.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('app cards link to valid detail pages', async ({ page }) => {
    await page.goto(`${BASE}/en/`);

    const cards = page.locator('a.app-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Cards come in two kinds (AppCard.astro): entries with `external: true` in
    // their content frontmatter link straight out to the thing itself and open
    // in a new tab, everything else gets an internal detail route /en/<slug>/.
    // The suite used to assume every card was internal, which broke once the
    // Telegram-bot entries (href https://t.me/...) landed.
    let internalSeen = 0;
    for (let i = 0; i < Math.min(count, 20); i++) {
      const card = cards.nth(i);
      const href = await card.getAttribute('href');
      expect(href).toBeTruthy();

      if ((await card.getAttribute('target')) === '_blank') {
        // External: absolute URL, and rel must carry noopener — target=_blank
        // without it hands the opener window to the destination.
        expect(href).toMatch(/^https?:\/\//);
        expect(await card.getAttribute('rel')).toContain('noopener');
      } else {
        expect(href).toMatch(/^\/en\/[a-z0-9-]+\/$/);
        internalSeen++;
      }
    }
    expect(internalSeen).toBeGreaterThanOrEqual(1);

    // Navigating into the first internal card opens an app detail page.
    // (Clicking an external one would just open a new tab off-site.)
    // :not() on the anchor itself — filter({hasNot}) would test descendants.
    await page.locator('a.app-card:not([target="_blank"])').first().click();
    await expect(page.locator('h1.detail-title')).toBeVisible();
    expect(page.url()).toMatch(/^https:\/\/apps\.txid\.uk\/en\/[a-z0-9-]+\/$/);
  });

  // 🔑 로케일 착지 — 공통 단언은 ../locale-helpers.ts 에 있다(원래 txid-web 의
  //    check-locale-landing.mjs, 2026-10-02 에 배포된 사이트를 보는 이쪽으로 옮겼다).
  // ⚠ 새 파일로 두면 **archive CI 가 집어가지 않는다** — 거기서는 `tests/<short>.spec.ts`
  //   이름 규약으로만 스펙을 고른다. 그래서 각 사이트 파일 안에 둔다.
  for (const route of ['/ko/', '/ja/', '/ko/tools/']) {
    test(`로케일 착지 ${route}`, async ({ page }) => {
      await expectLocaleLanding(page, 'https://apps.txid.uk', route);
    });
  }

  // 🔴 **카탈로그의 링크가 살아 있어야 한다.** 앱 허브의 값은 「링크가 열린다」가
  //    전부인데 카탈로그는 마크다운이라 대상이 사라져도 빌드가 통과한다. 2026-08-26 에
  //    22개 중 3개가 404 였다 — learn 의 로케일 없는 경로, apps 자신의 로케일 없는
  //    경로, 그리고 **비공개 리포**(방문자에겐 404).
  // 🔑 원래 txid-web 의 check-app-links.mjs 였다. 거기서는 **배포되지 않는 사본**의
  //    마크다운을 디스크에서 읽었다 — 즉 라이브 카탈로그가 아니라 다른 파일을 봤다.
  //    여기서는 허브가 실제로 그린 카드를 따라간다(2026-10-02 이전).
  // ⚠ 판정은 **상태 코드뿐**이다. content-type 까지 보면 카탈로그에 정당하게 올라간
  //   API 항목(api.txid.uk 는 JSON 을 준다)이 걸린다. 그리고 200 이 「동작한다」는
  //   뜻도 아니다 — 루트용으로 빌드된 GitHub Pages 가 200 에 빈 화면을 준 적이 있고
  //   (자산이 전부 404), 그건 content-type 으로도 못 잡는다. 여기서 잡는 것은
  //   사라진 대상과 오타다.
  // ⚠ t.me 는 봇이 없어도 200 을 준다. 도메인·오타까지만 잡힌다.
  test('카탈로그의 바깥 링크가 전부 열리는가', async ({ request }) => {
    const hub = await request.get('https://apps.txid.uk/en/');
    expect(hub.ok()).toBe(true);
    const detail = [...new Set(
      (await hub.text()).match(/href="(\/en\/[a-z0-9-]+\/)"/g)?.map((m) => m.slice(6, -1)) ?? [],
    )];
    expect(detail.length, '허브에서 카드를 못 찾았다').toBeGreaterThan(10);

    const bad: string[] = [];
    for (const path of detail) {
      const page = await request.get(`https://apps.txid.uk${path}`);
      if (!page.ok()) { bad.push(`${page.status()} ${path}`); continue; }
      const href = (await page.text()).match(/<a href="(https?:\/\/[^"]+)" class="btn visit-btn"/)?.[1];
      if (!href) { continue; }   // 목적지가 없는 항목(비공개 리포 등)은 버튼을 안 그린다
      const res = await request.get(href, { maxRedirects: 5 }).catch(() => null);
      if (!res) { bad.push(`연결 실패 ${href}`); continue; }
      if (res.status() >= 400) { bad.push(`${res.status()} ${href}`); }
    }
    expect(bad, '카탈로그가 죽은 링크를 가리킨다').toEqual([]);
  });
});
