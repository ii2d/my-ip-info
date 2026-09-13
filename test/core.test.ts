import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createIpApp } from '../src/server/app';
import { extractClientIp, extractCloudflareGeo } from '../src/server/extractors';
import { formatPlaintext, formatYaml, isCliRequest } from '../src/server/formatters';
import { cleanIpAddress, getIpVersion, isBogonIp } from '../src/shared/ip';

describe('IP Utility Tests', () => {
  it('correctly detects IPv4 addresses', () => {
    assert.equal(getIpVersion('8.8.8.8'), 'IPv4');
    assert.equal(getIpVersion('192.168.1.1'), 'IPv4');
    assert.equal(getIpVersion('1.1.1.1:443'), 'IPv4');
  });

  it('correctly detects IPv6 addresses', () => {
    assert.equal(getIpVersion('2001:4860:4860::8888'), 'IPv6');
    assert.equal(getIpVersion('::1'), 'IPv6');
    assert.equal(getIpVersion('::'), 'IPv6');
    assert.equal(getIpVersion('2001:db8::'), 'IPv6');
    assert.equal(getIpVersion('fe80::1ff:fe23:4567:890a'), 'IPv6');
  });

  it('rejects invalid non-IP strings and malformed addresses', () => {
    assert.equal(getIpVersion('invalid:string'), 'Unknown');
    assert.equal(getIpVersion('foo.bar.baz'), 'Unknown');
    assert.equal(getIpVersion('256.256.256.256'), 'Unknown');
  });

  it('cleans IP address with ports or IPv4-mapped IPv6 and strips control characters', () => {
    assert.equal(cleanIpAddress('192.168.1.1:8080'), '192.168.1.1');
    assert.equal(cleanIpAddress('::ffff:192.0.2.1'), '192.0.2.1');
    assert.equal(cleanIpAddress('[2001:db8::1]:80'), '2001:db8::1');
    assert.equal(cleanIpAddress('  1.1.1.1\r\n\t '), '1.1.1.1');
  });

  it('identifies bogon and private subnets', () => {
    // IPv4 Bogon & Private
    assert.equal(isBogonIp('127.0.0.1'), true); // Loopback
    assert.equal(isBogonIp('0.0.0.0'), true); // Current network
    assert.equal(isBogonIp('10.0.4.5'), true); // Private RFC1918
    assert.equal(isBogonIp('172.16.0.1'), true); // Private RFC1918
    assert.equal(isBogonIp('172.31.255.254'), true); // Private RFC1918
    assert.equal(isBogonIp('192.168.1.1'), true); // Private RFC1918
    assert.equal(isBogonIp('169.254.1.1'), true); // Link-local
    assert.equal(isBogonIp('100.64.0.1'), true); // CGNAT
    assert.equal(isBogonIp('100.127.255.254'), true); // CGNAT
    assert.equal(isBogonIp('198.18.0.1'), true); // Benchmark
    assert.equal(isBogonIp('198.19.255.254'), true); // Benchmark
    assert.equal(isBogonIp('192.0.2.1'), true); // TEST-NET-1
    assert.equal(isBogonIp('198.51.100.1'), true); // TEST-NET-2
    assert.equal(isBogonIp('203.0.113.1'), true); // TEST-NET-3
    assert.equal(isBogonIp('224.0.0.1'), true); // Multicast
    assert.equal(isBogonIp('240.0.0.1'), true); // Reserved

    // IPv6 Bogon & Private
    assert.equal(isBogonIp('::1'), true); // Loopback
    assert.equal(isBogonIp('::'), true); // Unspecified
    assert.equal(isBogonIp('fc00::1'), true); // Unique Local (ULA)
    assert.equal(isBogonIp('fd00::1'), true); // Unique Local (ULA)
    assert.equal(isBogonIp('fe80::1'), true); // Link-local
    assert.equal(isBogonIp('100::1'), true); // Discard prefix
    assert.equal(isBogonIp('2001:db8::1'), true); // Documentation

    // Public IPv4 & IPv6 should not be bogon
    assert.equal(isBogonIp('8.8.8.8'), false);
    assert.equal(isBogonIp('1.1.1.1'), false);
    assert.equal(isBogonIp('142.250.190.46'), false);
    assert.equal(isBogonIp('2606:4700:4700::1111'), false);
    assert.equal(isBogonIp('2001:4860:4860::8888'), false);
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

  it('extracts True-Client-IP header', () => {
    const headers = new Headers({
      'true-client-ip': '198.51.100.88',
      'x-forwarded-for': '10.0.0.3',
    });
    assert.equal(extractClientIp(headers), '198.51.100.88');
  });

  it('extracts X-Real-IP header', () => {
    const headers = new Headers({
      'x-real-ip': '198.51.100.77',
      'x-forwarded-for': '10.0.0.4',
    });
    assert.equal(extractClientIp(headers), '198.51.100.77');
  });

  it('falls back to X-Forwarded-For if cloud headers are absent', () => {
    const headers = new Headers({
      'x-forwarded-for': '198.51.100.5, 10.0.0.1',
    });
    assert.equal(extractClientIp(headers), '198.51.100.5');
  });

  it('cleans ports and whitespace from X-Forwarded-For', () => {
    const headers = new Headers({
      'x-forwarded-for': ' 198.51.100.6:8080 , 10.0.0.1:443 ',
    });
    assert.equal(extractClientIp(headers), '198.51.100.6');
  });

  it('handles plain object headers and array header values', () => {
    const objHeaders = {
      'x-forwarded-for': ['198.51.100.99', '10.0.0.1'],
    };
    assert.equal(extractClientIp(objHeaders), '198.51.100.99');
  });

  it('uses fallback IP when no headers match', () => {
    assert.equal(extractClientIp({}, '198.51.100.123'), '198.51.100.123');
    assert.equal(extractClientIp({}), '127.0.0.1');
  });

  it('extracts Cloudflare geo data correctly with number and string coords', () => {
    const geo = extractCloudflareGeo({
      city: 'Austin',
      region: 'Texas',
      country: 'US',
      latitude: '30.2672',
      longitude: -97.7431,
      asn: 13335,
      asOrganization: 'Cloudflare',
      colo: 'DFW',
    });

    assert.equal(geo?.city, 'Austin');
    assert.equal(geo?.country, 'US');
    assert.equal(geo?.asn, 'AS13335');
    assert.equal(geo?.colo, 'DFW');
    assert.equal(geo?.latitude, 30.2672);
    assert.equal(geo?.longitude, -97.7431);
  });

  it('returns undefined when cf object is empty or null', () => {
    assert.equal(extractCloudflareGeo(undefined), undefined);
    assert.equal(extractCloudflareGeo(null), undefined);
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

  it('safely escapes strings containing quotes and newlines in YAML to prevent injection', () => {
    const res = formatYaml({
      ip: '1.1.1.1',
      version: 'IPv4',
      isBogon: false,
      provider: 'test',
      timestamp: '2026-09-05T00:00:00Z',
      headers: {
        userAgent: 'curl/8.1 "evil: injection\nmalicious: true',
      },
    });
    assert.match(res, /userAgent:\s*"curl\/8\.1 \\"evil: injection\\nmalicious: true"/);
  });
});

describe('App Routing & Versioning Tests', () => {
  const app = createIpApp({ providerName: 'test-provider' });

  it('attaches defensive security headers to API responses', async () => {
    const res = await app.request('/api/v1/health');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  });

  it('serves health endpoint on /api/v1/health', async () => {
    const res = await app.request('/api/v1/health');
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.status, 'ok');
    assert.equal(json.provider, 'test-provider');
    assert.equal(typeof json.version, 'string');
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
    assert.equal(res.headers.get('content-type')?.includes('text/yaml'), true);
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

    // Query param ?format=yaml -> YAML
    const yamlQueryRes = await app.request('/api/v1/info?format=yaml', { headers });
    assert.equal(yamlQueryRes.status, 200);
    assert.equal(yamlQueryRes.headers.get('content-type')?.includes('text/yaml'), true);
    assert.match(await yamlQueryRes.text(), /ip:\s*"203\.0\.113\.50"/);

    // Query param ?format=text -> Plaintext IP
    const textQueryRes = await app.request('/api/v1/info?format=text', { headers });
    assert.equal(textQueryRes.status, 200);
    assert.equal(textQueryRes.headers.get('content-type')?.includes('text/plain'), true);
    assert.equal(await textQueryRes.text(), '203.0.113.50\n');

    // Query param ?format=ip -> Plaintext IP
    const ipQueryRes = await app.request('/api/v1/info?format=ip', { headers });
    assert.equal(ipQueryRes.status, 200);
    assert.equal(await ipQueryRes.text(), '203.0.113.50\n');
  });

  it('returns fallback error when geo data is not available on /api/v1/geo', async () => {
    const res = await app.request('/api/v1/geo');
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.error, 'No geo data available for this provider');
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
