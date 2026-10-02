import { test, expect } from '../fixtures';
import { expectLocaleLanding } from '../locale-helpers';

const BASE = 'https://tx.txid.uk/en/';

test.describe('tx.txid.uk - Transaction Tools', () => {
  test('page loads with 3 tabs', async ({ page }) => {
    const response = await page.goto(BASE);
    expect(response!.status()).toBeLessThan(400);

    const tabs = page.locator('.tab-btn, [role="tab"], button[data-tab]');
    const count = await tabs.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('tab switching works (Broadcast, Decode, Lookup)', async ({ page }) => {
    await page.goto(BASE);
    const tabs = page.locator('.tab-btn, [role="tab"], button[data-tab]');

    // Click each tab and verify it becomes active (class + aria-selected)
    // and its panel is shown. aria-selected sync was a real a11y bug found
    // by this suite on 2026-06-12 and fixed in monorepo apps/tx.
    const tabCount = await tabs.count();
    for (let i = 0; i < Math.min(tabCount, 3); i++) {
      await tabs.nth(i).click();
      await page.waitForTimeout(300);

      await expect(tabs.nth(i)).toHaveClass(/active/);
      await expect(tabs.nth(i)).toHaveAttribute('aria-selected', 'true');
      // All other tabs must be deselected (radio-style sync)
      for (let j = 0; j < Math.min(tabCount, 3); j++) {
        if (j === i) continue;
        await expect(tabs.nth(j)).toHaveAttribute('aria-selected', 'false');
      }
      const panelId = await tabs.nth(i).getAttribute('aria-controls');
      expect(panelId).toBeTruthy();
      await expect(page.locator(`#${panelId}`)).toBeVisible();
    }
  });

  // 🔴 조회 패널이 `tx.vsize` 를 읽었는데 mempool.space 의 /api/tx/ 는 그 칸을 주지
  //    않는다 — `weight` 를 준다. 그래서 모든 조회가 「undefined vB」와 「0 sat/vB」를
  //    찍었다. 페이지는 200 이고 요청도 성공했으며 받아온 숫자도 맞았다. **vsize 에서
  //    파생되는 둘만 틀렸다** — 그래서 스모크로는 안 잡히고, 산술을 봐야 잡힌다.
  //    (2026-08-28 에 고쳤는데 **배포되지 않는 사본**에 고쳐서 라이브는 2026-10-02 까지
  //    그대로였다. 그래서 이 검사는 **배포된 사이트**에 대고 도는 여기 있어야 한다.)
  // ⚠ 남의 uptime 을 탄다. mempool.space 가 답을 안 주면 **건너뛴다** — 거기서 떨어뜨리면
  //   남의 장애가 우리 배포를 막는다(그 일이 실제로 사흘 있었다). 숫자가 어긋나는 것만
  //   실패다.
  test('조회 결과의 vsize·수수료율이 API 와 맞는가', async ({ page, request }) => {
    const recentRes = await request.get('https://mempool.space/api/mempool/recent').catch(() => null);
    test.skip(!recentRes || !recentRes.ok(), 'mempool.space 에 닿지 않는다');
    const txid = (await recentRes!.json())[0].txid as string;
    const txRes = await request.get(`https://mempool.space/api/tx/${txid}`).catch(() => null);
    test.skip(!txRes || !txRes.ok(), 'mempool.space 에 닿지 않는다');
    const tx = await txRes!.json();
    // 가상 크기는 weight 를 4로 나눠 올림한 값이다 (BIP 141).
    const vsize = tx.vsize ?? Math.ceil(tx.weight / 4);
    const rate = (tx.fee / vsize).toFixed(1);

    // 페이지가 브라우저에서 부르는 쪽도 막힐 수 있다. 그건 우리 결함이 아니다.
    let apiStatus: number | null = null;
    let apiType = '';
    page.on('response', (r) => {
      if (r.url().includes('mempool.space/api/tx/')) {
        apiStatus = r.status();
        apiType = r.headers()['content-type'] || '';
      }
    });

    await page.goto(BASE);
    await page.locator('#tab-lookup').click();
    await page.locator('#txid-input').fill(txid);
    await page.locator('#btn-lookup').click();

    const result = page.locator('#lookup-result');
    // 결과가 그려지거나 페이지가 포기할 때까지. 고정 대기를 쓰면 재시도 중인 「조회 중…」
    // 을 결과로 읽는다.
    await expect
      .poll(async () => {
        const err = await result.locator('.result-err').count();
        return err > 0 || /sat\/vB/.test(await result.innerText());
      }, { timeout: 25_000 })
      .toBe(true);

    const gaveUp = (await result.locator('.result-err').count()) > 0;
    const upstreamBad =
      apiStatus === null || apiStatus >= 400 || !/json/i.test(apiType);
    test.skip(gaveUp && upstreamBad, `페이지가 mempool.space 에서 답을 못 받았다 (HTTP ${apiStatus} ${apiType})`);

    const text = (await result.innerText()).replace(/\s+/g, ' ');
    expect(text, 'API 는 멀쩡한데 페이지가 오류를 그렸다').not.toContain('undefined');
    expect(text).toContain(`${vsize} vB`);
    expect(text).toContain(`${rate} sat/vB`);
    expect(text).toContain(`${tx.fee.toLocaleString()} sat`);
  });

  test('ARIA attributes present (role="tab", aria-selected)', async ({ page }) => {
    await page.goto(BASE);

    // Check tablist exists
    const tablist = page.locator('[role="tablist"]');
    await expect(tablist.first()).toBeVisible();

    // Check tabs have proper ARIA
    const tabs = page.locator('.tab-btn, [role="tab"], button[data-tab]');
    const firstTab = tabs.first();
    const ariaSelected = await firstTab.getAttribute('aria-selected');
    expect(ariaSelected).toBeTruthy();

    // Check tabpanels exist
    const tabpanels = page.locator('[role="tabpanel"]');
    const panelCount = await tabpanels.count();
    expect(panelCount).toBeGreaterThanOrEqual(1);
  });

  // 🔑 로케일 착지 — 공통 단언은 ../locale-helpers.ts 에 있다(원래 txid-web 의
  //    check-locale-landing.mjs, 2026-10-02 에 배포된 사이트를 보는 이쪽으로 옮겼다).
  // ⚠ 새 파일로 두면 **archive CI 가 집어가지 않는다** — 거기서는 `tests/<short>.spec.ts`
  //   이름 규약으로만 스펙을 고른다. 그래서 각 사이트 파일 안에 둔다.
  for (const route of ['/ko/', '/ja/']) {
    test(`로케일 착지 ${route}`, async ({ page }) => {
      await expectLocaleLanding(page, 'https://tx.txid.uk', route);
    });
  }
});
