import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getIpVersion,
  isBogonIp,
  cleanIpAddress,
  extractClientIp,
  extractCloudflareGeo,
  isCliRequest,
  formatPlaintext,
  createIpApp,
} from '../src/index';

describe('IP Utility Tests', () => {
  it('correctly detects IPv4 addresses', () => {
    assert.equal(getIpVersion('8.8.8.8'), 'IPv4');
    assert.equal(getIpVersion('192.168.1.1'), 'IPv4');
    assert.equal(getIpVersion('1.1.1.1:443'), 'IPv4');
  });

  it('correctly detects IPv6 addresses', () => {
    assert.equal(getIpVersion('2001:4860:4860::8888'), 'IPv6');
    assert.equal(getIpVersion('::1'), 'IPv6');
    assert.equal(getIpVersion('fe80::1ff:fe23:4567:890a'), 'IPv6');
  });

  it('cleans IP address with ports or IPv4-mapped IPv6', () => {
    assert.equal(cleanIpAddress('192.168.1.1:8080'), '192.168.1.1');
    assert.equal(cleanIpAddress('::ffff:192.0.2.1'), '192.0.2.1');
    assert.equal(cleanIpAddress('[2001:db8::1]:80'), '2001:db8::1');
  });

  it('identifies bogon and private subnets', () => {
    assert.equal(isBogonIp('127.0.0.1'), true);
    assert.equal(isBogonIp('10.0.4.5'), true);
    assert.equal(isBogonIp('192.168.1.1'), true);
    assert.equal(isBogonIp('172.16.0.1'), true);
    assert.equal(isBogonIp('169.254.1.1'), true);
    assert.equal(isBogonIp('::1'), true);

    // Public IPs should not be bogon
    assert.equal(isBogonIp('8.8.8.8'), false);
    assert.equal(isBogonIp('1.1.1.1'), false);
    assert.equal(isBogonIp('142.250.190.46'), false);
  });
});

describe('Header & Extractor Tests', () => {
  it('extracts Cloudflare cf-connecting-ip first', () => {
    const headers = new Headers({
      'cf-connecting-ip': '203.0.113.195',
      'x-forwarded-for': '198.51.100.1, 10.0.0.1',
    });
    assert.equal(extractClientIp(headers), '203.0.113.195');
  });

  it('extracts Fastly / Firebase client IP', () => {
    const headers = new Headers({
      'fastly-client-ip': '198.51.100.42',
      'x-forwarded-for': '10.0.0.2',
    });
    assert.equal(extractClientIp(headers), '198.51.100.42');
  });

  it('falls back to X-Forwarded-For if cloud headers are absent', () => {
    const headers = new Headers({
      'x-forwarded-for': '198.51.100.5, 10.0.0.1',
    });
    assert.equal(extractClientIp(headers), '198.51.100.5');
  });

  it('extracts Cloudflare geo data correctly', () => {
    const geo = extractCloudflareGeo({
      city: 'Austin',
      region: 'Texas',
      country: 'US',
      latitude: 30.2672,
      longitude: -97.7431,
      asn: 13335,
      asOrganization: 'Cloudflare',
      colo: 'DFW',
    });

    assert.equal(geo?.city, 'Austin');
    assert.equal(geo?.country, 'US');
    assert.equal(geo?.asn, 'AS13335');
    assert.equal(geo?.colo, 'DFW');
  });
});

describe('Formatter Tests', () => {
  it('detects CLI user agents', () => {
    assert.equal(isCliRequest('curl/7.68.0'), true);
    assert.equal(isCliRequest('Wget/1.20.3 (linux-gnu)'), true);
    assert.equal(isCliRequest('HTTPie/2.4.0'), true);
    assert.equal(isCliRequest('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'), false);
  });

  it('formats plaintext response with trailing newline for terminal output', () => {
    const res = formatPlaintext({
      ip: '1.1.1.1',
      version: 'IPv4',
      isBogon: false,
      provider: 'test',
      timestamp: '2026-09-05T00:00:00Z',
    });
    assert.equal(res, '1.1.1.1\n');
  });
});

describe('App Routing & Versioning Tests', () => {
  const app = createIpApp({ providerName: 'test-provider' });

  it('serves health endpoint on /api/v1/health', async () => {
    const res = await app.request('/api/v1/health');
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.status, 'ok');
    assert.equal(json.provider, 'test-provider');
  });

  it('serves plain IP on /api/v1/ip', async () => {
    const headers = { 'x-forwarded-for': '203.0.113.50' };
    const res = await app.request('/api/v1/ip', { headers });
    assert.equal(res.status, 200);
    assert.equal(await res.text(), '203.0.113.50\n');
  });

  it('serves geo endpoint on /api/v1/geo', async () => {
    const headers = { 'x-forwarded-for': '203.0.113.50' };
    const res = await app.request('/api/v1/geo', { headers });
    assert.equal(res.status, 200);
  });

  it('serves YAML on /api/v1/yaml', async () => {
    const headers = { 'x-forwarded-for': '203.0.113.50' };
    const res = await app.request('/api/v1/yaml', { headers });
    assert.equal(res.status, 200);
    assert.match(await res.text(), /ip:\s*"203\.0\.113\.50"/);
  });

  it('serves smart content-negotiated /api/v1/info', async () => {
    const headers = { 'x-forwarded-for': '203.0.113.50' };

    // CLI user agent -> plaintext formatted
    const cliRes = await app.request('/api/v1/info', {
      headers: { ...headers, 'user-agent': 'curl/8.1.2' },
    });
    assert.equal(cliRes.status, 200);
    assert.equal(await cliRes.text(), '203.0.113.50\n');

    // Browser / JSON accept -> JSON
    const jsonRes = await app.request('/api/v1/info', {
      headers: { ...headers, accept: 'application/json' },
    });
    assert.equal(jsonRes.status, 200);
    const jsonData = await jsonRes.json();
    assert.equal(jsonData.ip, '203.0.113.50');
  });

  it('does not respond on root / or top-level unversioned routes', async () => {
    const rootRes = await app.request('/');
    assert.equal(rootRes.status, 404);

    const infoRes = await app.request('/info');
    assert.equal(infoRes.status, 404);

    const ipRes = await app.request('/ip');
    assert.equal(ipRes.status, 404);

    const healthRes = await app.request('/health');
    assert.equal(healthRes.status, 404);
  });
});

