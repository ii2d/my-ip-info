import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getCustomEndpointProviders,
  getSelfHostedProviders,
  PUBLIC_PROVIDERS,
} from '../src/client/providers/index';
import type { CustomEndpoint } from '../src/client/types';

describe('Provider Resolution Tests', () => {
  it('returns valid PUBLIC_PROVIDERS with required fields', () => {
    assert.ok(PUBLIC_PROVIDERS.length >= 8);
    for (const p of PUBLIC_PROVIDERS) {
      assert.ok(p.id, 'Provider must have an id');
      assert.ok(p.name, 'Provider must have a name');
      assert.equal(p.category, 'public');
      assert.equal(typeof p.fetchIp, 'function');
    }
  });

  it('builds self-hosted edge provider with fallback and custom backend URL', () => {
    // Default same-origin fallback
    const defaultProviders = getSelfHostedProviders({});
    assert.equal(defaultProviders.length, 1);
    assert.equal(defaultProviders[0].id, 'self-cloudflare');
    assert.equal(defaultProviders[0].category, 'self-hosted');
    assert.equal(defaultProviders[0].endpointUrl, 'Self-Hosted Edge Worker (Same Origin)');

    // Custom configured edge URL
    const customProviders = getSelfHostedProviders({
      cloudflareUrl: 'https://worker.my-domain.com',
    });
    assert.equal(customProviders.length, 1);
    assert.equal(customProviders[0].endpointUrl, 'https://worker.my-domain.com');
  });

  it('filters and configures custom endpoint providers', () => {
    const endpoints: CustomEndpoint[] = [
      {
        id: '1',
        name: 'Node Gateway',
        url: 'https://gateway.example.com',
        enabled: true,
        createdAt: '2026-09-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'Disabled Gateway',
        url: 'https://disabled.example.com',
        enabled: false,
        createdAt: '2026-09-01T00:00:00Z',
      },
      {
        id: '3',
        name: '',
        url: 'https://fallback-name.example.com/custom/ip',
        enabled: true,
        createdAt: '2026-09-01T00:00:00Z',
      },
    ];

    const providers = getCustomEndpointProviders(endpoints);
    assert.equal(providers.length, 2);

    assert.equal(providers[0].id, 'custom-1');
    assert.equal(providers[0].name, 'Node Gateway');
    assert.equal(providers[0].category, 'custom');
    assert.equal(providers[0].endpointUrl, 'https://gateway.example.com');

    // Defaults to 'Custom Endpoint' if name is empty
    assert.equal(providers[1].id, 'custom-3');
    assert.equal(providers[1].name, 'Custom Endpoint');
  });

  it('supports AbortSignal in provider fetchIp', async () => {
    const originalFetch = globalThis.fetch;
    try {
      let passedSignal: AbortSignal | undefined;
      globalThis.fetch = async (_url: string | URL | Request, init?: RequestInit) => {
        passedSignal = init?.signal as AbortSignal | undefined;
        if (passedSignal?.aborted) {
          throw new DOMException('The operation was aborted.', 'AbortError');
        }
        return new Response(JSON.stringify({ ip: '1.2.3.4' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      };

      const controller = new AbortController();
      const ipify = PUBLIC_PROVIDERS.find((p) => p.id === 'ipify-v4');
      assert.ok(ipify);

      const res = await ipify.fetchIp(controller.signal);
      assert.equal(res.ip, '1.2.3.4');
      assert.ok(passedSignal, 'fetch must receive the AbortSignal');

      // Test aborting
      controller.abort();
      await assert.rejects(
        async () => {
          await ipify.fetchIp(controller.signal);
        },
        { name: 'AbortError' }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('includes IP2Location provider when VITE_ENABLE_IP2LOCATION is true', async () => {
    const origEnv = process.env.VITE_ENABLE_IP2LOCATION;
    const origFetch = globalThis.fetch;

    try {
      process.env.VITE_ENABLE_IP2LOCATION = 'true';
      const providers = getSelfHostedProviders({});
      assert.equal(providers.length, 2);

      const ip2loc = providers.find((p) => p.id === 'self-ip2location');
      assert.ok(ip2loc);
      assert.equal(ip2loc.name, 'IP2Location.io (Self-Hosted)');

      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            ip: '1.2.3.4',
            country_code: 'US',
            country_name: 'United States',
            region_name: 'California',
            city_name: 'Los Angeles',
            latitude: 34.05,
            longitude: -118.25,
            zip_code: '90001',
            time_zone: '-07:00',
            asn: '12345',
            as: 'Test ASN Org',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      };

      const result = await ip2loc.fetchIp();
      assert.equal(result.ip, '1.2.3.4');
      assert.equal(result.version, 'IPv4');
      assert.equal(result.geo?.city, 'Los Angeles');
      assert.equal(result.geo?.countryCode, 'US');
      assert.equal(result.geo?.asn, 'AS12345');
      assert.equal(result.geo?.asOrganization, 'Test ASN Org');
    } finally {
      process.env.VITE_ENABLE_IP2LOCATION = origEnv;
      globalThis.fetch = origFetch;
    }
  });

  it('rejects when IP2Location API returns configured=false', async () => {
    const origEnv = process.env.VITE_ENABLE_IP2LOCATION;
    const origFetch = globalThis.fetch;

    try {
      process.env.VITE_ENABLE_IP2LOCATION = 'true';
      const providers = getSelfHostedProviders({});
      const ip2loc = providers.find((p) => p.id === 'self-ip2location');
      assert.ok(ip2loc);

      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: 'No IP2Location API key provided in environment',
            configured: false,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      };

      await assert.rejects(async () => {
        await ip2loc.fetchIp();
      }, /No IP2Location API key provided in environment/);
    } finally {
      process.env.VITE_ENABLE_IP2LOCATION = origEnv;
      globalThis.fetch = origFetch;
    }
  });
});
