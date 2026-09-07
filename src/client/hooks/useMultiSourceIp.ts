import { useCallback, useEffect, useRef, useState } from 'react';
import type { IpProvider, ProviderResult } from '../types';

const REFOCUS_COOLDOWN_MS = 5000;

export function useMultiSourceIp(providers: IpProvider[]) {
  const [results, setResults] = useState<Record<string, ProviderResult>>({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const lastFetchTimeRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);

  const fetchAll = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    lastFetchTimeRef.current = Date.now();

    // Determine if this is an initial load or background refresh
    setResults((prev) => {
      const isInitial = Object.keys(prev).length === 0;
      if (isInitial) {
        setIsInitialLoading(true);
        const initial: Record<string, ProviderResult> = {};
        for (const p of providers) {
          initial[p.id] = {
            providerId: p.id,
            providerName: p.name,
            category: p.category,
            status: 'loading',
          };
        }
        return initial;
      }
      setIsRefreshing(true);
      return prev; // Keep existing data intact!
    });

    try {
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
    } finally {
      isFetchingRef.current = false;
      setIsRefreshing(false);
      setIsInitialLoading(false);
    }
  }, [providers]);

  // Initial load
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Auto-refresh when user refocuses on page, switches back tab, or reconnects
  useEffect(() => {
    const handleRefocus = () => {
      // Ignore if document is not visible
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }

      // Skip if an active query is already in-flight
      if (isFetchingRef.current) {
        return;
      }

      // Skip if fetched recently within cooldown window
      if (Date.now() - lastFetchTimeRef.current < REFOCUS_COOLDOWN_MS) {
        return;
      }

      fetchAll();
    };

    window.addEventListener('focus', handleRefocus);
    document.addEventListener('visibilitychange', handleRefocus);
    window.addEventListener('online', handleRefocus);

    return () => {
      window.removeEventListener('focus', handleRefocus);
      document.removeEventListener('visibilitychange', handleRefocus);
      window.removeEventListener('online', handleRefocus);
    };
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
    isInitialLoading,
    isRefreshing,
    primaryIpv4,
    primaryIpv6,
    primaryGeo,
    avgLatency,
    refresh: fetchAll,
  };
}
