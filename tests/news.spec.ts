import { test, expect, Page } from '../fixtures';

const BASE = 'https://news.txid.uk';

// Front page article teasers are <a href="/post/..."> elements that open a
// <dialog class="np-modal"> on a plain click (news.txid.uk 385477e, 2026-08-27 —
// they were <button> before, which left the front page with no crawlable path to
// any article). Modifier-clicks and middle-clicks still navigate.
// Hydration of the Next.js page may lag behind first paint, so retry the click.
async function openLeadArticle(page: Page) {
  await page.goto(`${BASE}/`);
  const lead = page.locator('main a.group').first();
  await lead.waitFor();
  const modal = page.locator('dialog.np-modal');
  for (let i = 0; i < 5; i++) {
    await lead.click();
    try {
      await modal.waitFor({ state: 'visible', timeout: 2000 });
      break;
    } catch {
      // not hydrated yet, retry
    }
  }
  await expect(modal).toBeVisible();
  return modal;
}

test.describe('news.txid.uk - Newspaper Front Page', () => {
  test('masthead renders newspaper header with edition line', async ({ page }) => {
    await page.goto(`${BASE}/`);
    // Masthead title inside <main> (site nav header is separate)
    const masthead = page.locator('main header');
    await expect(masthead.locator('h1')).toHaveText(/TXID News/i);
    // Tagline + dateline with edition number, e.g. "No. 90"
    await expect(masthead).toContainText('No altcoins. No noise.');
    await expect(masthead).toContainText(/No\.\s*\d+/);
    await expect(masthead).toContainText('news.txid.uk');
  });

  test('front page shows lead story and teaser columns', async ({ page }) => {
    await page.goto(`${BASE}/`);
    // Lead headline is an np-serif h2 inside a clickable teaser
    const leadHeadline = page.locator('main h2.np-serif').first();
    await expect(leadHeadline).toBeVisible();
    expect((await leadHeadline.textContent())!.trim().length).toBeGreaterThan(10);
    // Multiple article teasers (lead + side/bottom columns)
    const teasers = page.locator('main a.group');
    expect(await teasers.count()).toBeGreaterThanOrEqual(5);
    // Lead teaser carries a category badge
    await expect(teasers.first().locator('span').first()).toContainText(
      /bitcoin|macro|politics|opinion/i
    );
  });

  test('header nav links to category pages', async ({ page }) => {
    await page.goto(`${BASE}/`);
    const nav = page.locator('header nav');
    await expect(nav.locator('a[href="/category/bitcoin"]')).toBeVisible();
    await expect(nav.locator('a[href="/category/macro"]')).toBeVisible();
    await expect(nav.locator('a[href="/category/politics"]')).toBeVisible();
  });

  test('clicking a teaser opens the article modal', async ({ page }) => {
    await page.goto(`${BASE}/`);
    const headline = (await page.locator('main h2.np-serif').first().textContent())!.trim();
    const modal = await openLeadArticle(page);
    // Modal shows the article (headline text + close button + scrollable body)
    await expect(modal).toContainText(headline.slice(0, 40));
    await expect(modal.locator('button[aria-label="Close"]')).toBeVisible();
  });

  test('modal locks document scroll (no double scrollbar) and Escape restores it', async ({
    page,
  }) => {
    const modal = await openLeadArticle(page);
    // Body scroll is locked while the modal is open — only the modal scroller scrolls
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden');
    await expect(modal.locator('.overflow-y-auto').first()).toBeVisible();
    // Wheel must not move the document behind the modal
    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
    // Escape closes the modal and releases the scroll lock
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
      .not.toBe('hidden');
  });

  test('category page /category/bitcoin renders post list', async ({ page }) => {
    const response = await page.goto(`${BASE}/category/bitcoin`);
    expect(response!.status()).toBe(200);
    await expect(page.locator('h1').first()).toHaveText(/bitcoin/i);
    const postLinks = page.locator('a[href^="/post/"]');
    expect(await postLinks.count()).toBeGreaterThanOrEqual(3);
  });

  test('macro and politics category routes work', async ({ page }) => {
    const macro = await page.goto(`${BASE}/category/macro`);
    expect(macro!.status()).toBe(200);
    await expect(page.locator('h1').first()).toHaveText(/macro/i);

    const politics = await page.goto(`${BASE}/category/politics`);
    expect(politics!.status()).toBe(200);
    await expect(page.locator('h1').first()).toHaveText(/politics/i);
  });

  test('individual post page renders with h1 title', async ({ page }) => {
    // Pick the newest post from the category list instead of hardcoding a slug
    await page.goto(`${BASE}/category/bitcoin`);
    const href = await page.locator('a[href^="/post/"]').first().getAttribute('href');
    expect(href).toBeTruthy();

    const response = await page.goto(`${BASE}${href}`);
    expect(response!.status()).toBe(200);
    await expect(page.locator('article')).toBeVisible();
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    expect((await h1.textContent())!.trim().length).toBeGreaterThan(5);
  });

  test('txt-feed.json and feed.xml are served', async ({ request }) => {
    const txt = await request.get(`${BASE}/txt-feed.json`);
    expect(txt.status()).toBe(200);
    const json = await txt.json();
    expect(json.source).toBe('news.txid.uk');
    expect(Array.isArray(json.posts)).toBe(true);
    expect(json.posts.length).toBeGreaterThan(10);

    const rss = await request.get(`${BASE}/feed.xml`);
    expect(rss.status()).toBe(200);
    expect(await rss.text()).toContain('<rss');
  });
});
