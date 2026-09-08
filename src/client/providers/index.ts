import { getIpVersion, isBogonIp } from '../../shared/ip';
import type { CustomEndpoint, IpProvider } from '../types';

export const PUBLIC_PROVIDERS: IpProvider[] = [
  {
    id: 'cloudflare-trace',
    name: 'Cloudflare Trace',
    category: 'public',
    endpointUrl: 'https://1.1.1.1/cdn-cgi/trace',
    description: 'Cloudflare direct edge trace endpoint',
    fetchIp: async () => {
      const res = await fetch(`https://1.1.1.1/cdn-cgi/trace?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const ipMatch = text.match(/^ip=(.+)$/m);
      const locMatch = text.match(/^loc=(.+)$/m);
      if (!ipMatch) throw new Error('No IP in trace response');
      const ip = ipMatch[1].trim();
      return {
        ip,
        version: getIpVersion(ip),
        geo: locMatch ? { countryCode: locMatch[1].trim() } : undefined,
      };
    },
  },
  {
    id: 'ipify-v4',
    name: 'ipify (IPv4)',
    category: 'public',
    endpointUrl: 'https://api.ipify.org?format=json',
    description: 'High-availability public IPv4 resolution',
    fetchIp: async () => {
      const res = await fetch(`https://api.ipify.org?format=json&t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return {
        ip: data.ip,
        version: 'IPv4',
      };
    },
  },
  {
    id: 'ipify-v64',
    name: 'ipify (Universal v6/v4)',
    category: 'public',
    endpointUrl: 'https://api64.ipify.org?format=json',
    description: 'Dual-stack public IP resolution (prefers IPv6)',
    fetchIp: async () => {
      const res = await fetch(`https://api64.ipify.org?format=json&t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return {
        ip: data.ip,
        version: getIpVersion(data.ip),
      };
    },
  },
  {
    id: 'ipapi-co',
    name: 'ipapi.co',
    category: 'public',
    endpointUrl: 'https://ipapi.co/json/',
    description: 'Public geolocation and ASN lookup',
    fetchIp: async () => {
      const res = await fetch(`https://ipapi.co/json/?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return {
        ip: data.ip,
        version: getIpVersion(data.ip),
        geo: {
          city: data.city,
          region: data.region,
          country: data.country_name,
          countryCode: data.country_code,
          asn: data.asn,
          asOrganization: data.org,
          latitude: data.latitude,
          longitude: data.longitude,
        },
      };
    },
  },
  {
    id: 'icanhazip',
    name: 'icanhazip',
    category: 'public',
    endpointUrl: 'https://icanhazip.com',
    description: 'Cloudflare-backed plaintext IP reflection',
    fetchIp: async () => {
      const res = await fetch(`https://icanhazip.com?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = (await res.text()).trim();
      return {
        ip: raw,
        version: getIpVersion(raw),
      };
    },
  },
];

/**
 * Builds self-hosted providers using configured or default same-origin URL
 */
export function getSelfHostedProviders(config: { cloudflareUrl?: string }): IpProvider[] {
  const baseUrl = config.cloudflareUrl?.trim() || '';
  const endpointDisplay = baseUrl || 'Self-Hosted Edge Worker (Same Origin)';

  return [
    {
      id: 'self-cloudflare',
      name: 'Cloudflare Worker (Edge)',
      category: 'self-hosted',
      endpointUrl: endpointDisplay,
      description: 'Edge Worker with native CF Geo, ASN & TLS headers',
      fetchIp: async () => {
        const urlObj = baseUrl
          ? new URL('/api/v1/info', baseUrl)
          : new URL('/api/v1/info', window.location.origin);
        urlObj.searchParams.set('t', Date.now().toString());

        const res = await fetch(urlObj.toString(), {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return {
          ip: data.ip,
          version: data.version,
          geo: data.geo,
          protocol: data.headers?.protocol,
          rawHeaders: data.headers,
        };
      },
    },
  ];
}

/**
 * Builds user-defined custom endpoints from localStorage
 */
export function getCustomEndpointProviders(customEndpoints: CustomEndpoint[]): IpProvider[] {
  return customEndpoints
    .filter((ep) => ep.enabled && ep.url)
    .map((ep) => ({
      id: `custom-${ep.id}`,
      name: ep.name || 'Custom Endpoint',
      category: 'custom',
      endpointUrl: ep.url,
      description: ep.url,
      fetchIp: async () => {
        // Try /api/v1/info first, fallback to raw endpoint
        let targetUrl = ep.url;
        if (!targetUrl.includes('/info') && !targetUrl.includes('/ip')) {
          try {
            const urlObj = new URL(targetUrl);
            const basePath = urlObj.pathname.replace(/\/+$/, '');
            urlObj.pathname = basePath.endsWith('/api/v1')
              ? `${basePath}/info`
              : `${basePath}/api/v1/info`.replace(/\/+/g, '/');
            targetUrl = urlObj.toString();
          } catch {
            // keep targetUrl as is
          }
        }

        // Add timestamp cache-buster parameter to ensure zero caching
        try {
          const parsed = new URL(targetUrl, window.location.origin);
          parsed.searchParams.set('t', Date.now().toString());
          targetUrl = parsed.toString();
        } catch {
          // keep targetUrl as is
        }

        const res = await fetch(targetUrl, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          const ip = data.ip || data.query || data.origin;
          return {
            ip,
            version: getIpVersion(ip),
            geo: data.geo,
            protocol: data.headers?.protocol,
            rawHeaders: data.headers,
          };
        } else {
          // Plain text response
          const text = (await res.text()).trim();
          return {
            ip: text,
            version: getIpVersion(text),
          };
        }
      },
    }));
}
