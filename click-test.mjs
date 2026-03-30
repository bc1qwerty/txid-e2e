import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://learn.txid.uk/ko/community/', { timeout: 15000, waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);

// Find first post card link
const firstPost = await page.$('.post-card, a[href*="#free/"], a[href*="#hot/"]');
if (firstPost) {
  const href = await firstPost.getAttribute('href');
  console.log('First post href:', href);
  await firstPost.click();
  await page.waitForTimeout(2000);
  console.log('URL after click:', page.url());
  const appHtml = await page.$eval('#community-app', el => el.innerHTML.slice(0, 200)).catch(() => 'empty');
  console.log('App after click:', appHtml);
} else {
  console.log('No post card found');
  const links = await page.$$eval('a', els => els.slice(0, 10).map(a => a.href));
  console.log('Links:', links);
}
await browser.close();
