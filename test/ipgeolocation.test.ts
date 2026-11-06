import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createIpApp } from '../src/server/app';

describe('IPGeolocation Server API Tests', () => {
  it('returns configured=false when no API key is present in environment or options', async () => {
    const originalKey = process.env.IPGEOLOCATION_API_KEY;
    delete process.env.IPGEOLOCATION_API_KEY;

    try {
      const app = createIpApp({ providerName: 'test-app' });
      const res = await app.request('/api/v1/ipgeolocation');
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.configured, false);
      assert.match(json.error, /No IPGeolocation API key provided/);
    } finally {
      if (originalKey !== undefined) {
        process.env.IPGEOLOCATION_API_KEY = originalKey;
      }
    }
  });

  it('queries upstream IPGeolocation API when API key is provided in options', async () => {
    let capturedUrl = '';

    const mockFetch: typeof fetch = async (input) => {
      capturedUrl = input.toString();
      return new Response(
        JSON.stringify({
          ip: '8.8.8.8',
          location: {
            continent_code: 'NA',
            continent_name: 'North America',
            country_code2: 'US',
            country_name: 'United States',
            state_prov: 'California',
            city: 'Mountain View',
            latitude: '37.42240',
            longitude: '-122.08421',
            zipcode: '94043',
          },
          asn: {
            as_number: 'AS15169',
            organization: 'Google LLC',
          },
          time_zone: {
            name: 'America/Los_Angeles',
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    };

    const app = createIpApp({
      ipGeolocationApiKey: 'TEST_IPGEO_KEY_123',
      fetchFn: mockFetch,
    });

    const res = await app.request('/api/v1/ipgeolocation?ip=8.8.8.8');
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.ip, '8.8.8.8');
    assert.equal(json.location.country_code2, 'US');
    assert.equal(json.location.city, 'Mountain View');

    assert.ok(capturedUrl.includes('https://api.ipgeolocation.io/v3/ipgeo'));
    assert.ok(capturedUrl.includes('apiKey=TEST_IPGEO_KEY_123'));
    assert.ok(capturedUrl.includes('ip=8.8.8.8'));
  });

  it('uses client IP header if no ?ip query parameter is provided', async () => {
    let capturedUrl = '';

    const mockFetch: typeof fetch = async (input) => {
      capturedUrl = input.toString();
      return new Response(
        JSON.stringify({
          ip: '203.0.113.100',
          location: {
            country_code2: 'JP',
            country_name: 'Japan',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const app = createIpApp({
      ipGeolocationApiKey: 'TEST_IPGEO_KEY_123',
      fetchFn: mockFetch,
    });

    const res = await app.request('/api/v1/ipgeolocation', {
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
          location: {
            country_code2: 'AU',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const app = createIpApp({
      fetchFn: mockFetch,
    });

    const res = await app.fetch(new Request('http://localhost/api/v1/ipgeolocation?ip=1.1.1.1'), {
      IPGEOLOCATION_API_KEY: 'WORKER_IPGEO_KEY_XYZ',
    });
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.ip, '1.1.1.1');
    assert.ok(capturedUrl.includes('apiKey=WORKER_IPGEO_KEY_XYZ'));
  });

  it('handles upstream fetch failure gracefully with 502', async () => {
    const failingFetch: typeof fetch = async () => {
      throw new Error('Network timeout connecting to upstream');
    };

    const app = createIpApp({
      ipGeolocationApiKey: 'TEST_IPGEO_KEY_123',
      fetchFn: failingFetch,
    });

    const res = await app.request('/api/v1/ipgeolocation?ip=8.8.8.8');
    assert.equal(res.status, 502);

    const json = await res.json();
    assert.match(json.error, /Network timeout connecting to upstream/);
  });

  it('handles 429 Too Many Requests when daily credit limit (1,000 requests) is reached', async () => {
    const rateLimitedFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify({
          message:
            "API usage limit has been reached for the free subscriptions, or paid subscriptions with the status 'past due', 'deleted' or 'trial expired'.",
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'x-credits-charged': '0',
            'retry-after': '3600',
          },
        }
      );
    };

    const app = createIpApp({
      ipGeolocationApiKey: 'TEST_IPGEO_KEY_123',
      fetchFn: rateLimitedFetch,
    });

    const res = await app.request('/api/v1/ipgeolocation?ip=8.8.8.8');
    assert.equal(res.status, 429);
    assert.equal(res.headers.get('x-credits-charged'), '0');
    assert.equal(res.headers.get('retry-after'), '3600');

    const json = await res.json();
    assert.match(json.error, /API usage limit has been reached/);
    assert.equal(json.status, 429);
  });
});
