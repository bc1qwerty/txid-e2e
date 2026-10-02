import { test, expect } from '../fixtures';
import { expectLocaleLanding } from '../locale-helpers';

const BASE = 'https://id.txid.uk/en/';

test.describe('id.txid.uk - Identity Service', () => {
  test('page loads', async ({ page }) => {
    const response = await page.goto(BASE);
    expect(response!.status()).toBeLessThan(400);
    await expect(page).toHaveTitle(/.+/);
  });

  test('NIP-05 registration form exists', async ({ page }) => {
    await page.goto(BASE);

    const form = page.locator('form, [class*="register"], [class*="nip"]');
    const inputs = page.locator('input[type="text"], input[type="email"], input[placeholder*="name" i], input[placeholder*="npub" i], input[placeholder*="nip" i]');

    const formCount = await form.count();
    const inputCount = await inputs.count();

    // Either a form element or at least one input should exist
    expect(formCount + inputCount).toBeGreaterThanOrEqual(1);
  });

  // 🔑 로케일 착지 — 공통 단언은 ../locale-helpers.ts 에 있다(원래 txid-web 의
  //    check-locale-landing.mjs, 2026-10-02 에 배포된 사이트를 보는 이쪽으로 옮겼다).
  // ⚠ 새 파일로 두면 **archive CI 가 집어가지 않는다** — 거기서는 `tests/<short>.spec.ts`
  //   이름 규약으로만 스펙을 고른다. 그래서 각 사이트 파일 안에 둔다.
  for (const route of ['/ko/', '/ja/']) {
    test(`로케일 착지 ${route}`, async ({ page }) => {
      await expectLocaleLanding(page, 'https://id.txid.uk', route);
    });
  }
});
