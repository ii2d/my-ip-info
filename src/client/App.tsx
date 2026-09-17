import { Code2, Shield } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { CliToolboxModal } from './components/CliToolboxModal';
import { ComparisonMatrix } from './components/ComparisonMatrix';
import { DnsLeakCard } from './components/DnsLeakCard';
import { ErrorBanner } from './components/ErrorBanner';
import { HeroCard } from './components/HeroCard';
import { HistoryModal } from './components/HistoryModal';
import { Navbar } from './components/Navbar';
import { PrivacyModal } from './components/PrivacyModal';
import { SettingsModal } from './components/SettingsModal';
import { WebRtcLeakCard } from './components/WebRtcLeakCard';
import { WorldMap } from './components/WorldMap';
import { useDnsLeak } from './hooks/useDnsLeak';
import { useIpHistory } from './hooks/useIpHistory';
import { useMultiSourceIp } from './hooks/useMultiSourceIp';
import { useWebRtcLeak } from './hooks/useWebRtcLeak';
import { getCustomEndpointProviders, getSelfHostedProviders, PUBLIC_PROVIDERS } from './providers';
import type { CustomEndpoint } from './types';

interface ExpandedSections {
  matrix: boolean;
  webrtc: boolean;
  dns: boolean;
}

const STORAGE_CUSTOM_ENDPOINTS = 'my-ip-info:custom-endpoints';
const STORAGE_CONFIG = 'my-ip-info:config';
const STORAGE_DISABLED_PROVIDERS = 'my-ip-info:disabled-providers';
const STORAGE_EXPANDED_SECTIONS = 'my-ip-info:expanded-sections';

export const App: React.FC = () => {
  // Load custom endpoints from localStorage
  const [customEndpoints, setCustomEndpoints] = useState<CustomEndpoint[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_CUSTOM_ENDPOINTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load disabled provider IDs from localStorage
  const [disabledProviderIds, setDisabledProviderIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_DISABLED_PROVIDERS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load serverless endpoints configuration (fallback to Vite env vars)
  const [cloudConfig, setCloudConfig] = useState(() => {
    const envBackendUrl = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.trim() || '';
    const defaults = {
      cloudflareUrl: envBackendUrl,
    };
    if (typeof window === 'undefined') return defaults;
    try {
      const saved = localStorage.getItem(STORAGE_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaults,
          ...parsed,
          cloudflareUrl: parsed.cloudflareUrl?.trim() || defaults.cloudflareUrl,
        };
      }
      return defaults;
    } catch {
      return defaults;
    }
  });

  // Modal states
  const [isCliModalOpen, setIsCliModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // IP History Hook
  const {
    isEnabled: isHistoryEnabled,
    history,
    setEnabled: setHistoryEnabled,
    recordSnapshot,
    clearHistory,
    deleteEntry: deleteHistoryEntry,
  } = useIpHistory();

  // Combine providers list (filtering out user-disabled providers)
  const activeProviders = useMemo(() => {
    const selfHosted = getSelfHostedProviders(cloudConfig);
    const custom = getCustomEndpointProviders(customEndpoints);
    const all = [...selfHosted, ...PUBLIC_PROVIDERS, ...custom];
    return all.filter((p) => !disabledProviderIds.includes(p.id));
  }, [cloudConfig, customEndpoints, disabledProviderIds]);

  // 3 independent collapsible diagnostics sections (default: collapsed)
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>(() => {
    const defaults: ExpandedSections = { matrix: false, webrtc: false, dns: false };
    if (typeof window === 'undefined') return defaults;
    try {
      const saved = localStorage.getItem(STORAGE_EXPANDED_SECTIONS);
      if (saved) return { ...defaults, ...JSON.parse(saved) };
      const oldDetails = localStorage.getItem('my-ip-info:details-expanded');
      if (oldDetails !== null) {
        const val = JSON.parse(oldDetails);
        return { matrix: val, webrtc: val, dns: val };
      }
      return defaults;
    } catch {
      return defaults;
    }
  });

  const handleToggleSection = (section: keyof ExpandedSections) => {
    setExpandedSections((prev) => {
      const next = { ...prev, [section]: !prev[section] };
      try {
        localStorage.setItem(STORAGE_EXPANDED_SECTIONS, JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save expanded sections:', e);
      }
      return next;
    });
  };

  const handleOpenSection = (section: keyof ExpandedSections, elementId: string) => {
    setExpandedSections((prev) => {
      const next = { ...prev, [section]: true };
      try {
        localStorage.setItem(STORAGE_EXPANDED_SECTIONS, JSON.stringify(next));
      } catch {}
      return next;
    });
    setTimeout(() => {
      document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const isAllExpanded = expandedSections.matrix && expandedSections.webrtc && expandedSections.dns;
  const handleToggleAllSections = () => {
    const nextState = !isAllExpanded;
    const next: ExpandedSections = {
      matrix: nextState,
      webrtc: nextState,
      dns: nextState,
    };
    setExpandedSections(next);
    try {
      localStorage.setItem(STORAGE_EXPANDED_SECTIONS, JSON.stringify(next));
    } catch (e) {
      console.warn('Failed to save expanded sections:', e);
    }
  };

  // Query engine hooks
  const {
    resultsList,
    failedResults,
    isAllFailed,
    isInitialLoading,
    isRefreshing,
    lastRefreshedAt,
    primaryIpv4,
    primaryIpv6,
    primaryGeo,
    avgLatency,
    refresh,
    retryFailed,
  } = useMultiSourceIp(activeProviders);

  const leakResult = useWebRtcLeak();
  const dnsLeakResult = useDnsLeak(primaryGeo?.country);

  const stunWanIp = leakResult.publicIps[0];
  const isWebRtcLeaked = Boolean(primaryIpv4 && stunWanIp && primaryIpv4 !== stunWanIp);
  const isDnsLeaked = dnsLeakResult.isLeaking;

  const handleRefreshAll = () => {
    refresh();
    leakResult.reProbe();
    dnsLeakResult.reTest();
  };

  // Automatically record snapshot when primary IP or Geo is detected and queries are complete
  useEffect(() => {
    if (!isInitialLoading && !isRefreshing && (primaryIpv4 || primaryIpv6)) {
      recordSnapshot(primaryIpv4, primaryIpv6, primaryGeo);
    }
  }, [primaryIpv4, primaryIpv6, primaryGeo, isInitialLoading, isRefreshing, recordSnapshot]);

  const handleSaveEndpoints = (updated: CustomEndpoint[]) => {
    setCustomEndpoints(updated);
    try {
      localStorage.setItem(STORAGE_CUSTOM_ENDPOINTS, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save custom endpoints:', e);
    }
  };

  const handleSaveConfig = (updated: typeof cloudConfig) => {
    setCloudConfig(updated);
    try {
      localStorage.setItem(STORAGE_CONFIG, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save config:', e);
    }
  };

  const handleToggleProvider = (id: string) => {
    setDisabledProviderIds((prev) => {
      const isCurrentlyDisabled = prev.includes(id);
      const next = isCurrentlyDisabled ? prev.filter((pId) => pId !== id) : [...prev, id];
      try {
        localStorage.setItem(STORAGE_DISABLED_PROVIDERS, JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save disabled providers:', e);
      }
      return next;
    });
  };

  const handleEnableAllProviders = () => {
    setDisabledProviderIds([]);
    try {
      localStorage.removeItem(STORAGE_DISABLED_PROVIDERS);
    } catch (e) {
      console.warn('Failed to clear disabled providers:', e);
    }
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        isRefreshing={isRefreshing}
        onRefresh={handleRefreshAll}
        onOpenCliModal={() => setIsCliModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
        onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
        activeEndpointsCount={customEndpoints.filter((e) => e.enabled).length}
        historyCount={isHistoryEnabled ? history.length : undefined}
      />

      {/* Hero IP Overview Card */}
      <HeroCard
        ipv4={primaryIpv4}
        ipv6={primaryIpv6}
        geo={primaryGeo}
        avgLatency={avgLatency}
        isRefreshing={isRefreshing}
        isInitialLoading={isInitialLoading}
        lastRefreshedAt={lastRefreshedAt}
        securityStatus={{
          isWebRtcLeaked,
          isDnsLeaked,
          dnsServersCount: dnsLeakResult.dnsServers.length,
          isDnsTesting: dnsLeakResult.status === 'testing',
        }}
        onViewDetails={() => handleOpenSection('matrix', 'comparison-matrix-card')}
        onViewWebRtc={() => handleOpenSection('webrtc', 'webrtc-leak-card')}
        onViewDns={() => handleOpenSection('dns', 'dns-leak-card')}
      />

      {/* Error & Failure Alert Banner */}
      <ErrorBanner
        failedResults={failedResults}
        isAllFailed={isAllFailed}
        isRefreshing={isRefreshing}
        onRetryFailed={() => retryFailed()}
        onViewDetails={() => handleOpenSection('matrix', 'comparison-matrix-card')}
      />

      {/* Interactive Geolocation Convergence Map (with Location & ISP info) */}
      <WorldMap results={resultsList} geo={primaryGeo} isInitialLoading={isInitialLoading} />

      {/* 3 Independent Collapsible Diagnostics Accordions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.25rem 0.5rem 0',
          }}
        >
          <span
            style={{
              fontSize: '0.8125rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Diagnostics & Leak Tests
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleToggleAllSections}
            style={{ fontSize: '0.75rem', padding: '2px 8px', color: 'var(--text-muted)' }}
          >
            {isAllExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        </div>

        {/* 1. Multi-Source Comparison Table / Grouped Consensus Grid */}
        <ComparisonMatrix
          results={resultsList}
          isExpanded={expandedSections.matrix}
          onToggleExpand={() => handleToggleSection('matrix')}
          onRetryProvider={(id) => retryFailed([id])}
          onRetryAllFailed={() => retryFailed()}
          isRefreshing={isRefreshing}
        />

        {/* 2. WebRTC & STUN Leak Inspector */}
        <WebRtcLeakCard
          leakResult={leakResult}
          primaryIpv4={primaryIpv4}
          isExpanded={expandedSections.webrtc}
          onToggleExpand={() => handleToggleSection('webrtc')}
        />

        {/* 3. DNS Resolver & Leak Inspector */}
        <DnsLeakCard
          dnsResult={dnsLeakResult}
          isExpanded={expandedSections.dns}
          onToggleExpand={() => handleToggleSection('dns')}
        />
      </div>

      {/* Modals */}
      <CliToolboxModal
        isOpen={isCliModalOpen}
        onClose={() => setIsCliModalOpen(false)}
        cloudflareUrl={cloudConfig.cloudflareUrl}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        endpoints={customEndpoints}
        onSaveEndpoints={handleSaveEndpoints}
        config={cloudConfig}
        onSaveConfig={handleSaveConfig}
        onRefreshAll={refresh}
        disabledProviderIds={disabledProviderIds}
        onToggleProvider={handleToggleProvider}
        onEnableAllProviders={handleEnableAllProviders}
      />

      <PrivacyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} />

      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        isEnabled={isHistoryEnabled}
        history={history}
        onSetEnabled={setHistoryEnabled}
        onClearHistory={clearHistory}
        onDeleteEntry={deleteHistoryEntry}
        onRecordCurrentSnapshot={() => recordSnapshot(primaryIpv4, primaryIpv6, primaryGeo, true)}
      />

      {/* Footer */}
      <footer
        style={{
          textAlign: 'center',
          paddingTop: '2.5rem',
          borderTop: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)',
          fontSize: '0.8125rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Powered by Cloudflare Workers & Cloudflare Pages</span>
          <span>•</span>
          <span>{__APP_VERSION__}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={() => setIsPrivacyModalOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 'inherit',
              fontFamily: 'inherit',
            }}
          >
            <Shield size={15} />
            <span>Privacy Policy</span>
          </button>
          <span>•</span>
          <a
            href="https://github.com/ii2d/my-ip-info"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
            }}
          >
            <Code2 size={15} />
            <span>GitHub Repository</span>
          </a>
        </div>
      </footer>
    </div>
  );
};
