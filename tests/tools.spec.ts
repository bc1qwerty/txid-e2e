import { test, expect } from '../fixtures';
import { expectLocaleLanding } from '../locale-helpers';

const BASE = 'https://tools.txid.uk';

test.describe('tools.txid.uk - Bitcoin Tools', () => {
  test('tool directory index lists tool cards', async ({ page }) => {
    await page.goto(`${BASE}/en/`);
    // Index page is now a tool directory: each tool is a card with an h2 title
    const cards = page.locator('a.tool-dir-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(5);
    // Section headings present too
    const headings = page.locator('h2.tool-dir-name');
    expect(await headings.count()).toBeGreaterThanOrEqual(5);
  });

  test('Address Validator accepts valid BTC address', async ({ page }) => {
    // Address validator moved to its own route
    await page.goto(`${BASE}/en/address-validator/`);
    const addressInput = page.locator('#addr-input');
    await expect(addressInput).toBeVisible();

    // Enter a valid P2PKH address (client-side analysis only)
    await addressInput.fill('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    await addressInput.press('Enter');

    // Validation result appears in #addr-result
    const result = page.locator('#addr-result');
    await expect(result).toBeVisible();
    await expect(result).toContainText('P2PKH');
  });

  test('Unit Converter shows conversion', async ({ page }) => {
    // Unit converter moved to its own route
    await page.goto(`${BASE}/en/unit-converter/`);
    const btcInput = page.locator('#conv-btc');
    await expect(btcInput).toBeVisible();

    await btcInput.fill('1');
    // 1 BTC = 100,000,000 sats (client-side conversion)
    await expect(page.locator('#conv-sat')).toHaveValue('100000000');
  });

  test('language route /en/ works', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/`);
    expect(response!.status()).toBeLessThan(400);
  });

  test('language route /ko/ works', async ({ page }) => {
    const response = await page.goto(`${BASE}/ko/`);
    expect(response!.status()).toBeLessThan(400);
  });

  test('language route /ja/ works', async ({ page }) => {
    const response = await page.goto(`${BASE}/ja/`);
    expect(response!.status()).toBeLessThan(400);
  });

  // 🔑 로케일 착지 — 공통 단언은 ../locale-helpers.ts 에 있다(원래 txid-web 의
  //    check-locale-landing.mjs, 2026-10-02 에 배포된 사이트를 보는 이쪽으로 옮겼다).
  // ⚠ 새 파일로 두면 **archive CI 가 집어가지 않는다** — 거기서는 `tests/<short>.spec.ts`
  //   이름 규약으로만 스펙을 고른다. 그래서 각 사이트 파일 안에 둔다.
  for (const route of ['/ko/', '/ja/', '/ko/address-validator/', '/ja/script-decoder/']) {
    test(`로케일 착지 ${route}`, async ({ page }) => {
      await expectLocaleLanding(page, 'https://tools.txid.uk', route);
    });
  }
});
