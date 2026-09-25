import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import worker from '../src/server/index';
import { DEFAULT_INDEXNOW_KEY } from '../src/shared/indexnow';

describe('Cloudflare Worker Pipeline Tests', () => {
  const dummyCtx = {
    waitUntil: () => {},
    passThroughOnException: () => {},
  } as unknown as Parameters<typeof worker.fetch>[2];

  it('serves plaintext IP with trailing newline to CLI clients requesting root /', async () => {
    const req = new Request('https://ip.example.com/', {
      headers: {
        'user-agent': 'curl/8.1.2',
        'cf-connecting-ip': '203.0.113.44',
      },
    });

    const res = await worker.fetch(req, {}, dummyCtx);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert.equal(res.headers.get('x-client-ip'), '203.0.113.44');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(await res.text(), '203.0.113.44\n');
  });

  it('serves plaintext IP on shorthand /ip endpoint', async () => {
    const req = new Request('https://ip.example.com/ip', {
      headers: {
        'cf-connecting-ip': '198.51.100.77',
      },
    });

    const res = await worker.fetch(req, {}, dummyCtx);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-client-ip'), '198.51.100.77');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(await res.text(), '198.51.100.77\n');
  });

  it('delegates browser requests at root / to env.ASSETS when available', async () => {
    const req = new Request('https://ip.example.com/', {
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        accept: 'text/html,application/xhtml+xml',
      },
    });

    let assetsFetchCalled = false;
    const env = {
      ASSETS: {
        fetch: async (_request: Request) => {
          assetsFetchCalled = true;
          return new Response('<!DOCTYPE html><html><body>SPA HTML</body></html>', {
            status: 200,
            headers: { 'content-type': 'text/html' },
          });
        },
      },
    };

    const res = await worker.fetch(req, env, dummyCtx);
    assert.equal(res.status, 200);
    assert.equal(assetsFetchCalled, true);
    assert.match(await res.text(), /SPA HTML/);
  });

  it('routes /api/v1/health to Hono app in worker environment', async () => {
    const req = new Request('https://ip.example.com/api/v1/health');
    const res = await worker.fetch(req, {}, dummyCtx);
    assert.equal(res.status, 200);
    const json = (await res.json()) as Record<string, unknown>;
    assert.equal(json.status, 'ok');
    assert.equal(json.provider, 'cloudflare-worker');
  });

  it('routes /api/v1/info to Hono app in worker environment', async () => {
    const req = new Request('https://ip.example.com/api/v1/info', {
      headers: {
        'cf-connecting-ip': '203.0.113.88',
        accept: 'application/json',
      },
    });
    const res = await worker.fetch(req, {}, dummyCtx);
    assert.equal(res.status, 200);
    const json = (await res.json()) as Record<string, unknown>;
    assert.equal(json.ip, '203.0.113.88');
    assert.equal(json.provider, 'cloudflare-worker');
  });

  it('delegates /llms.txt, /llms-full.txt, /robots.txt, /sitemap.xml, and /og-image.png to env.ASSETS', async () => {
    const requestedPaths: string[] = [];
    const env = {
      ASSETS: {
        fetch: async (request: Request) => {
          const u = new URL(request.url);
          requestedPaths.push(u.pathname);
          return new Response(`Content for ${u.pathname}`, { status: 200 });
        },
      },
    };

    for (const path of [
      '/robots.txt',
      '/sitemap.xml',
      '/llms.txt',
      '/llms-full.txt',
      '/og-image.png',
      `/${DEFAULT_INDEXNOW_KEY}.txt`,
    ]) {
      const req = new Request(`https://ip.example.com${path}`);
      const res = await worker.fetch(req, env, dummyCtx);
      assert.equal(res.status, 200);
      assert.equal(await res.text(), `Content for ${path}`);
    }

    assert.deepEqual(requestedPaths, [
      '/robots.txt',
      '/sitemap.xml',
      '/llms.txt',
      '/llms-full.txt',
      '/og-image.png',
      `/${DEFAULT_INDEXNOW_KEY}.txt`,
    ]);
  });
  it('serves IndexNow key directly when env.ASSETS is undefined', async () => {
    const req = new Request(`https://ip.example.com/${DEFAULT_INDEXNOW_KEY}.txt`);
    const res = await worker.fetch(req, {}, dummyCtx);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert.equal(await res.text(), `${DEFAULT_INDEXNOW_KEY}\n`);
  });
});
