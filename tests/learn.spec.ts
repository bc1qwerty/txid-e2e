import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

const BASE = 'https://learn.txid.uk';

// 404 쪽도 nav·footer 와 «bitcoin» 이라는 글자를 갖는다. 그래서 상태 코드와 html[lang] 을 함께 본다.
async function openHome(page: Page, lang: string) {
  const res = await page.goto(`${BASE}/${lang}/`);
  expect(res?.status(), `/${lang}/ 상태 코드`).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', lang);
}

test.describe('learn.txid.uk - Education Site', () => {
  test('English page loads', async ({ page }) => {
    await openHome(page, 'en');
    await expect(page.locator('body')).toContainText(/bitcoin|blockchain|learn/i);
  });

  test('Korean page loads', async ({ page }) => {
    await openHome(page, 'ko');
    await expect(page.locator('body')).toContainText(/비트코인|블록체인|학습/);
  });

  test('Japanese page loads', async ({ page }) => {
    await openHome(page, 'ja');
    await expect(page.locator('body')).toContainText(/ビットコイン|ブロックチェーン|学/);
  });

  test('navigation menu exists', async ({ page }) => {
    await openHome(page, 'en');
    const nav = page.locator('nav');
    await expect(nav.first()).toBeVisible();
  });

  test('footer links work', async ({ page, request }) => {
    await openHome(page, 'en');
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // 첫 내부 링크가 실제로 열리는지까지 본다.
    const internal = footer.locator('a[href^="/"]');
    await expect(internal.first()).toBeVisible();
    const href = await internal.first().getAttribute('href');
    const res = await request.get(`${BASE}${href}`);
    expect(res.status(), `footer 링크 ${href}`).toBe(200);
  });
});
