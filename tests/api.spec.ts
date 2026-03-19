import { test, expect } from '@playwright/test';

const BASE = 'https://api.txid.uk';

test.describe('api.txid.uk - API Server', () => {
  test('health endpoint returns ok', async ({ request }) => {
    const response = await request.get(`${BASE}/health`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('CORS headers present', async ({ request }) => {
    const response = await request.get(`${BASE}/health`);
    const headers = response.headers();

    // Check for CORS header (may vary by endpoint)
    const hasCors = !!headers['access-control-allow-origin'] || !!headers['access-control-allow-methods'];
    expect(hasCors).toBeTruthy();
  });

  test('auth challenge endpoint responds', async ({ request }) => {
    const response = await request.get(`${BASE}/auth/challenge`);
    // Should return a response (200 or 400 with body, not 404/500)
    expect(response.status()).toBeLessThan(500);

    const body = await response.text();
    expect(body.length).toBeGreaterThan(0);
  });
});
