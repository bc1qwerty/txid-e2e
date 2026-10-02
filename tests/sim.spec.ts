import { test, expect } from '../fixtures';
import { expectLocaleLanding } from '../locale-helpers';

const BASE = 'https://sim.txid.uk';

test.describe('sim.txid.uk - Bitcoin Simulator', () => {
  test('homepage loads with 6 module cards', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/`);
    expect(response!.status()).toBeLessThan(400);

    const cards = page.locator('.module-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test('hash module link works', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/hash/`);
    expect(response!.status()).toBeLessThan(400);
    await expect(page.locator('body')).toContainText(/hash/i);
  });

  test('mining module link works', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/mining/`);
    expect(response!.status()).toBeLessThan(400);
    await expect(page.locator('body')).toContainText(/min/i);
  });

  test('keys module link works', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/keys/`);
    expect(response!.status()).toBeLessThan(400);
  });

  test('transaction builder module link works', async ({ page }) => {
    // Old /en/transaction/ route was renamed to /en/tx-builder/
    const response = await page.goto(`${BASE}/en/tx-builder/`);
    expect(response!.status()).toBeLessThan(400);
    await expect(page).toHaveTitle(/transaction builder/i);
  });

  test('merkle module link works', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/merkle/`);
    expect(response!.status()).toBeLessThan(400);
    await expect(page).toHaveTitle(/merkle/i);
  });

  test('blockchain module link works', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/blockchain/`);
    expect(response!.status()).toBeLessThan(400);
  });

  // 🔑 로케일 착지 — 공통 단언은 ../locale-helpers.ts 에 있다(원래 txid-web 의
  //    check-locale-landing.mjs, 2026-10-02 에 배포된 사이트를 보는 이쪽으로 옮겼다).
  // ⚠ 새 파일로 두면 **archive CI 가 집어가지 않는다** — 거기서는 `tests/<short>.spec.ts`
  //   이름 규약으로만 스펙을 고른다. 그래서 각 사이트 파일 안에 둔다.
  for (const route of ['/ko/', '/ja/']) {
    test(`로케일 착지 ${route}`, async ({ page }) => {
      await expectLocaleLanding(page, 'https://sim.txid.uk', route);
    });
  }

  // 🔴 슬라이더가 고른 난이도와 **화면에 뜬 값**이 어긋나면 아무도 모른다. 라벨은
  //    「선행 0 (16진수)」인데 표시되는 것은 슬라이더의 원시값이라 둘이 갈릴 수 있다.
  // 🔑 원래 txid-web 의 check-mining-difficulty.mjs 였다(배포되지 않는 사본을 검사했다).
  // ⚠ **원본의 절반만 옮겼다.** 원본은 `mine-target` 의 선행 0 개수까지 봤는데 배포된
  //   채굴 화면에는 그 표시도 `guide-mode-free` 도 **없다**(실측 2026-10-02: 있는 것은
  //   mine-difficulty · mine-diff-val · mine-hash · mine-status 넷뿐). 타깃 표시가 있는
  //   새 채굴 UI 는 안 나가는 사본에만 있다. 그 UI 가 배포되면 선행 0 단언을 되살릴 것.
  test('채굴 슬라이더와 화면 표기가 같은가', async ({ page }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(e.message.slice(0, 100)));
    await page.addInitScript(() => { try { localStorage.setItem('onboarding_done', 'true'); } catch {} });
    await page.goto('https://sim.txid.uk/ko/mining/', { waitUntil: 'networkidle' });

    // ⚠ 상한을 박아 두지 않는다. 배포본은 5, 안 나가는 사본은 6 이었다 — 숫자를 적어
    //   두면 범위가 바뀔 때마다 검사가 거짓으로 빨개진다. 슬라이더가 말하는 값을 쓴다.
    const { min, max } = await page.locator('#mine-difficulty').evaluate((el) => ({
      min: Number((el as HTMLInputElement).min || 1),
      max: Number((el as HTMLInputElement).max || 1),
    }));
    expect(max, '슬라이더 범위를 못 읽었다').toBeGreaterThan(min);
    for (let n = min; n <= max; n++) {
      await page.evaluate((v) => {
        const s = document.getElementById('mine-difficulty') as HTMLInputElement;
        s.value = String(v);
        s.dispatchEvent(new Event('input', { bubbles: true }));
        s.dispatchEvent(new Event('change', { bubbles: true }));
      }, n);
      await expect
        .poll(async () => (await page.locator('#mine-diff-val').innerText()).trim(), { timeout: 5_000 })
        .toBe(String(n));
    }
    expect(errs, 'JS 오류').toEqual([]);
  });
});
