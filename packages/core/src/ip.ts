import { IpVersion } from './types';

const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_REGEX = /^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$|^(?:[A-F0-9]{1,4}:)*:[A-F0-9]{1,4}$/i;

export function getIpVersion(rawIp: string): IpVersion {
  const ip = cleanIpAddress(rawIp);
  if (IPV4_REGEX.test(ip)) {
    return 'IPv4';
  }
  if (ip.includes(':')) {
    return 'IPv6';
  }
  return 'Unknown';
}

export function cleanIpAddress(rawIp: string): string {
  let ip = rawIp.trim();
  // Remove port if present (e.g. 192.168.1.1:12345 or [::1]:12345)
  if (ip.startsWith('[') && ip.includes(']')) {
    ip = ip.substring(1, ip.indexOf(']'));
  } else if (ip.includes('.') && ip.includes(':')) {
    // IPv4 with port
    const parts = ip.split(':');
    if (parts.length === 2 && IPV4_REGEX.test(parts[0])) {
      ip = parts[0];
    }
  }

  // Strip IPv4-mapped IPv6 addresses (e.g. ::ffff:192.0.2.128 -> 192.0.2.128)
  if (ip.toLowerCase().startsWith('::ffff:') && IPV4_REGEX.test(ip.substring(7))) {
    return ip.substring(7);
  }

  return ip;
}

/**
 * Checks if an IP is a Bogon / Private / Reserved address (RFC 1918, RFC 4193, loopback, etc.)
 */
export function isBogonIp(rawIp: string): boolean {
  const ip = cleanIpAddress(rawIp);
  const version = getIpVersion(ip);

  if (version === 'IPv4') {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;
    // 10.0.0.0/8 (Private)
    if (a === 10) return true;
    // 100.64.0.0/10 (Carrier-grade NAT)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 169.254.0.0/16 (Link-local)
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12 (Private)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.0.0.0/24 (IETF Protocol Assignments)
    if (a === 192 && b === 0) return true;
    // 192.0.2.0/24 (TEST-NET-1)
    if (a === 192 && b === 0 && parts[2] === 2) return true;
    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return true;
    // 198.18.0.0/15 (Network benchmark tests)
    if (a === 198 && (b === 18 || b === 19)) return true;
    // 198.51.100.0/24 (TEST-NET-2)
    if (a === 198 && b === 51 && parts[2] === 100) return true;
    // 203.0.113.0/24 (TEST-NET-3)
    if (a === 203 && b === 0 && parts[2] === 113) return true;
    // 224.0.0.0/4 (Multicast)
    if (a >= 224 && a <= 239) return true;
    // 240.0.0.0/4 (Reserved)
    if (a >= 240) return true;

    return false;
  }

  if (version === 'IPv6') {
    const lower = ip.toLowerCase();
    // ::1 (Loopback) or :: (Unspecified)
    if (lower === '::1' || lower === '::') return true;
    // Unique local address fc00::/7 (fc00... or fd00...)
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    // Link-local fe80::/10
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
    // Discard prefix 100::/64
    if (lower.startsWith('100:')) return true;
    // Documentation 2001:db8::/32
    if (lower.startsWith('2001:db8:') || lower.startsWith('2001:0db8:')) return true;

    return false;
  }

  return true;
}
