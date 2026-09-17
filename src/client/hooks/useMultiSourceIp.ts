import { useCallback, useEffect, useRef, useState } from 'react';
import type { IpProvider, ProviderResult } from '../types';

const REFOCUS_COOLDOWN_MS = 2000;
const PROVIDER_TIMEOUT_MS = 7000;

export function useMultiSourceIp(providers: IpProvider[]) {
  const [results, setResults] = useState<Record<string, ProviderResult>>({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const providersRef = useRef(providers);
  providersRef.current = providers;

  const lastFetchTimeRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);

  const fetchSingleProvider = useCallback(
    async (
      provider: IpProvider,
      parentSignal: AbortSignal,
      currentRequestId: number,
      signalAbortedCheck: () => boolean
    ) => {
      const startTime = performance.now();

      // Set up a per-provider timeout linked to parent abort signal
      const providerController = new AbortController();
      const onParentAbort = () => providerController.abort();
      parentSignal.addEventListener('abort', onParentAbort);

      const timeoutTimer = setTimeout(() => {
        providerController.abort(new Error('Request timed out (7s)'));
      }, PROVIDER_TIMEOUT_MS);

      try {
        const res = await provider.fetchIp(providerController.signal);
        clearTimeout(timeoutTimer);
        parentSignal.removeEventListener('abort', onParentAbort);

        // Ignore if a newer request has superseded this one
        if (currentRequestId !== requestIdRef.current) return;

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
      } catch (err: unknown) {
        clearTimeout(timeoutTimer);
        parentSignal.removeEventListener('abort', onParentAbort);

        // Ignore if a newer request has superseded this one or aborted by parent
        if (currentRequestId !== requestIdRef.current) return;
        if (signalAbortedCheck()) return;

        const latencyMs = Math.round(performance.now() - startTime);
        let errorMessage = err instanceof Error ? err.message : 'Request failed';
        if (errorMessage === 'Failed to fetch' || errorMessage.includes('NetworkError')) {
          errorMessage = 'Network connection failed / Blocked';
        }

        setResults((prev) => ({
          ...prev,
          [provider.id]: {
            providerId: provider.id,
            providerName: provider.name,
            category: provider.category,
            status: 'error',
            latencyMs,
            errorMessage,
          },
        }));
      }
    },
    []
  );

  const fetchAll = useCallback(
    async (force = false) => {
      const now = Date.now();
      // Skip automatic refreshes if called too soon, unless forced
      if (!force && isFetchingRef.current && now - lastFetchTimeRef.current < REFOCUS_COOLDOWN_MS) {
        return;
      }

      // Cancel any ongoing in-flight queries from previous request cycle
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const currentRequestId = ++requestIdRef.current;
      const currentProviders = providersRef.current;
      isFetchingRef.current = true;
      lastFetchTimeRef.current = now;

      // Determine if this is an initial load or background refresh
      setResults((prev) => {
        const isInitial = Object.keys(prev).length === 0;
        if (isInitial) {
          setIsInitialLoading(true);
          const initial: Record<string, ProviderResult> = {};
          for (const p of currentProviders) {
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
        // Mark existing entries as querying in-place so user immediately sees active state
        const refreshed: Record<string, ProviderResult> = { ...prev };
        for (const p of currentProviders) {
          if (refreshed[p.id]) {
            refreshed[p.id] = {
              ...refreshed[p.id],
              status: 'loading',
            };
          } else {
            refreshed[p.id] = {
              providerId: p.id,
              providerName: p.name,
              category: p.category,
              status: 'loading',
            };
          }
        }
        return refreshed;
      });

      try {
        await Promise.allSettled(
          currentProviders.map((provider) =>
            fetchSingleProvider(
              provider,
              abortController.signal,
              currentRequestId,
              () => abortController.signal.aborted
            )
          )
        );
      } finally {
        if (currentRequestId === requestIdRef.current) {
          isFetchingRef.current = false;
          setIsRefreshing(false);
          setIsInitialLoading(false);
          setLastRefreshedAt(new Date());
        }
      }
    },
    [fetchSingleProvider]
  );

  // Selective retry for failed providers
  const retryFailed = useCallback(
    async (targetIds?: string[]) => {
      const currentProviders = providersRef.current;
      const targets = currentProviders.filter((p) => {
        if (targetIds && targetIds.length > 0) {
          return targetIds.includes(p.id);
        }
        return results[p.id]?.status === 'error';
      });

      if (targets.length === 0) return;

      const currentRequestId = requestIdRef.current;
      const abortController = abortControllerRef.current || new AbortController();
      setIsRefreshing(true);

      setResults((prev) => {
        const updated = { ...prev };
        for (const p of targets) {
          updated[p.id] = {
            ...(updated[p.id] || {
              providerId: p.id,
              providerName: p.name,
              category: p.category,
            }),
            status: 'loading',
            errorMessage: undefined,
          };
        }
        return updated;
      });

      try {
        await Promise.allSettled(
          targets.map((p) =>
            fetchSingleProvider(
              p,
              abortController.signal,
              currentRequestId,
              () => abortController.signal.aborted
            )
          )
        );
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setIsRefreshing(false);
          setLastRefreshedAt(new Date());
        }
      }
    },
    [fetchSingleProvider, results]
  );

  // Initial load
  useEffect(() => {
    fetchAll(true);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchAll]);

  // Auto-refresh when user refocuses on page, switches back tab, or reconnects network
  useEffect(() => {
    const handleRefocus = () => {
      // Ignore if document is not visible
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }

      // Skip if fetched recently within cooldown window
      if (Date.now() - lastFetchTimeRef.current < REFOCUS_COOLDOWN_MS) {
        return;
      }

      fetchAll(false);
    };

    const handleOnline = () => {
      if (Date.now() - lastFetchTimeRef.current < REFOCUS_COOLDOWN_MS) {
        return;
      }
      fetchAll(true);
    };

    window.addEventListener('focus', handleRefocus);
    document.addEventListener('visibilitychange', handleRefocus);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('focus', handleRefocus);
      document.removeEventListener('visibilitychange', handleRefocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [fetchAll]);

  // Derived summaries (preserve stable provider declaration order)
  const resultsList = providers.map((p) => results[p.id]).filter(Boolean);
  const successfulResults = resultsList.filter((r) => r.status === 'success' && r.ip);
  const failedResults = resultsList.filter((r) => r.status === 'error');
  const failedCount = failedResults.length;
  const isAllFailed =
    !isInitialLoading && resultsList.length > 0 && failedCount === resultsList.length;

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

  const manualRefresh = useCallback(() => fetchAll(true), [fetchAll]);

  return {
    results,
    resultsList,
    failedResults,
    failedCount,
    isAllFailed,
    isInitialLoading,
    isRefreshing,
    lastRefreshedAt,
    primaryIpv4,
    primaryIpv6,
    primaryGeo,
    avgLatency,
    refresh: manualRefresh,
    retryFailed,
  };
}
