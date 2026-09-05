import { getIpVersion, isBogonIp } from '@my-ip/core';
import { CustomEndpoint, IpProvider } from '../types';

export const PUBLIC_PROVIDERS: IpProvider[] = [
  {
    id: 'ipify-dual',
    name: 'ipify (Dual-Stack)',
    category: 'public',
    description: 'Fast public IP API',
    fetchIp: async () => {
      const res = await fetch('https://api64.ipify.org?format=json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return {
        ip: data.ip,
        version: getIpVersion(data.ip),
      };
    },
  },
  {
    id: 'ipify-ipv4',
    name: 'ipify (IPv4 Only)',
    category: 'public',
    description: 'Forces IPv4 route',
    fetchIp: async () => {
      const res = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return {
        ip: data.ip,
        version: 'IPv4',
      };
    },
  },
  {
    id: 'ipwhois',
    name: 'ipwho.is',
    category: 'public',
    description: 'Public Geolocation & ASN intelligence (HTTPS)',
    fetchIp: async () => {
      const res = await fetch('https://ipwho.is/', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Lookup failed');

      return {
        ip: data.ip,
        version: getIpVersion(data.ip),
        geo: {
          city: data.city,
          region: data.region,
          regionCode: data.region_code,
          country: data.country,
          countryCode: data.country_code,
          latitude: data.latitude,
          longitude: data.longitude,
          postalCode: data.postal,
          timezone: data.timezone?.id,
          asn: data.connection?.asn ? `AS${data.connection.asn}` : undefined,
          asOrganization: data.connection?.org || data.connection?.isp,
        },
      };
    },
  },
  {
    id: 'icanhazip',
    name: 'icanhazip (Cloudflare Anycast)',
    category: 'public',
    description: 'Cloudflare raw echo',
    fetchIp: async () => {
      const res = await fetch('https://icanhazip.com', { cache: 'no-store' });
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
 * Builds self-hosted providers using configured or environment URLs
 */
export function getSelfHostedProviders(config: {
  cloudflareUrl?: string;
  firebaseUrl?: string;
  lambdaUrl?: string;
}): IpProvider[] {
  const providers: IpProvider[] = [];

  if (config.cloudflareUrl) {
    providers.push({
      id: 'self-cloudflare',
      name: 'Cloudflare Worker (Self-Hosted)',
      category: 'self-hosted',
      endpointUrl: config.cloudflareUrl,
      description: 'Edge Worker with native CF Geo headers',
      fetchIp: async () => {
        const url = new URL('/json', config.cloudflareUrl).toString();
        const res = await fetch(url, { cache: 'no-store' });
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
    });
  }

  if (config.firebaseUrl) {
    providers.push({
      id: 'self-firebase',
      name: 'Firebase Function (Self-Hosted)',
      category: 'self-hosted',
      endpointUrl: config.firebaseUrl,
      description: 'Google Cloud Functions v2 runtime',
      fetchIp: async () => {
        const url = new URL('/json', config.firebaseUrl).toString();
        const res = await fetch(url, { cache: 'no-store' });
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
    });
  }

  if (config.lambdaUrl) {
    providers.push({
      id: 'self-lambda',
      name: 'AWS Lambda (Self-Hosted)',
      category: 'self-hosted',
      endpointUrl: config.lambdaUrl,
      description: 'AWS Lambda Function URL / API Gateway',
      fetchIp: async () => {
        const url = new URL('/json', config.lambdaUrl).toString();
        const res = await fetch(url, { cache: 'no-store' });
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
      fetchIp: async () => {
        // Try /json first, fallback to raw endpoint
        let targetUrl = ep.url;
        if (!targetUrl.endsWith('/json') && !targetUrl.endsWith('/ip')) {
          try {
            const urlObj = new URL(targetUrl);
            urlObj.pathname = urlObj.pathname.replace(/\/+$/, '') + '/json';
            targetUrl = urlObj.toString();
          } catch {
            // keep targetUrl as is
          }
        }

        const res = await fetch(targetUrl, { cache: 'no-store' });
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
