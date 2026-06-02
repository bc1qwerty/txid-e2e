import { test, expect } from "@playwright/test";

test("status home renders hero + grid", async ({ page }) => {
  await page.goto("https://status.txid.uk/");
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".hero h1")).toBeVisible();
  const cards = page.locator(".site-card");
  await expect(cards.first()).toBeVisible();
  await page.screenshot({ path: "/tmp/audit-shots/status-home.png", fullPage: true });
  const count = await cards.count();
  expect(count).toBeGreaterThan(10);
});

test("status mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("https://status.txid.uk/");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "/tmp/audit-shots/status-mobile.png", fullPage: true });
});

test("incidents page", async ({ page }) => {
  await page.goto("https://status.txid.uk/incidents");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "/tmp/audit-shots/status-incidents.png", fullPage: true });
});

test("dev.txid.uk loads", async ({ page }) => {
  await page.goto("https://dev.txid.uk/");
  await expect(page.locator("body")).toBeVisible();
  await page.screenshot({ path: "/tmp/audit-shots/dev-home.png", fullPage: true });
});

test("dev debugger runs", async ({ page }) => {
  await page.goto("https://dev.txid.uk/tools/script-debugger");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "/tmp/audit-shots/dev-debugger.png", fullPage: true });
});
