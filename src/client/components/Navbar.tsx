import { Globe, RefreshCw, Server, Settings, Terminal } from 'lucide-react';
import type React from 'react';

interface NavbarProps {
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenEndpointsModal: () => void;
  onOpenCliModal: () => void;
  onOpenSettingsModal: () => void;
  activeEndpointsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  isRefreshing,
  onRefresh,
  onOpenEndpointsModal,
  onOpenCliModal,
  onOpenSettingsModal,
  activeEndpointsCount,
}) => {
  return (
    <header className="navbar">
      <div className="nav-brand">
        <div className="brand-icon">
          <Globe size={22} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="brand-title">my-ip-info</span>
            <span className="brand-badge">v{__APP_VERSION__}</span>
          </div>
          <p className="nav-subtitle" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Multi-Source IP & Connectivity Intelligence
          </p>
        </div>
      </div>

      <div className="nav-actions">
        <button className="btn btn-ghost" onClick={onOpenCliModal} title="CLI / cURL commands">
          <Terminal size={16} />
          <span className="nav-btn-text">cURL / CLI</span>
        </button>

        <button
          className="btn btn-ghost"
          onClick={onOpenEndpointsModal}
          title="Add or manage custom endpoints"
        >
          <Server size={16} />
          <span className="nav-btn-text">Custom APIs</span>
          {activeEndpointsCount > 0 && (
            <span
              className="badge badge-cyan"
              style={{ padding: '1px 6px', fontSize: '0.6875rem' }}
            >
              {activeEndpointsCount}
            </span>
          )}
        </button>

        <button
          className="btn btn-ghost btn-icon"
          onClick={onOpenSettingsModal}
          title="Configure Cloud & Self-Hosted Endpoints"
        >
          <Settings size={17} />
        </button>

        <button className="btn btn-primary" onClick={onRefresh} disabled={isRefreshing}>
          <RefreshCw size={15} className={isRefreshing ? 'spin-anim' : ''} />
          <span className="nav-btn-text">{isRefreshing ? 'Checking...' : 'Refresh'}</span>
        </button>
      </div>

      <style>{`
        .spin-anim {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </header>
  );
};
