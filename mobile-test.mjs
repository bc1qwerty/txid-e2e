import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ...{
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    isMobile: true,
    hasTouch: true,
  }
});

const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

try {
  await page.goto('https://txid.uk/', { timeout: 30000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  const searchInput = await page.$('#search-input');
  const app = await page.$('#app');
  const appContent = app ? await app.textContent() : 'NO APP';
  
  console.log('search-input:', searchInput ? 'EXISTS' : 'MISSING');
  console.log('app content length:', appContent.length);
  console.log('JS errors:', errors.length ? errors.join('\n') : 'NONE');
  
  if (errors.length) {
    for (const e of errors.slice(0, 5)) console.log('  ERROR:', e.slice(0, 200));
  }
} catch(e) {
  console.log('FATAL:', e.message);
} finally {
  await browser.close();
}
