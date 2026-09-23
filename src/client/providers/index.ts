import { getIpVersion } from '../../shared/ip';
import type { CustomEndpoint, IpProvider } from '../types';

export const PUBLIC_PROVIDERS: IpProvider[] = [
  {
    id: 'cloudflare-trace',
    name: 'Cloudflare Trace',
    category: 'public',
    regionTag: 'Global Anycast',
    endpointUrl: 'https://1.1.1.1/cdn-cgi/trace',
    description: 'Cloudflare direct edge trace endpoint',
    fetchIp: async (signal?: AbortSignal) => {
      const res = await fetch(`https://1.1.1.1/cdn-cgi/trace?t=${Date.now()}`, {
        signal,
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
    regionTag: 'US Backbone',
    endpointUrl: 'https://api.ipify.org?format=json',
    description: 'High-availability public IPv4 resolution',
    fetchIp: async (signal?: AbortSignal) => {
      const res = await fetch(`https://api.ipify.org?format=json&t=${Date.now()}`, {
        signal,
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
    regionTag: 'Global Dual-Stack',
    endpointUrl: 'https://api64.ipify.org?format=json',
    description: 'Dual-stack public IP resolution (prefers IPv6)',
    fetchIp: async (signal?: AbortSignal) => {
      const res = await fetch(`https://api64.ipify.org?format=json&t=${Date.now()}`, {
        signal,
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
    id: 'ipwhois',
    name: 'ipwho.is',
    category: 'public',
    regionTag: 'Global Multi-Region',
    endpointUrl: 'https://ipwho.is/',
    description: 'Free CORS-compliant geolocation and ASN lookup',
    fetchIp: async (signal?: AbortSignal) => {
      const res = await fetch(`https://ipwho.is/?t=${Date.now()}`, {
        signal,
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success === false) {
        throw new Error(data.message || 'Lookup failed');
      }
      return {
        ip: data.ip,
        version: getIpVersion(data.ip),
        geo: {
          city: data.city,
          region: data.region,
          country: data.country,
          countryCode: data.country_code,
          asn: data.connection?.asn,
          asOrganization: data.connection?.org || data.connection?.isp,
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
    regionTag: 'Global Anycast',
    endpointUrl: 'https://icanhazip.com',
    description: 'Cloudflare-backed plaintext IP reflection',
    fetchIp: async (signal?: AbortSignal) => {
      const res = await fetch(`https://icanhazip.com?t=${Date.now()}`, {
        signal,
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = (await res.text()).trim();
      return {
        ip: raw,
        version: getIpVersion(raw),
      };
    },
  },
  {
    id: 'ipsb',
    name: 'IP.SB (Anycast)',
    category: 'public',
    regionTag: 'Asia-Pacific / Anycast',
    endpointUrl: 'https://api.ip.sb/geoip',
    description: 'Asia-Pacific & global Anycast IP and Geo resolution',
    fetchIp: async (signal?: AbortSignal) => {
      const res = await fetch(`https://api.ip.sb/geoip?t=${Date.now()}`, {
        signal,
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return {
        ip: data.ip,
        version: getIpVersion(data.ip),
        geo: {
          city: data.city,
          region: data.region,
          country: data.country,
          countryCode: data.country_code,
          asn: data.asn,
          asOrganization: data.isp || data.organization,
          latitude: data.latitude,
          longitude: data.longitude,
        },
      };
    },
  },
  {
    id: 'ipguide',
    name: 'ip.guide',
    category: 'public',
    regionTag: 'Global Anycast',
    endpointUrl: 'https://ip.guide/',
    description: 'Global Anycast network and AS intelligence',
    fetchIp: async (signal?: AbortSignal) => {
      const res = await fetch(`https://ip.guide/?t=${Date.now()}`, {
        signal,
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return {
        ip: data.ip,
        version: getIpVersion(data.ip),
        geo: {
          city: data.location?.city,
          country: data.location?.country,
          asn: data.network?.autonomous_system?.asn,
          asOrganization:
            data.network?.autonomous_system?.organization || data.network?.autonomous_system?.name,
          latitude: data.location?.latitude,
          longitude: data.location?.longitude,
        },
      };
    },
  },
  {
    id: 'seeip',
    name: 'SeeIP',
    category: 'public',
    regionTag: 'Europe / Multi-Region',
    endpointUrl: 'https://api.seeip.org/geoip',
    description: 'European & multi-region IP and geolocation resolution',
    fetchIp: async (signal?: AbortSignal) => {
      const res = await fetch(`https://api.seeip.org/geoip?t=${Date.now()}`, {
        signal,
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return {
        ip: data.ip,
        version: getIpVersion(data.ip),
        geo: {
          city: data.city,
          region: data.region,
          country: data.country,
          countryCode: data.country_code,
          asn: data.asn,
          asOrganization: data.organization,
          latitude: data.latitude,
          longitude: data.longitude,
        },
      };
    },
  },
  {
    id: 'ipip-net',
    name: 'IPIP.net (China)',
    category: 'public',
    regionTag: 'Mainland China',
    endpointUrl: 'https://myip.ipip.net/json',
    description: 'Premier Mainland China domestic routing and IP intelligence',
    fetchIp: async (signal?: AbortSignal) => {
      // NOTE: myip.ipip.net server strips Access-Control-Allow-Origin when query parameters are present.
      // cache: 'no-store' is sufficient to ensure fresh browser requests.
      const res = await fetch('https://myip.ipip.net/json', {
        signal,
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.ret !== 'ok' || !data.data?.ip) {
        throw new Error('Invalid response from IPIP.net');
      }
      const loc = data.data.location || [];
      const country = loc[0] || undefined;
      const region = loc[1] || undefined;
      const city = loc[2] || undefined;
      const isp = loc[4] || undefined;

      return {
        ip: data.data.ip,
        version: getIpVersion(data.data.ip),
        geo: {
          country,
          region,
          city,
          asOrganization: isp,
        },
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

  const providers: IpProvider[] = [
    {
      id: 'self-cloudflare',
      name: 'Cloudflare Worker (Edge)',
      category: 'self-hosted',
      regionTag: 'Self-Hosted Edge',
      endpointUrl: endpointDisplay,
      description: 'Edge Worker with native CF Geo, ASN & TLS headers',
      fetchIp: async (signal?: AbortSignal) => {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
        const urlObj = baseUrl ? new URL('/api/v1/info', baseUrl) : new URL('/api/v1/info', origin);
        urlObj.searchParams.set('t', Date.now().toString());

        const res = await fetch(urlObj.toString(), {
          signal,
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

  // Only include IP2Location if enabled via environment variable
  const metaEnv =
    typeof import.meta !== 'undefined'
      ? (import.meta as unknown as { env?: Record<string, string> }).env
      : undefined;
  const isIp2LocationEnabled =
    metaEnv?.VITE_ENABLE_IP2LOCATION === 'true' ||
    (typeof process !== 'undefined' && process.env?.VITE_ENABLE_IP2LOCATION === 'true');
  if (isIp2LocationEnabled) {
    const ip2Display = baseUrl ? `${baseUrl}/api/v1/ip2location` : 'Self-Hosted IP2Location.io';
    providers.push({
      id: 'self-ip2location',
      name: 'IP2Location.io (Self-Hosted)',
      category: 'self-hosted',
      regionTag: 'IP2Location Global',
      endpointUrl: ip2Display,
      description: 'Self-hosted IP intelligence powered by IP2Location.io API',
      fetchIp: async (signal?: AbortSignal) => {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
        const urlObj = baseUrl
          ? new URL('/api/v1/ip2location', baseUrl)
          : new URL('/api/v1/ip2location', origin);
        urlObj.searchParams.set('t', Date.now().toString());

        const res = await fetch(urlObj.toString(), {
          signal,
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data.configured === false || data.error) {
          throw new Error(data.error || 'IP2Location API is not configured');
        }

        if (!data.ip) {
          throw new Error('No IP returned from IP2Location');
        }

        const ip = String(data.ip).trim();
        const city = data.city_name !== '-' ? data.city_name || data.city?.name : undefined;
        const region = data.region_name !== '-' ? data.region_name || data.region?.name : undefined;
        const country =
          data.country_name !== '-' ? data.country_name || data.country?.name : undefined;
        const countryCode = data.country_code !== '-' ? data.country_code : undefined;
        const asn =
          data.asn !== '-' && data.asn
            ? String(data.asn).startsWith('AS')
              ? String(data.asn)
              : `AS${data.asn}`
            : undefined;
        const asOrg =
          data.as !== '-' && data.as ? data.as : data.isp !== '-' ? data.isp : undefined;
        const lat = typeof data.latitude === 'number' ? data.latitude : undefined;
        const lon = typeof data.longitude === 'number' ? data.longitude : undefined;
        const postalCode = data.zip_code !== '-' ? data.zip_code : undefined;
        const timezone = data.time_zone !== '-' ? data.time_zone : undefined;

        return {
          ip,
          version: getIpVersion(ip),
          geo: {
            city,
            region,
            country,
            countryCode,
            latitude: lat,
            longitude: lon,
            postalCode,
            timezone,
            asn,
            asOrganization: asOrg,
          },
        };
      },
    });
  }

  return providers;
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
      fetchIp: async (signal?: AbortSignal) => {
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
          signal,
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
