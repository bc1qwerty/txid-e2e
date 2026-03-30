import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
page.on('pageerror', e => errors.push('PAGE: ' + e.message));
page.on('console', msg => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text().slice(0, 150)); });

await page.goto('https://txid.uk/', { timeout: 20000, waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);

const appHtml = await page.$eval('#app', el => el.innerHTML.slice(0, 200)).catch(() => 'NO #app');
const bodyBg = await page.$eval('body', el => getComputedStyle(el).backgroundColor).catch(() => 'unknown');
const visible = await page.$eval('#app', el => {
  const s = getComputedStyle(el);
  return { display: s.display, visibility: s.visibility, opacity: s.opacity, height: el.offsetHeight };
}).catch(() => 'error');

console.log('Body BG:', bodyBg);
console.log('App HTML:', appHtml);
console.log('App visibility:', JSON.stringify(visible));
console.log('Errors:', errors.length);
errors.forEach(e => console.log('  ', e));

await browser.close();
