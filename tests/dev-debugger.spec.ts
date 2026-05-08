import { test, expect } from '@playwright/test';

const BASE = 'https://dev.txid.uk';

test.describe('dev.txid.uk - Script Debugger', () => {
  test('loads /tools/script-debugger and executes a simple script', async ({ page }) => {
    await page.goto(`${BASE}/tools/script-debugger`);
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
    await page.goto(`${BASE}/tools/script-debugger`);
    await page.locator('textarea').fill('OP_NOT_A_REAL_OPCODE');
    await page.getByRole('button', { name: '실행' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('step controls navigate trace', async ({ page }) => {
    await page.goto(`${BASE}/tools/script-debugger`);
    await page.locator('textarea').fill('OP_1 OP_2 OP_ADD');
    await page.getByRole('button', { name: '실행' }).click();

    // Initial step counter should be in form "N / M"
    await expect(page.locator('.step-controls span')).toContainText('/');

    // Click next step
    await page.getByRole('button', { name: '다음 단계' }).click();
    // Step counter advances
    const counter = await page.locator('.step-controls span').textContent();
    expect(counter).toMatch(/2 \/ \d+/);
  });
});
