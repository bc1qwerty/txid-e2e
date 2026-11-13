import { test, expect } from '@playwright/test';
import { expectLocaleLanding } from '../locale-helpers';

// locale-helpers 의 «튕김 감지» 가 실제로 잡는지 가짜 페이지로 증명한다(네트워크 0건).
// networkidle 을 걷어낸 뒤로는 이것이 그 헬퍼가 거짓 통과하지 않는다는 유일한 근거다.
const BASE = 'https://selftest.invalid';
const page_ = (lang: string, script = '') =>
  `<!doctype html><html lang="${lang}"><head><title>t</title>${script}</head><body>${lang}</body></html>`;

test.describe('locale-helpers selftest', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${BASE}/**`, (route) => {
      const path = new URL(route.request().url()).pathname;
      // /ko/ 는 서빙된 lang 은 ko 인데, 저장된 취향이 없으면 /en/ 으로 보내는 스크립트를 싣는다
      // (tools.txid.uk 에 실제로 있던 결함의 모양). defer 라 load 직전에 돈다.
      const bounce = `<script defer src="data:text/javascript,if(!localStorage.getItem('lang'))location.replace('/en/')"></script>`;
      const body = path === '/ko/' ? page_('ko', bounce) : path === '/ja/' ? page_('ja') : page_('en');
      return route.fulfill({ status: 200, contentType: 'text/html', body });
    });
  });

  test('튕기는 페이지는 실패로 잡힌다', async ({ page }) => {
    await expect(expectLocaleLanding(page, BASE, '/ko/')).rejects.toThrow(/튕겼다|lang/);
    expect(new URL(page.url()).pathname).toBe('/en/');
  });

  test('튕기지 않는 페이지는 통과한다', async ({ page }) => {
    await expectLocaleLanding(page, BASE, '/ja/');
  });
});
