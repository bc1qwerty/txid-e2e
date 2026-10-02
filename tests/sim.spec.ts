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
});
