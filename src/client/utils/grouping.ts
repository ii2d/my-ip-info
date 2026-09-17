import type { IpVersion } from '../../shared/types';
import type { ProviderResult } from '../types';

export interface IpConsensusGroup {
  ip: string;
  version?: IpVersion;
  providers: ProviderResult[];
  avgLatency: number;
  geoSummary?: string;
  asOrganization?: string;
}

export interface GroupedResults {
  groups: IpConsensusGroup[];
  failedProviders: ProviderResult[];
  loadingProviders: ProviderResult[];
  totalSuccessful: number;
}

export function groupResultsByIp(results: ProviderResult[]): GroupedResults {
  const ipMap = new Map<string, ProviderResult[]>();
  const failed: ProviderResult[] = [];
  const loading: ProviderResult[] = [];

  for (const r of results) {
    if (r.status === 'loading') {
      loading.push(r);
    } else if (r.status === 'error' || !r.ip) {
      failed.push(r);
    } else {
      const existing = ipMap.get(r.ip) || [];
      existing.push(r);
      ipMap.set(r.ip, existing);
    }
  }

  const groups: IpConsensusGroup[] = Array.from(ipMap.entries()).map(([ip, provs]) => {
    const latencies = provs.map((p) => p.latencyMs || 0).filter((l) => l > 0);
    const avgLatency = latencies.length
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;
    const version = provs.find((p) => p.version)?.version;
    const geoProvider = provs.find((p) => p.geo?.city || p.geo?.country);
    const geoSummary = geoProvider?.geo
      ? [geoProvider.geo.city, geoProvider.geo.region, geoProvider.geo.country]
          .filter(Boolean)
          .join(', ')
      : undefined;
    const asOrganization = geoProvider?.geo?.asOrganization;

    return {
      ip,
      version,
      providers: provs,
      avgLatency,
      geoSummary,
      asOrganization,
    };
  });

  // Sort: IPv4 first, then IPv6, then descending by number of providers
  groups.sort((a, b) => {
    if (a.version !== b.version) {
      return a.version === 'IPv4' ? -1 : 1;
    }
    return b.providers.length - a.providers.length;
  });

  const totalSuccessful = groups.reduce((sum, g) => sum + g.providers.length, 0);

  return {
    groups,
    failedProviders: failed,
    loadingProviders: loading,
    totalSuccessful,
  };
}
