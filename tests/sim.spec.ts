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

  // 🔴 **슬라이더는 제 라벨이 약속한 난이도를 줘야 한다.** 라벨은 「선행 0 (16진수)」
  //    인데 화면에 뜨는 값은 슬라이더의 원시값이라, 둘이 어긋나도 아무도 모른다.
  // 🔑 원래 txid-web 의 check-mining-difficulty.mjs 였다. 2026-10-02 에는 배포된
  //    채굴 화면에 `mine-target` 자체가 없어 절반만 옮겼는데, 10-03 에 시뮬레이터
  //    재작성본이 배포되면서(archive a1bf871) 타깃 표시가 생겨 되살린다.
  // ⚠ 상한을 박아 두지 않는다. 슬라이더가 말하는 min/max 를 쓴다 — 숫자를 적어 두면
  //   범위가 바뀔 때마다 검사가 거짓으로 빨개진다(실제로 5 였다가 6 이 됐다).
  test('채굴 슬라이더가 라벨대로의 난이도를 주는가', async ({ page }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(e.message.slice(0, 100)));
    await page.goto('https://sim.txid.uk/ko/mining/', { waitUntil: 'networkidle' });

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
      // 🔑 표기만 보면 반쪽이다. **타깃이 실제로 그만큼의 선행 0 을 갖는지**가 라벨의 약속이다.
      const target = (await page.locator('#mine-target').innerText()).trim();
      const zeros = (target.match(/^0*/) || [''])[0].length;
      expect(zeros, `슬라이더 ${n} 인데 타깃 선행 0 은 ${zeros}개 (${target.slice(0, 12)}…)`).toBe(n);
    }
    expect(errs, 'JS 오류').toEqual([]);
  });
});
