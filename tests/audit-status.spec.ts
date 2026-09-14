import { test, expect } from "../fixtures";

test("status home renders hero + grid", async ({ page }) => {
  await page.goto("https://status.txid.uk/");
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".hero h1")).toBeVisible();
  const cards = page.locator(".site-card");
  await expect(cards.first()).toBeVisible();
  const count = await cards.count();
  expect(count).toBeGreaterThan(10);
});

test("status mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const res = await page.goto("https://status.txid.uk/");
  expect(res?.status()).toBeLessThan(400);
  await expect(page.locator(".site-card").first()).toBeVisible();
});

test("incidents page", async ({ page }) => {
  const res = await page.goto("https://status.txid.uk/incidents");
  expect(res?.status()).toBeLessThan(400);
  await expect(page.locator("h1").first()).toBeVisible();
});

test("dev.txid.uk loads", async ({ page }) => {
  await page.goto("https://dev.txid.uk/");
  await expect(page.locator("body")).toBeVisible();
});

test("dev debugger page loads", async ({ page }) => {
  // 실행까지 검증하는 시험은 dev-debugger.spec.ts 에 있다. 여기는 로드만 본다.
  await page.goto("https://dev.txid.uk/tools/script-debugger");
  await expect(page.locator("h1")).toContainText("스크립트 디버거");
});
