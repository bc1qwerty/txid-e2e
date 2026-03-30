import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGE: ' + e.message.slice(0, 200)));
page.on('console', msg => { if (msg.type() === 'error') errors.push('CON: ' + msg.text().slice(0, 200)); });

await page.goto('https://learn.txid.uk/ko/community/', { timeout: 15000, waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);

const app = await page.$eval('#community-app', el => el.innerHTML.slice(0, 300)).catch(() => 'NO APP');
console.log('App:', app);
console.log('Errors:', errors.length);
errors.slice(0, 5).forEach(e => console.log('  ', e));
await browser.close();
