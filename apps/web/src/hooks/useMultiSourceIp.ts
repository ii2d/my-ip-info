import { useCallback, useEffect, useState } from 'react';
import { IpProvider, ProviderResult } from '../types';

export function useMultiSourceIp(providers: IpProvider[]) {
  const [results, setResults] = useState<Record<string, ProviderResult>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    setIsRefreshing(true);

    // Initialize all as loading
    const initial: Record<string, ProviderResult> = {};
    for (const p of providers) {
      initial[p.id] = {
        providerId: p.id,
        providerName: p.name,
        category: p.category,
        status: 'loading',
      };
    }
    setResults(initial);

    // Query each provider concurrently
    await Promise.allSettled(
      providers.map(async (provider) => {
        const startTime = performance.now();
        try {
          const res = await provider.fetchIp();
          const latencyMs = Math.round(performance.now() - startTime);

          setResults((prev) => ({
            ...prev,
            [provider.id]: {
              providerId: provider.id,
              providerName: provider.name,
              category: provider.category,
              status: 'success',
              ip: res.ip,
              version: res.version,
              latencyMs,
              geo: res.geo,
              protocol: res.protocol,
              rawHeaders: res.rawHeaders,
            },
          }));
        } catch (err: any) {
          const latencyMs = Math.round(performance.now() - startTime);
          setResults((prev) => ({
            ...prev,
            [provider.id]: {
              providerId: provider.id,
              providerName: provider.name,
              category: provider.category,
              status: 'error',
              latencyMs,
              errorMessage: err.message || 'Request failed',
            },
          }));
        }
      })
    );

    setIsRefreshing(false);
  }, [providers]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Derived summaries
  const resultsList = Object.values(results);
  const successfulResults = resultsList.filter((r) => r.status === 'success' && r.ip);

  // Extract detected IPv4 and IPv6
  const primaryIpv4 = successfulResults.find((r) => r.version === 'IPv4')?.ip;
  const primaryIpv6 = successfulResults.find((r) => r.version === 'IPv6')?.ip;

  // Extract primary Geo info (from first successful provider that returned geo data)
  const primaryGeo = successfulResults.find((r) => r.geo?.city || r.geo?.country)?.geo;

  // Compute average latency
  const latencies = successfulResults.map((r) => r.latencyMs || 0).filter((l) => l > 0);
  const avgLatency = latencies.length
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : undefined;

  return {
    results,
    resultsList,
    isRefreshing,
    primaryIpv4,
    primaryIpv6,
    primaryGeo,
    avgLatency,
    refresh: fetchAll,
  };
}
