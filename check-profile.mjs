import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGE: ' + e.message.slice(0, 200)));
page.on('console', msg => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text().slice(0, 200)); });

await page.goto('https://learn.txid.uk/ko/blog/', { timeout: 15000, waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);

const profile = await page.$eval('.sidebar-profile-aside', el => el.innerHTML.slice(0, 300)).catch(() => 'NOT FOUND');
console.log('Profile HTML:', profile);
console.log('Errors:', errors.length);
errors.forEach(e => console.log('  ', e));
await browser.close();
