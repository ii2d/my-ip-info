import type { DnsServerInfo } from '../client/types';

export interface RawDnsLeakItem {
  ip?: string;
  country?: string;
  country_name?: string;
  asn?: string;
  org?: string;
  type?: string;
}

export interface ParsedDnsLeak {
  detectedIp?: string;
  detectedCountry?: string;
  detectedAsn?: string;
  detectedOrg?: string;
  dnsServers: DnsServerInfo[];
  conclusion?: string;
  isLeaking: boolean;
}

/**
 * Parses raw JSON response from bash.ws/dnsleak into structured DNS leak results.
 */
export function parseDnsLeakResponse(data: unknown, clientCountry?: string): ParsedDnsLeak {
  if (!Array.isArray(data)) {
    return {
      dnsServers: [],
      isLeaking: false,
      conclusion: 'Invalid response format from DNS test provider',
    };
  }

  let detectedIp: string | undefined;
  let detectedCountry: string | undefined;
  let detectedAsn: string | undefined;
  let detectedOrg: string | undefined;
  let conclusion: string | undefined;
  const dnsServers: DnsServerInfo[] = [];

  for (const item of data as RawDnsLeakItem[]) {
    if (!item || typeof item !== 'object') continue;

    if (item.type === 'ip') {
      detectedIp = item.ip;
      detectedCountry = item.country_name || item.country;
      detectedAsn = item.asn;
      detectedOrg = item.org;
    } else if (item.type === 'dns' && item.ip) {
      dnsServers.push({
        ip: item.ip,
        country: item.country,
        countryName: item.country_name,
        asn: item.asn,
        org: item.org,
      });
    } else if (item.type === 'conclusion' && item.ip) {
      conclusion = item.ip;
    }
  }

  // Deduplicate DNS servers by IP
  const seenIps = new Set<string>();
  const uniqueDnsServers: DnsServerInfo[] = [];
  for (const server of dnsServers) {
    if (!seenIps.has(server.ip)) {
      seenIps.add(server.ip);
      uniqueDnsServers.push(server);
    }
  }

  // Determine if there is a probable leak
  let isLeaking = false;

  if (conclusion && /leak/i.test(conclusion) && !/no leak/i.test(conclusion)) {
    isLeaking = true;
  }

  // If client country is known and DNS resolvers are in a different country
  if (!isLeaking && clientCountry && uniqueDnsServers.length > 0) {
    const normClient = clientCountry.toLowerCase().trim();
    const hasDifferentCountry = uniqueDnsServers.some((s) => {
      const sCountry = (s.countryName || s.country || '').toLowerCase().trim();
      return sCountry && sCountry !== normClient;
    });
    // If all DNS servers are from a different country than the current egress IP
    if (hasDifferentCountry) {
      isLeaking = true;
    }
  }

  return {
    detectedIp,
    detectedCountry,
    detectedAsn,
    detectedOrg,
    dnsServers: uniqueDnsServers,
    conclusion: conclusion || (isLeaking ? 'Potential DNS Leak Detected' : 'No DNS Leak Detected'),
    isLeaking,
  };
}
