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
});
