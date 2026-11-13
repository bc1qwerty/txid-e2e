import { expect, type Page } from '@playwright/test';

/**
 * 로컬라이즈된 URL 은 **처음 온 방문자에게** 그 로케일을 줘야 한다.
 *
 * 🔴 왜 있나: tools.txid.uk 가 언어를 `localStorage.getItem('lang') || 'en'` 으로 읽고
 *    페이지 로케일과 다르면 이동시켰다. 저장된 취향이 없으면 기본이 'en' 이라, /ko/ 로
 *    들어온 사람은 한국어를 한 글자도 보기 전에 /en/ 으로 튕겼다. ko·ja 페이지 전부가
 *    신규 방문자에게 닿지 않았는데 **전부 200 이었고 서빙된 HTML 의 lang 도 ko 였다** —
 *    응답만 읽는 검사는 통과시킨다. 돌려 봐야 잡힌다.
 * ⚠ 그래서 저장된 취향이 **없는** 상태여야 한다. Playwright 는 테스트마다 새 컨텍스트를
 *   주므로 그것만으로 「첫 방문」 조건이 선다.
 * 🔑 원래 txid-web 의 `check-locale-landing.mjs` 였다. 거기서는 **배포되지 않는 사본**을
 *    빌드해서 검사했다 — 2026-10-02 에 그 사본들을 지우면서 배포된 사이트를 보는
 *    이쪽으로 옮겼다. 옮기자마자 apps·sim·id 의 햄버거 패널 라벨 둘이 ko·ja 에서
 *    영어로 남아 있던 것을 잡았다(archive 5e968fc 로 수리).
 */
const SETTLE_MS = 2000;

export async function expectLocaleLanding(page: Page, base: string, route: string) {
  const want = route.split('/')[1];
  // ⚠ networkidle 은 쓰지 않는다(폴링·WS 가 붙은 사이트에서 타임아웃이 나고, «스크립트가 돈 뒤» 도
  //   보장하지 않는다). 대신 load(= defer 스크립트까지 실행) 뒤 **안정 구간** 동안 주소가 그대로인지 본다.
  //   튕기는 스크립트는 load 전에 location 을 바꾸므로 이동은 그 구간 안에 드러난다.
  //   이 방식이 실제로 튕김을 잡는지는 tests/helpers-selftest.spec.ts 가 가짜 페이지로 증명한다.
  await page.goto(`${base}${route}`);
  const bounced = await page
    .waitForURL((u) => u.pathname !== route, { timeout: SETTLE_MS })
    .then(() => true, () => false);

  // 스크립트가 돈 **뒤**의 자리와 언어를 본다.
  expect(bounced ? new URL(page.url()).pathname : route, '다른 로케일로 튕겼다').toBe(route);
  await expect(page.locator('html')).toHaveAttribute('lang', want);

  // 번역 요소가 실제로 그 언어를 들고 있는지. 「틀은 ko 인데 내용은 en」을 잡는다.
  // ⚠ **다른 로케일의 값과 똑같을 때만** 잡는다. 그냥 다른 것은 스크립트가 런타임에
  //   바꿔 넣은 값일 수 있어서, 그것까지 세면 오탐이 쏟아진다(넓게 썼다가 13건 중
  //   9건이 걸려서 되돌렸다).
  const wrong = await page.evaluate((lang) => {
    const strip = (s: string) => s.replace(/\s+/g, ' ').trim();
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll('[data-ko][data-en]'))) {
      const d = (el as HTMLElement).dataset;
      const expected = strip(d[lang] || '');
      if (!expected) continue;
      const actual = strip(el.textContent || '');
      if (actual === expected) continue;
      const other = ['ko', 'en', 'ja'].find((l) => l !== lang && strip(d[l] || '') === actual);
      if (other) out.push(`"${actual.slice(0, 30)}" (${other}) ≠ "${expected.slice(0, 30)}"`);
    }
    return out;
  }, want);
  expect(wrong.slice(0, 3), '번역 요소가 그 로케일이 아니다').toEqual([]);
}
