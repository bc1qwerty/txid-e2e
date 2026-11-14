import { test, expect } from '../fixtures';

const BASE = 'https://dev.txid.uk';

// The debugger is an Astro island with client="visible": the SSR markup ships with a
// textarea and a 실행 button that have no handlers attached yet. Clicking before the
// island hydrates does nothing at all, and the test then waits for output that never
// arrives. Astro drops the `ssr` attribute once hydration finishes, so gate on that.
async function openDebugger(page: import('@playwright/test').Page, path = '/ko/tools/script-debugger/') {
  await page.goto(`${BASE}${path}`);
  // client="visible" only hydrates once the island is in view.
  await page.locator('textarea').scrollIntoViewIfNeeded();
  // Pin the gate to this page's own island. A bare `astro-island:not([ssr])` would match
  // whichever island hydrates first, so adding any second island to the page later would
  // silently disarm the wait.
  // 섬 스크립트가 404 면 하이드레이션이 영영 안 끝난다 — 테스트 타임아웃(60초)까지 끌지 않는다.
  await page.waitForSelector('astro-island[component-export="ScriptDebugger"]:not([ssr])', { timeout: 15_000 });
}

test.describe('dev.txid.uk - Script Debugger', () => {
  test('loads /ko/tools/script-debugger/ and executes a simple script', async ({ page }) => {
    await openDebugger(page);
    await expect(page.locator('h1')).toContainText('스크립트 디버거');

    // Enter ASM and click 실행
    await page.locator('textarea').fill('OP_1 OP_DUP');
    await page.getByRole('button', { name: '실행' }).click();

    // Stack should show two 01 entries (top-of-stack first)
    const stackItems = page.locator('.stack-list li code');
    await expect(stackItems.first()).toHaveText('01');

    // Status should indicate success
    await expect(page.locator('.ok')).toContainText('성공');
  });

  test('displays parse error for invalid input', async ({ page }) => {
    await openDebugger(page);
    await page.locator('textarea').fill('OP_NOT_A_REAL_OPCODE');
    await page.getByRole('button', { name: '실행' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('step controls navigate trace', async ({ page }) => {
    await openDebugger(page);
    await page.locator('textarea').fill('OP_1 OP_2 OP_ADD');
    await page.getByRole('button', { name: '실행' }).click();

    // Initial step counter should be in form "N / M"
    await expect(page.locator('.step-controls span')).toContainText('/');

    // Click next step
    await page.getByRole('button', { name: '다음 단계' }).click();
    // Step counter advances
    await expect(page.locator('.step-controls span')).toHaveText(/2 \/ \d+/);
  });

  // 2026-11-12 부터 언어별 경로다. 옛 주소(한국어였다)는 한국어 판으로 301.
  test('old /tools/script-debugger redirects to the Korean page', async ({ page, request }) => {
    // 영구 이동(301)이어야 검색엔진이 주소를 옮긴다.
    const hop = await request.get(`${BASE}/tools/script-debugger/`, { maxRedirects: 0 });
    expect(hop.status()).toBe(301);
    expect(hop.headers()['location']).toMatch(/\/ko\/tools\/script-debugger\/$/);
    const res = await page.goto(`${BASE}/tools/script-debugger/`);
    expect(new URL(page.url()).pathname).toBe('/ko/tools/script-debugger/');
    expect(res?.status()).toBe(200);
  });

  // 🔴 2026-11-14 까지 검색(Pagefind)이 전 페이지에서 뜨지 않았다 — 실패가 console.warn 뿐이라 아무도 몰랐다.
  for (const lang of ['ko', 'en']) {
    test(`site search returns results (${lang})`, async ({ page }) => {
      await page.goto(`${BASE}/${lang}/`);
      const input = page.locator('#search input.pagefind-ui__search-input');
      await expect(input).toBeVisible({ timeout: 15_000 });
      await input.fill('Taproot');
      await expect(page.locator('#search .pagefind-ui__result').first()).toBeVisible({ timeout: 15_000 });
    });
  }

  test('English page runs in English and treats false as the empty value', async ({ page }) => {
    await openDebugger(page, '/en/tools/script-debugger/');
    await expect(page.locator('h1')).toHaveText('Bitcoin Script Debugger');
    // 비교 결과 거짓은 빈 값이라 OP_0 과 같다 — 이 디버거가 한동안 0x00 을 넣어 틀렸던 자리.
    await page.locator('textarea').fill('OP_1 OP_2 OP_EQUAL OP_0 OP_EQUAL');
    await page.getByRole('button', { name: 'Run' }).click();
    await expect(page.locator('.ok')).toContainText('Success');
  });
});
