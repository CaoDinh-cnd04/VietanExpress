import { afterEach, expect, it, vi } from 'vitest';
import handler from './proxy';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it.each([200, 401])('forwards webhook bytes and HMAC without Expect, preserving HTTP %s', async status => {
  vi.stubEnv('BACKEND_URL', 'https://backend.example/');
  const body = '{\n  "customer": {"name": "Việt An"}\n}';
  const hmac = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    const headers = new Headers(init.headers);
    // Fetch rejects this handshake header; it must not reach the upstream request.
    if (headers.has('expect')) throw new Error('Expect is unsupported');
    expect(url).toBe('https://backend.example/api/v1/ecom/webhooks/shopify');
    expect(headers.get('X-Shopify-Hmac-Sha256')).toBe(hmac);
    expect(headers.get('X-Shopify-Topic')).toBe('customers/redact');
    expect(headers.get('X-Shopify-Shop-Domain')).toBe('probe.myshopify.com');
    expect(init.redirect).toBe('manual');
    const forwarded = new Request(url, init);
    expect(new Uint8Array(await forwarded.arrayBuffer())).toEqual(new TextEncoder().encode(body));
    return new Response(null, { status });
  });
  vi.stubGlobal('fetch', fetchMock);

  const request = new Request('https://portal.example/api/proxy?__path=v1/ecom/webhooks/shopify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Expect': '100-continue',
      'X-Shopify-Hmac-Sha256': hmac,
      'X-Shopify-Topic': 'customers/redact',
      'X-Shopify-Shop-Domain': 'probe.myshopify.com'
    },
    body
  });

  expect((await handler(request)).status).toBe(status);
  expect(fetchMock).toHaveBeenCalledOnce();
});
