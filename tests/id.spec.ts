import { test, expect } from '@playwright/test';

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
});
