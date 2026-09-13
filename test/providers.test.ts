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
});
