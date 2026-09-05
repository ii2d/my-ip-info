import { IpInfoResponse } from './types';

const CLI_USER_AGENTS = ['curl', 'wget', 'httpie', 'fetch', 'axios', 'urllib', 'python-requests'];

export function isCliRequest(userAgent?: string, acceptHeader?: string): boolean {
  if (acceptHeader && acceptHeader.includes('application/json')) {
    return false;
  }
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return CLI_USER_AGENTS.some((cli) => ua.startsWith(cli) || ua.includes(cli));
}

export function formatPlaintext(response: IpInfoResponse): string {
  return `${response.ip}\n`;
}

export function formatYaml(response: IpInfoResponse): string {
  const lines: string[] = [
    `ip: "${response.ip}"`,
    `version: "${response.version}"`,
    `isBogon: ${response.isBogon}`,
    `provider: "${response.provider}"`,
    `timestamp: "${response.timestamp}"`,
  ];

  if (response.geo) {
    lines.push('geo:');
    for (const [k, v] of Object.entries(response.geo)) {
      if (v !== undefined) lines.push(`  ${k}: ${typeof v === 'string' ? `"${v}"` : v}`);
    }
  }

  if (response.headers) {
    lines.push('headers:');
    for (const [k, v] of Object.entries(response.headers)) {
      if (v !== undefined) lines.push(`  ${k}: "${v}"`);
    }
  }

  return lines.join('\n') + '\n';
}
