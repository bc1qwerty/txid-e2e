import { test, expect } from '../fixtures';
import { expectLocaleLanding } from '../locale-helpers';

const BASE = 'https://id.txid.uk/en/';

test.describe('id.txid.uk - Identity Service', () => {
  test('page loads', async ({ page }) => {
    const response = await page.goto(BASE);
    expect(response!.status()).toBe(200);
    await expect(page).toHaveTitle(/NIP-05.*txid\.uk/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('NIP-05 registration form exists', async ({ page }) => {
    await page.goto(BASE);

    // 등록 폼의 이름 입력칸과 그 길이 제한(16자)까지 본다.
    // 로그인 전에는 폼이 숨겨져 있으므로(로그인 안내가 먼저 보인다) 존재만 본다.
    const username = page.locator('#nip05-username');
    await expect(username).toBeAttached();
    await expect(username).toHaveAttribute('maxlength', '16');
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
