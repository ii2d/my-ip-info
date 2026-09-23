import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createIpApp } from '../src/server/app';

describe('IP2Location Server API Tests', () => {
  it('returns configured=false when no API key is present in environment or options', async () => {
    const originalKey = process.env.IP2_LOCATION_API_KEY;
    delete process.env.IP2_LOCATION_API_KEY;

    try {
      const app = createIpApp({ providerName: 'test-app' });
      const res = await app.request('/api/v1/ip2location');
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.configured, false);
      assert.match(json.error, /No IP2Location API key provided/);
    } finally {
      if (originalKey !== undefined) {
        process.env.IP2_LOCATION_API_KEY = originalKey;
      }
    }
  });

  it('queries upstream IP2Location API when API key is provided in options', async () => {
    let capturedUrl = '';

    const mockFetch: typeof fetch = async (input) => {
      capturedUrl = input.toString();
      return new Response(
        JSON.stringify({
          ip: '8.8.8.8',
          country_code: 'US',
          country_name: 'United States of America',
          city_name: 'Mountain View',
          latitude: 37.38605,
          longitude: -122.08385,
          asn: '15169',
          as: 'Google LLC',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    };

    const app = createIpApp({
      ip2LocationApiKey: 'TEST_KEY_123',
      fetchFn: mockFetch,
    });

    const res = await app.request('/api/v1/ip2location?ip=8.8.8.8');
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.ip, '8.8.8.8');
    assert.equal(json.country_code, 'US');
    assert.equal(json.city_name, 'Mountain View');

    assert.ok(capturedUrl.includes('https://api.ip2location.io/'));
    assert.ok(capturedUrl.includes('key=TEST_KEY_123'));
    assert.ok(capturedUrl.includes('ip=8.8.8.8'));
    assert.ok(capturedUrl.includes('format=json'));
  });

  it('uses client IP header if no ?ip query parameter is provided', async () => {
    let capturedUrl = '';

    const mockFetch: typeof fetch = async (input) => {
      capturedUrl = input.toString();
      return new Response(
        JSON.stringify({
          ip: '203.0.113.100',
          country_code: 'JP',
          country_name: 'Japan',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const app = createIpApp({
      ip2LocationApiKey: 'TEST_KEY_123',
      fetchFn: mockFetch,
    });

    const res = await app.request('/api/v1/ip2location', {
      headers: { 'cf-connecting-ip': '203.0.113.100' },
    });
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.ip, '203.0.113.100');
    assert.ok(capturedUrl.includes('ip=203.0.113.100'));
  });

  it('reads API key from Cloudflare Worker env context', async () => {
    let capturedUrl = '';

    const mockFetch: typeof fetch = async (input) => {
      capturedUrl = input.toString();
      return new Response(
        JSON.stringify({
          ip: '1.1.1.1',
          country_code: 'AU',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const app = createIpApp({
      fetchFn: mockFetch,
    });

    const res = await app.fetch(new Request('http://localhost/api/v1/ip2location?ip=1.1.1.1'), {
      IP2_LOCATION_API_KEY: 'WORKER_KEY_ABC',
    });
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.ip, '1.1.1.1');
    assert.ok(capturedUrl.includes('key=WORKER_KEY_ABC'));
  });

  it('handles upstream fetch failure gracefully with 502', async () => {
    const failingFetch: typeof fetch = async () => {
      throw new Error('Network timeout connecting to upstream');
    };

    const app = createIpApp({
      ip2LocationApiKey: 'TEST_KEY_123',
      fetchFn: failingFetch,
    });

    const res = await app.request('/api/v1/ip2location?ip=8.8.8.8');
    assert.equal(res.status, 502);

    const json = await res.json();
    assert.match(json.error, /Network timeout connecting to upstream/);
  });
});
