import assert from 'node:assert';
import { describe, it } from 'node:test';
import type { ProviderResult } from '../src/client/types';
import { groupResultsByIp } from '../src/client/utils/grouping';

describe('IP Consensus Grouping Tests', () => {
  it('correctly aggregates multiple providers returning identical IP into a single group', () => {
    const mockResults: ProviderResult[] = [
      {
        providerId: 'cloudflare',
        providerName: 'Cloudflare Edge',
        category: 'self-hosted',
        status: 'success',
        ip: '198.51.100.1',
        version: 'IPv4',
        latencyMs: 30,
        geo: { city: 'San Jose', country: 'US', asOrganization: 'Cloudflare, Inc.' },
      },
      {
        providerId: 'ipify',
        providerName: 'ipify',
        category: 'public',
        status: 'success',
        ip: '198.51.100.1',
        version: 'IPv4',
        latencyMs: 50,
      },
      {
        providerId: 'icanhazip',
        providerName: 'icanhazip',
        category: 'public',
        status: 'success',
        ip: '198.51.100.1',
        version: 'IPv4',
        latencyMs: 40,
      },
    ];

    const { groups, failedProviders, loadingProviders, totalSuccessful } =
      groupResultsByIp(mockResults);

    assert.strictEqual(groups.length, 1);
    assert.strictEqual(failedProviders.length, 0);
    assert.strictEqual(loadingProviders.length, 0);
    assert.strictEqual(totalSuccessful, 3);

    const group = groups[0];
    assert.strictEqual(group.ip, '198.51.100.1');
    assert.strictEqual(group.version, 'IPv4');
    assert.strictEqual(group.providers.length, 3);
    assert.strictEqual(group.avgLatency, 40); // (30 + 50 + 40) / 3 = 40
    assert.strictEqual(group.geoSummary, 'San Jose, US');
    assert.strictEqual(group.asOrganization, 'Cloudflare, Inc.');
  });

  it('separates IPv4 and IPv6 groups and sorts IPv4 first', () => {
    const mockResults: ProviderResult[] = [
      {
        providerId: 'ipify6',
        providerName: 'ipify IPv6',
        category: 'public',
        status: 'success',
        ip: '2606:4700:4700::1111',
        version: 'IPv6',
        latencyMs: 25,
      },
      {
        providerId: 'cf-v4',
        providerName: 'Cloudflare',
        category: 'self-hosted',
        status: 'success',
        ip: '1.1.1.1',
        version: 'IPv4',
        latencyMs: 20,
      },
    ];

    const { groups } = groupResultsByIp(mockResults);
    assert.strictEqual(groups.length, 2);
    assert.strictEqual(groups[0].ip, '1.1.1.1');
    assert.strictEqual(groups[0].version, 'IPv4');
    assert.strictEqual(groups[1].ip, '2606:4700:4700::1111');
    assert.strictEqual(groups[1].version, 'IPv6');
  });

  it('correctly isolates failed providers and loading providers', () => {
    const mockResults: ProviderResult[] = [
      {
        providerId: 'cf-v4',
        providerName: 'Cloudflare',
        category: 'self-hosted',
        status: 'success',
        ip: '1.1.1.1',
        version: 'IPv4',
        latencyMs: 15,
      },
      {
        providerId: 'failed-provider',
        providerName: 'Broken API',
        category: 'public',
        status: 'error',
        errorMessage: 'Request timed out (7s)',
      },
      {
        providerId: 'loading-provider',
        providerName: 'Pending API',
        category: 'public',
        status: 'loading',
      },
    ];

    const { groups, failedProviders, loadingProviders, totalSuccessful } =
      groupResultsByIp(mockResults);

    assert.strictEqual(groups.length, 1);
    assert.strictEqual(totalSuccessful, 1);
    assert.strictEqual(failedProviders.length, 1);
    assert.strictEqual(failedProviders[0].providerId, 'failed-provider');
    assert.strictEqual(failedProviders[0].errorMessage, 'Request timed out (7s)');

    assert.strictEqual(loadingProviders.length, 1);
    assert.strictEqual(loadingProviders[0].providerId, 'loading-provider');
  });

  it('handles empty results array gracefully', () => {
    const { groups, failedProviders, loadingProviders, totalSuccessful } = groupResultsByIp([]);
    assert.strictEqual(groups.length, 0);
    assert.strictEqual(failedProviders.length, 0);
    assert.strictEqual(loadingProviders.length, 0);
    assert.strictEqual(totalSuccessful, 0);
  });
});
