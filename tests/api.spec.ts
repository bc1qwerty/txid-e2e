import { test, expect } from '../fixtures';

const BASE = 'https://api.txid.uk';

test.describe('api.txid.uk - API Server', () => {
  test('health endpoint returns ok', async ({ request }) => {
    const response = await request.get(`${BASE}/health`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('CORS allows trusted origin (txid.uk)', async ({ request }) => {
    // CORS headers are only emitted for requests carrying an Origin header
    const response = await request.get(`${BASE}/health`, {
      headers: { Origin: 'https://txid.uk' },
    });
    const headers = response.headers();

    // Allowlisted origin is echoed back exactly - never a wildcard
    expect(headers['access-control-allow-origin']).toBe('https://txid.uk');
    expect(headers['access-control-allow-credentials']).toBe('true');
    expect(headers['vary']).toContain('Origin');
  });

  test('CORS rejects untrusted origin (no wildcard)', async ({ request }) => {
    const response = await request.get(`${BASE}/health`, {
      headers: { Origin: 'https://evil.example.com' },
    });
    const headers = response.headers();

    // Untrusted origins must not receive any allow-origin grant
    expect(headers['access-control-allow-origin']).toBeUndefined();
  });

  test('auth challenge endpoint responds', async ({ request }) => {
    const response = await request.get(`${BASE}/auth/challenge`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.k1).toMatch(/^[0-9a-f]{64}$/);
    expect(String(body.lnurl)).toMatch(/^lnurl1/i);
  });
});
