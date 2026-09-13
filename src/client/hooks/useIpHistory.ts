import { useCallback, useEffect, useRef, useState } from 'react';
import type { GeoLocationInfo } from '../../shared/types';
import type { IpHistoryEntry } from '../types';

const STORAGE_HISTORY_ENABLED = 'my-ip-info:history-enabled';
const STORAGE_HISTORY = 'my-ip-info:history';
const MAX_HISTORY_ENTRIES = 50;

export interface RecordSnapshotResult {
  recorded: boolean;
  reason: 'recorded' | 'unchanged' | 'disabled' | 'no-ip';
}

export function useIpHistory() {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(STORAGE_HISTORY_ENABLED) === 'true';
    } catch {
      return false;
    }
  });

  const [history, setHistory] = useState<IpHistoryEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const historyRef = useRef<IpHistoryEntry[]>(history);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    try {
      localStorage.setItem(STORAGE_HISTORY_ENABLED, enabled ? 'true' : 'false');
    } catch (e) {
      console.warn('Failed to save history enabled state:', e);
    }
  }, []);

  const saveHistory = useCallback((updated: IpHistoryEntry[]) => {
    historyRef.current = updated;
    setHistory(updated);
    try {
      localStorage.setItem(STORAGE_HISTORY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save IP history:', e);
    }
  }, []);

  const clearHistory = useCallback(() => {
    saveHistory([]);
  }, [saveHistory]);

  const deleteEntry = useCallback(
    (id: string) => {
      const updated = history.filter((item) => item.id !== id);
      saveHistory(updated);
    },
    [history, saveHistory]
  );

  const recordSnapshot = useCallback(
    (ipv4?: string, ipv6?: string, geo?: GeoLocationInfo, force = false): RecordSnapshotResult => {
      if (!isEnabled) return { recorded: false, reason: 'disabled' };
      if (!ipv4 && !ipv6) return { recorded: false, reason: 'no-ip' };

      const normalizedIpv4 = ipv4 || undefined;
      const normalizedIpv6 = ipv6 || undefined;
      const latest = historyRef.current[0];

      // Skip recording if IP hasn't changed from the most recent entry, unless force is true
      if (
        !force &&
        latest &&
        latest.ipv4 === normalizedIpv4 &&
        latest.ipv6 === normalizedIpv6 &&
        latest.country === geo?.country
      ) {
        return { recorded: false, reason: 'unchanged' };
      }

      const newEntry: IpHistoryEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ipv4: normalizedIpv4,
        ipv6: normalizedIpv6,
        country: geo?.country,
        city: geo?.city,
        org: geo?.asOrganization,
      };

      const updated = [newEntry, ...historyRef.current].slice(0, MAX_HISTORY_ENTRIES);
      saveHistory(updated);
      return { recorded: true, reason: 'recorded' };
    },
    [isEnabled, saveHistory]
  );

  return {
    isEnabled,
    history,
    setEnabled,
    recordSnapshot,
    clearHistory,
    deleteEntry,
  };
}
