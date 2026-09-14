import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { parseDnsLeakResponse } from '../src/shared/dns';

describe('DNS Leak Parser & Diagnostics Tests', () => {
  test('correctly parses standard bash.ws response array', () => {
    const raw = [
      {
        ip: '68.149.150.212',
        country: 'ca',
        country_name: 'Canada',
        asn: 'AS6327 Shaw Communications',
        org: 'Shaw Communications',
        type: 'ip',
      },
      {
        ip: '104.22.32.17',
        country: 'ca',
        country_name: 'Canada',
        asn: 'AS13335 Cloudflare Inc',
        org: 'Cloudflare Inc',
        type: 'dns',
      },
      {
        ip: '162.158.145.174',
        country: 'ca',
        country_name: 'Canada',
        asn: 'AS13335 Cloudflare Inc',
        org: 'Cloudflare Inc',
        type: 'dns',
      },
      {
        ip: 'No leak detected.',
        country: '',
        country_name: '',
        asn: '',
        org: '',
        type: 'conclusion',
      },
    ];

    const result = parseDnsLeakResponse(raw, 'Canada');

    assert.equal(result.detectedIp, '68.149.150.212');
    assert.equal(result.detectedCountry, 'Canada');
    assert.equal(result.detectedOrg, 'Shaw Communications');
    assert.equal(result.dnsServers.length, 2);
    assert.equal(result.dnsServers[0].ip, '104.22.32.17');
    assert.equal(result.dnsServers[0].org, 'Cloudflare Inc');
    assert.equal(result.isLeaking, false);
    assert.equal(result.conclusion, 'No leak detected.');
  });

  test('deduplicates duplicate DNS server IPs in response', () => {
    const raw = [
      { ip: '1.1.1.1', country: 'us', country_name: 'United States', type: 'dns' },
      { ip: '1.1.1.1', country: 'us', country_name: 'United States', type: 'dns' },
      { ip: '8.8.8.8', country: 'us', country_name: 'United States', type: 'dns' },
    ];

    const result = parseDnsLeakResponse(raw, 'United States');
    assert.equal(result.dnsServers.length, 2);
    assert.equal(result.dnsServers[0].ip, '1.1.1.1');
    assert.equal(result.dnsServers[1].ip, '8.8.8.8');
  });

  test('flags leak when conclusion explicitly reports leak', () => {
    const raw = [
      {
        ip: '203.0.113.50',
        country: 'jp',
        country_name: 'Japan',
        type: 'ip',
      },
      {
        ip: '198.51.100.8',
        country: 'ca',
        country_name: 'Canada',
        org: 'Local ISP',
        type: 'dns',
      },
      {
        ip: 'DNS may be leaking.',
        type: 'conclusion',
      },
    ];

    const result = parseDnsLeakResponse(raw, 'Japan');
    assert.equal(result.isLeaking, true);
    assert.equal(result.conclusion, 'DNS may be leaking.');
  });

  test('flags leak when DNS resolvers country diverges from proxy exit country', () => {
    const raw = [
      {
        ip: '198.51.100.22',
        country: 'us',
        country_name: 'United States',
        org: 'Comcast Cable',
        type: 'dns',
      },
    ];

    // Client egress IP is in Japan, but DNS resolves in United States
    const result = parseDnsLeakResponse(raw, 'Japan');
    assert.equal(result.isLeaking, true);
  });

  test('handles malformed, null or non-array responses gracefully', () => {
    const resultNull = parseDnsLeakResponse(null);
    assert.equal(resultNull.dnsServers.length, 0);
    assert.equal(resultNull.isLeaking, false);

    const resultEmpty = parseDnsLeakResponse([]);
    assert.equal(resultEmpty.dnsServers.length, 0);
    assert.equal(resultEmpty.isLeaking, false);

    const resultCorrupt = parseDnsLeakResponse(['string', null, 123, {}]);
    assert.equal(resultCorrupt.dnsServers.length, 0);
    assert.equal(resultCorrupt.isLeaking, false);
  });
});
