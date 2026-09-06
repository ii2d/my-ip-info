import { cleanIpAddress } from './ip';
import type { CloudflareCfData, GeoLocationInfo } from './types';

export interface ExtractedClientData {
  clientIp: string;
  geo?: GeoLocationInfo;
  protocol?: string;
  tlsVersion?: string;
  tlsCipher?: string;
}

/**
 * Extracts the real client IP by inspecting standard multi-cloud proxy headers.
 */
export function extractClientIp(
  headers: Headers | Record<string, string | string[] | undefined>,
  fallbackIp?: string
): string {
  const getHeader = (name: string): string | undefined => {
    if (headers instanceof Headers) {
      return headers.get(name) || undefined;
    }
    const val = headers[name.toLowerCase()] || headers[name];
    if (Array.isArray(val)) return val[0];
    return val;
  };

  // 1. Cloudflare's verified connecting IP header
  const cfConnectingIp = getHeader('cf-connecting-ip');
  if (cfConnectingIp) return cleanIpAddress(cfConnectingIp);

  // 2. Google Cloud / Firebase / Fastly header
  const fastlyClientIp = getHeader('fastly-client-ip');
  if (fastlyClientIp) return cleanIpAddress(fastlyClientIp);

  // 3. True-Client-IP (Akamai, Cloudflare Enterprise)
  const trueClientIp = getHeader('true-client-ip');
  if (trueClientIp) return cleanIpAddress(trueClientIp);

  // 4. Standard X-Real-IP (Nginx / Caddy / reverse proxies)
  const xRealIp = getHeader('x-real-ip');
  if (xRealIp) return cleanIpAddress(xRealIp);

  // 5. X-Forwarded-For (First non-trusted IP from the left)
  const xForwardedFor = getHeader('x-forwarded-for');
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map((s) => s.trim());
    if (ips[0]) return cleanIpAddress(ips[0]);
  }

  // 6. Fallback (e.g. Node socket remoteAddress or Cloud Function context)
  if (fallbackIp) {
    return cleanIpAddress(fallbackIp);
  }

  return '127.0.0.1';
}

/**
 * Normalizes Cloudflare `request.cf` data into our unified GeoLocationInfo
 */
export function extractCloudflareGeo(cf?: CloudflareCfData | null): GeoLocationInfo | undefined {
  if (!cf) return undefined;

  const lat = cf.latitude !== undefined ? Number(cf.latitude) : undefined;
  const lon = cf.longitude !== undefined ? Number(cf.longitude) : undefined;

  return {
    city: cf.city,
    region: cf.region,
    regionCode: cf.regionCode,
    country: cf.country,
    countryCode: cf.country,
    continent: cf.continent,
    latitude: !isNaN(lat!) ? lat : undefined,
    longitude: !isNaN(lon!) ? lon : undefined,
    postalCode: cf.postalCode,
    metroCode: cf.metroCode,
    timezone: cf.timezone,
    asn: cf.asn ? `AS${cf.asn}` : undefined,
    asOrganization: cf.asOrganization,
    colo: cf.colo,
  };
}
