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
});
