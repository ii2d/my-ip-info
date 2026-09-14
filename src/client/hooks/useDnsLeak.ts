import { useCallback, useEffect, useRef, useState } from 'react';
import { parseDnsLeakResponse } from '../../shared/dns';
import type { DnsLeakResult } from '../types';

const COOLDOWN_MS = 3000;
const PROBE_COUNT = 10;

export function useDnsLeak(clientCountry?: string) {
  const [result, setResult] = useState<DnsLeakResult>({
    status: 'idle',
    dnsServers: [],
    isLeaking: false,
  });

  const isTestingRef = useRef(false);
  const lastTestTimeRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const runTest = useCallback(async () => {
    const now = Date.now();
    if (isTestingRef.current) return;
    if (now - lastTestTimeRef.current < COOLDOWN_MS) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    isTestingRef.current = true;
    lastTestTimeRef.current = now;
    setResult((prev) => ({
      ...prev,
      status: 'testing',
      errorMessage: undefined,
    }));

    try {
      // 1. Get random test ID
      const idRes = await fetch('https://bash.ws/id', {
        signal: abortController.signal,
        cache: 'no-store',
      });
      if (!idRes.ok) {
        throw new Error(`Failed to initialize DNS test: HTTP ${idRes.status}`);
      }
      const testId = (await idRes.text()).trim();
      if (!testId || testId.length > 64) {
        throw new Error('Invalid test ID returned by DNS probe authority');
      }

      // 2. Trigger nonce subdomain DNS queries across network interfaces
      const probePromises: Promise<void>[] = [];
      for (let i = 1; i <= PROBE_COUNT; i++) {
        const url = `https://${i}.${testId}.bash.ws`;
        const probePromise = fetch(url, {
          mode: 'no-cors',
          cache: 'no-store',
          signal: abortController.signal,
        })
          .then(() => {})
          .catch(() => {}); // DNS queries happen even if HTTP fails/no-cors
        probePromises.push(probePromise);
      }

      // Wait for parallel probes (or max timeout)
      await Promise.race([
        Promise.all(probePromises),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);

      // Small pause to allow upstream recursive DNS resolvers to record authoritative response
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (abortController.signal.aborted) return;

      // 3. Fetch DNS leak results
      const resultRes = await fetch(`https://bash.ws/dnsleak/test/${testId}?json`, {
        signal: abortController.signal,
        cache: 'no-store',
      });
      if (!resultRes.ok) {
        throw new Error(`Failed to retrieve DNS results: HTTP ${resultRes.status}`);
      }

      const rawData = await resultRes.json();
      const parsed = parseDnsLeakResponse(rawData, clientCountry);

      setResult({
        status: 'completed',
        detectedIp: parsed.detectedIp,
        detectedCountry: parsed.detectedCountry,
        detectedAsn: parsed.detectedAsn,
        detectedOrg: parsed.detectedOrg,
        dnsServers: parsed.dnsServers,
        conclusion: parsed.conclusion,
        isLeaking: parsed.isLeaking,
      });
    } catch (err) {
      if (abortController.signal.aborted) return;
      const message = err instanceof Error ? err.message : 'Unknown DNS probe error';
      setResult((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: message,
      }));
    } finally {
      isTestingRef.current = false;
    }
  }, [clientCountry]);

  // Initial probe with a short delay so main IP hero finishes first
  useEffect(() => {
    const timer = setTimeout(() => {
      runTest();
    }, 400);

    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [runTest]);

  return {
    ...result,
    reTest: runTest,
  };
}
