import { Code2, Heart } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { CliToolboxModal } from './components/CliToolboxModal';
import { ComparisonMatrix } from './components/ComparisonMatrix';
import { CustomEndpointModal } from './components/CustomEndpointModal';
import { HeroCard } from './components/HeroCard';
import { Navbar } from './components/Navbar';
import { SettingsModal } from './components/SettingsModal';
import { WebRtcLeakCard } from './components/WebRtcLeakCard';
import { WorldMap } from './components/WorldMap';
import { useMultiSourceIp } from './hooks/useMultiSourceIp';
import { useWebRtcLeak } from './hooks/useWebRtcLeak';
import { getCustomEndpointProviders, getSelfHostedProviders, PUBLIC_PROVIDERS } from './providers';
import type { CustomEndpoint } from './types';

const STORAGE_CUSTOM_ENDPOINTS = 'my-ip-info:custom-endpoints';
const STORAGE_CONFIG = 'my-ip-info:config';

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

  // Load serverless endpoints configuration (fallback to Vite env vars)
  const [cloudConfig, setCloudConfig] = useState(() => {
    const defaults = {
      cloudflareUrl: import.meta.env.VITE_CLOUDFLARE_URL || '',
    };
    if (typeof window === 'undefined') return defaults;
    try {
      const saved = localStorage.getItem(STORAGE_CONFIG);
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  });

  // Modal states
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isCliModalOpen, setIsCliModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Combine providers list
  const activeProviders = useMemo(() => {
    const selfHosted = getSelfHostedProviders(cloudConfig);
    const custom = getCustomEndpointProviders(customEndpoints);
    return [...selfHosted, ...PUBLIC_PROVIDERS, ...custom];
  }, [cloudConfig, customEndpoints]);

  // Query engine hooks
  const {
    resultsList,
    isInitialLoading,
    isRefreshing,
    primaryIpv4,
    primaryIpv6,
    primaryGeo,
    avgLatency,
    refresh,
  } = useMultiSourceIp(activeProviders);

  const leakResult = useWebRtcLeak();

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

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        isRefreshing={isRefreshing}
        onRefresh={refresh}
        onOpenEndpointsModal={() => setIsCustomModalOpen(true)}
        onOpenCliModal={() => setIsCliModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        activeEndpointsCount={customEndpoints.filter((e) => e.enabled).length}
      />

      {/* Hero IP Overview Card */}
      <HeroCard
        ipv4={primaryIpv4}
        ipv6={primaryIpv6}
        geo={primaryGeo}
        avgLatency={avgLatency}
        isRefreshing={isRefreshing}
        isInitialLoading={isInitialLoading}
      />

      {/* Multi-Source Comparison Table */}
      <ComparisonMatrix results={resultsList} isInitialLoading={isInitialLoading} />

      {/* Grid: Interactive World Map & WebRTC STUN Leak Inspector */}
      <div className="dashboard-grid">
        <WorldMap results={resultsList} />
        <WebRtcLeakCard leakResult={leakResult} primaryIpv4={primaryIpv4} />
      </div>

      {/* Modals */}
      <CustomEndpointModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        endpoints={customEndpoints}
        onSaveEndpoints={handleSaveEndpoints}
        onRefreshAll={refresh}
      />

      <CliToolboxModal
        isOpen={isCliModalOpen}
        onClose={() => setIsCliModalOpen(false)}
        cloudflareUrl={cloudConfig.cloudflareUrl}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={cloudConfig}
        onSaveConfig={handleSaveConfig}
        onRefreshAll={refresh}
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
          <span>Open Source Project</span>
          <span>•</span>
          <span>Powered by Cloudflare Workers & Cloudflare Pages</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
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
