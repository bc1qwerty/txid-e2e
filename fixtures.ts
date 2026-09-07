import { test as base } from '@playwright/test';

// 이 스위트는 프로덕션을 직접 치므로, 모든 문서에서 umami 계측을 끈다.
// (umami 트래커는 localStorage 'umami.disabled'가 있으면 전송하지 않는다.)
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      try {
        localStorage.setItem('umami.disabled', '1');
      } catch {
        // opaque origin 등 localStorage 접근 불가 문서는 그냥 둔다
      }
    });
    await use(context);
  },
});

export { expect } from '@playwright/test';
export type { Page } from '@playwright/test';
