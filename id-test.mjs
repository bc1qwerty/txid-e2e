import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const logs = [];
page.on('console', msg => logs.push(msg.type() + ': ' + msg.text()));
page.on('pageerror', e => logs.push('ERROR: ' + e.message));

await page.goto('https://id.txid.uk/ko/#/admin/lightning', { timeout: 15000, waitUntil: 'domcontentloaded' });
await page.waitForTimeout(8000);

const appContent = await page.$eval('#app', el => el.innerHTML).catch(() => 'NO #app');
const url = page.url();

console.log('URL:', url);
console.log('App HTML length:', appContent.length);
console.log('App content preview:', appContent.slice(0, 300));
console.log('');
console.log('Console logs:');
for (const l of logs.slice(0, 15)) console.log('  ', l);

await browser.close();
