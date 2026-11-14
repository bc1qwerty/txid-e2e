import { test, expect } from '../fixtures';

const BASE = 'https://lokl.txid.uk';

// 노트는 브라우저 DB(IndexedDB)에만 들어간다 — 이 테스트가 쓴 것은 테스트 컨텍스트와 함께 사라지고
// 서버에는 아무것도 안 간다(동기화는 로그인·구독이 있어야 켜진다).
test.describe('lokl.txid.uk - Notes', () => {
  test('app shell loads', async ({ page }) => {
    const res = await page.goto(BASE);
    expect(res!.status()).toBe(200);
    await expect(page.getByRole('button', { name: 'Start fresh' })).toBeVisible({ timeout: 15_000 });
  });

  // 🔴 Ctrl+S 를 누르지 않는다. 디바운스 자동 저장이 한 번도 안 돌던 것이 2026-11-13 까지
  //    라이브에 있었고, 저장을 전부 Ctrl+S 로 하던 테스트는 그것을 못 봤다.
  test('an edit autosaves and survives a reload', async ({ page }) => {
    await page.goto(BASE);
    await page.getByRole('button', { name: 'Start fresh' }).click({ timeout: 15_000 });
    await expect(page.locator('.sidebar')).toBeVisible();
    const editBtn = page.getByRole('button', { name: 'Edit' });
    if (await editBtn.isVisible()) await editBtn.click();

    await page.locator('.sidebar-action-btn').click();
    await page.locator('.new-file-input').fill('e2e-note');
    await page.getByRole('button', { name: 'Create' }).click();
    const editor = page.locator('.cm-content');
    await expect(editor).toBeVisible();
    await editor.click();
    await editor.pressSequentially('autosaved 7c1e', { delay: 20 });

    await expect(page.locator('.toolbar')).toContainText('Unsaved');
    await expect(page.locator('.toolbar')).not.toContainText('Unsaved', { timeout: 5_000 });

    let dialogs = 0;
    page.on('dialog', async (d) => { dialogs++; await d.accept(); });
    await page.reload();
    await expect(page.locator('.sidebar')).toBeVisible();
    expect(dialogs, 'beforeunload 가 떴다 — 노트가 아직 저장 전이다').toBe(0);
    await page.locator('.tree-item-name', { hasText: 'e2e-note' }).click();
    await expect(page.locator('.cm-content')).toContainText('autosaved 7c1e');
  });
});
