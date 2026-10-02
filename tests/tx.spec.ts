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

  // 🔴 디코더는 **네트워크와 같은 말**을 해야 한다. 예전에는 입력의 스크립트 종류를
  //    판별하지 못해 「Unknown」으로 남겼고, segwit 을 그대로 해시해서 **wtxid** 를
  //    TXID 라고 내놨다 — 64자 hex 라 멀쩡해 보이지만 어느 탐색기에서도 안 찾아진다.
  // ⚠ 일부러 **segwit** 트랜잭션을 고른다. witness 가 없으면 wtxid 와 txid 가 같아서,
  //   segwit 을 틀리게 다루는 디코더도 TXID 단언을 통과한다.
  // 🔑 원래 txid-web 의 check-tx-decode.mjs 였다(배포되지 않는 사본을 검사하고 있었다).
  test('디코드 결과가 네트워크와 일치하는가', async ({ page, request }) => {
    const recentRes = await request.get('https://mempool.space/api/mempool/recent').catch(() => null);
    test.skip(!recentRes || !recentRes.ok(), 'mempool.space 에 닿지 않는다');
    let txid = '';
    let tx: any = null;
    for (const r of (await recentRes!.json()).slice(0, 12)) {
      const res = await request.get(`https://mempool.space/api/tx/${r.txid}`).catch(() => null);
      if (!res || !res.ok()) continue;
      const cand = await res.json();
      if (cand.vin.some((v: any) => v.witness && v.witness.length)) { txid = r.txid; tx = cand; break; }
    }
    test.skip(!txid, '최근 목록에 segwit 트랜잭션이 없다');
    const hexRes = await request.get(`https://mempool.space/api/tx/${txid}/hex`).catch(() => null);
    test.skip(!hexRes || !hexRes.ok(), 'mempool.space 에 닿지 않는다');
    const hex = (await hexRes!.text()).trim();
    const totalOut = tx.vout.reduce((acc: number, o: any) => acc + o.value, 0);

    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(e.message.slice(0, 100)));
    await page.goto(BASE);
    await page.locator('#tab-decode').click();
    await page.locator('#decode-tx').fill(hex);
    await page.locator('#btn-decode-only').click();
    const result = page.locator('#decode-result');
    await expect.poll(async () => (await result.innerText()).length > 0, { timeout: 20_000 }).toBe(true);
    const text = (await result.innerText()).replace(/\s+/g, ' ');

    expect(errs, 'JS 오류').toEqual([]);
    expect(text).not.toMatch(/undefined|NaN/);
    expect(text).toContain(`${tx.size} bytes`);
    expect(text).toContain(`(${tx.vin.length}`);
    expect(text).toContain(`(${tx.vout.length}`);
    expect(text).toContain(`${(totalOut / 1e8).toFixed(8)} BTC`);
    // 이 가드가 있는 이유인 라벨: 디코드는 됐는데 아무 말도 못 하는 입력.
    expect(text, '입력 또는 출력이 Unknown 으로 남았다').not.toMatch(/Unknown/);
    // 🔴 디코더가 「맞아 보이게」 틀릴 수 있는 **유일한 값**이다. segwit 을 받은 그대로
    //    해시하면 wtxid 가 나오는데 64자 hex 라 멀쩡해 보이고 어느 탐색기에서도 안
    //    찾아진다. 그래서 일부러 segwit 트랜잭션을 고른다(위 참고).
    // ⚠ crypto.subtle 이 비동기라 패널보다 늦게 채워진다. 기다렸다 본다.
    await expect.poll(async () => (await result.innerText()).includes(txid), { timeout: 10_000 })
      .toBe(true);
  });
});
