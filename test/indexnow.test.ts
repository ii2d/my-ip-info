import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { createIpApp } from '../src/server/app';
import {
  BING_INDEXNOW_ENDPOINT,
  buildIndexNowPayload,
  DEFAULT_INDEXNOW_HOST,
  DEFAULT_INDEXNOW_KEY,
  INDEXNOW_ENDPOINT,
  isValidIndexNowKey,
  parseSitemapUrls,
  submitIndexNow,
} from '../src/shared/indexnow';

describe('IndexNow Unit & Integration Tests', () => {
  it('validates key format according to IndexNow spec (8-128 chars, hex/alphanumeric)', () => {
    assert.equal(isValidIndexNowKey(DEFAULT_INDEXNOW_KEY), true);
    assert.equal(isValidIndexNowKey('a1b2c3d4'), true);
    assert.equal(isValidIndexNowKey('0123456789abcdef0123456789abcdef'), true);
    assert.equal(isValidIndexNowKey('key-with-dashes-1234'), true);

    // Invalid keys: too short, empty, illegal characters
    assert.equal(isValidIndexNowKey(''), false);
    assert.equal(isValidIndexNowKey('short'), false); // < 8 chars
    assert.equal(isValidIndexNowKey('invalid@key!chars'), false);
    assert.equal(isValidIndexNowKey('a'.repeat(129)), false); // > 128 chars
  });

  it('verifies public key verification file exists and matches DEFAULT_INDEXNOW_KEY', () => {
    const keyFilePath = resolve(`public/${DEFAULT_INDEXNOW_KEY}.txt`);
    assert.equal(existsSync(keyFilePath), true, 'Key file must exist in public directory');

    const content = readFileSync(keyFilePath, 'utf-8').trim();
    assert.equal(content, DEFAULT_INDEXNOW_KEY);
  });

  it('parses sitemap XML and extracts URL list', () => {
    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://ip.ii2d.com/</loc>
    <lastmod>2026-09-24</lastmod>
  </url>
  <url>
    <loc>https://ip.ii2d.com/llms.txt</loc>
  </url>
  <url>
    <loc>https://ip.ii2d.com/llms-full.txt</loc>
  </url>
</urlset>`;

    const urls = parseSitemapUrls(sampleXml);
    assert.deepEqual(urls, [
      'https://ip.ii2d.com/',
      'https://ip.ii2d.com/llms.txt',
      'https://ip.ii2d.com/llms-full.txt',
    ]);
  });

  it('builds valid IndexNow payload with canonical host and URLs', () => {
    const payload = buildIndexNowPayload({
      host: 'ip.ii2d.com',
      key: DEFAULT_INDEXNOW_KEY,
      urls: ['https://ip.ii2d.com/', 'https://ip.ii2d.com/llms.txt', 'https://other.com/ignore-me'],
    });

    assert.equal(payload.host, 'ip.ii2d.com');
    assert.equal(payload.key, DEFAULT_INDEXNOW_KEY);
    assert.equal(payload.keyLocation, `https://ip.ii2d.com/${DEFAULT_INDEXNOW_KEY}.txt`);
    assert.deepEqual(payload.urlList, ['https://ip.ii2d.com/', 'https://ip.ii2d.com/llms.txt']);
  });

  it('allows custom keyLocation in payload if provided', () => {
    const payload = buildIndexNowPayload({
      host: 'ip.ii2d.com',
      key: DEFAULT_INDEXNOW_KEY,
      keyLocation: 'https://ip.ii2d.com/custom/key.txt',
      urls: ['https://ip.ii2d.com/'],
    });

    assert.equal(payload.keyLocation, 'https://ip.ii2d.com/custom/key.txt');
  });

  it('throws descriptive error when key is invalid or URLs are empty', () => {
    assert.throws(
      () =>
        buildIndexNowPayload({
          host: 'ip.ii2d.com',
          key: 'bad',
          urls: ['https://ip.ii2d.com/'],
        }),
      /Invalid IndexNow key/
    );

    assert.throws(
      () =>
        buildIndexNowPayload({
          host: 'ip.ii2d.com',
          key: DEFAULT_INDEXNOW_KEY,
          urls: ['https://completely-different-domain.com/page'],
        }),
      /No valid URLs found matching host/
    );
  });

  it('handles successful 200 OK and 202 Accepted responses from IndexNow API', async () => {
    const mockFetch200 = async (url: string | URL | Request, init?: RequestInit) => {
      assert.equal(url, INDEXNOW_ENDPOINT);
      assert.equal(init?.method, 'POST');
      const body = JSON.parse(init?.body as string);
      assert.equal(body.host, 'ip.ii2d.com');
      return new Response('', { status: 200 });
    };

    const res200 = await submitIndexNow(
      {
        host: 'ip.ii2d.com',
        key: DEFAULT_INDEXNOW_KEY,
        urls: ['https://ip.ii2d.com/'],
      },
      mockFetch200 as unknown as typeof fetch
    );

    assert.equal(res200.ok, true);
    assert.equal(res200.status, 200);
    assert.match(res200.message, /succeeded/);

    const mockFetch202 = async () => new Response('', { status: 202 });
    const res202 = await submitIndexNow(
      {
        host: 'ip.ii2d.com',
        key: DEFAULT_INDEXNOW_KEY,
        urls: ['https://ip.ii2d.com/'],
      },
      mockFetch202 as unknown as typeof fetch
    );

    assert.equal(res202.ok, true);
    assert.equal(res202.status, 202);
    assert.match(res202.message, /accepted/);
  });

  it('handles error response codes (400, 403, 422, 429) gracefully', async () => {
    for (const code of [400, 403, 422, 429]) {
      const mockFetch = async () => new Response('Error details', { status: code });
      const res = await submitIndexNow(
        {
          host: 'ip.ii2d.com',
          key: DEFAULT_INDEXNOW_KEY,
          urls: ['https://ip.ii2d.com/'],
        },
        mockFetch as unknown as typeof fetch
      );

      assert.equal(res.ok, false);
      assert.equal(res.status, code);
      assert.match(res.message, new RegExp(String(code)));
    }
  });

  it('catches network and DNS failures in submitIndexNow', async () => {
    const mockFetch = async () => {
      throw new Error('DNS resolution timeout');
    };

    const res = await submitIndexNow(
      {
        host: 'ip.ii2d.com',
        key: DEFAULT_INDEXNOW_KEY,
        urls: ['https://ip.ii2d.com/'],
      },
      mockFetch as unknown as typeof fetch
    );

    assert.equal(res.ok, false);
    assert.equal(res.status, 0);
    assert.match(res.message, /DNS resolution timeout/);
  });

  it('serves GET /api/v1/indexnow with protocol metadata', async () => {
    const app = createIpApp({
      providerName: 'test',
      indexNowKey: DEFAULT_INDEXNOW_KEY,
      indexNowHost: DEFAULT_INDEXNOW_HOST,
    });

    const res = await app.request('/api/v1/indexnow');
    assert.equal(res.status, 200);
    const json = (await res.json()) as Record<string, unknown>;
    assert.equal(json.status, 'active');
    assert.equal(json.protocol, 'IndexNow');
    assert.equal(json.host, DEFAULT_INDEXNOW_HOST);
    assert.equal(json.keyLocation, `https://${DEFAULT_INDEXNOW_HOST}/${DEFAULT_INDEXNOW_KEY}.txt`);
    assert.deepEqual(json.endpoints, [INDEXNOW_ENDPOINT, BING_INDEXNOW_ENDPOINT]);
  });

  it('submits URLs via POST /api/v1/indexnow with mock fetchFn', async () => {
    let fetchCalled = false;
    const mockFetch = async (url: string | URL | Request) => {
      assert.equal(url, INDEXNOW_ENDPOINT);
      fetchCalled = true;
      return new Response('', { status: 200 });
    };

    const app = createIpApp({
      providerName: 'test',
      indexNowKey: DEFAULT_INDEXNOW_KEY,
      indexNowHost: DEFAULT_INDEXNOW_HOST,
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const res = await app.request('/api/v1/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: ['https://ip.ii2d.com/', 'https://ip.ii2d.com/llms.txt'],
      }),
    });

    assert.equal(res.status, 200);
    assert.equal(fetchCalled, true);
    const json = (await res.json()) as Record<string, unknown>;
    assert.equal(json.ok, true);
    assert.equal(json.status, 200);
  });
});
