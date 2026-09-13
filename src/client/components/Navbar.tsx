import { ExternalLink, Globe, Menu, RefreshCw, Settings, Terminal, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';

const GithubIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

interface NavbarProps {
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenCliModal: () => void;
  onOpenSettingsModal: () => void;
  activeEndpointsCount: number;
}

const GITHUB_REPO_URL = 'https://github.com/ii2d/my-ip-info';

export const Navbar: React.FC<NavbarProps> = ({
  isRefreshing,
  onRefresh,
  onOpenCliModal,
  onOpenSettingsModal,
  activeEndpointsCount,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  return (
    <header className="navbar">
      <div className="nav-brand">
        <div className="brand-icon">
          <Globe size={22} />
        </div>
        <div className="brand-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="brand-title">My IP Info</span>
            <span className="brand-badge">{__APP_VERSION__}</span>
          </div>
          <p className="nav-subtitle" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Multi-Source IP & Connectivity Intelligence
          </p>
        </div>
      </div>

      <div className="nav-actions">
        {/* Desktop actions: directly visible on wider screens */}
        <div className="nav-desktop-actions">
          <button
            className="btn btn-ghost"
            onClick={onOpenCliModal}
            title="CLI / cURL commands"
            type="button"
          >
            <Terminal size={16} />
            <span className="nav-btn-text">cURL / CLI</span>
          </button>

          <button
            className="btn btn-ghost"
            onClick={onOpenSettingsModal}
            title="Configure Custom Endpoints & Cloudflare Worker"
            type="button"
          >
            <Settings size={16} />
            <span className="nav-btn-text">Settings</span>
            {activeEndpointsCount > 0 && (
              <span
                className="badge badge-cyan"
                style={{ padding: '1px 6px', fontSize: '0.6875rem' }}
              >
                {activeEndpointsCount}
              </span>
            )}
          </button>

          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost"
            title="GitHub Repository"
          >
            <GithubIcon size={16} />
            <span className="nav-btn-text">GitHub</span>
          </a>
        </div>

        {/* Primary action: standalone on all screen sizes */}
        <button
          className="btn btn-primary"
          onClick={onRefresh}
          disabled={isRefreshing}
          type="button"
          title="Refresh all IP sources"
        >
          <RefreshCw size={15} className={isRefreshing ? 'spin-anim' : ''} />
          <span className="nav-btn-text">{isRefreshing ? 'Checking...' : 'Refresh'}</span>
        </button>

        {/* Mobile menu trigger and dropdown (visible only on mobile) */}
        <div className="nav-menu-wrapper">
          <button
            className="btn btn-ghost btn-icon nav-mobile-menu-btn"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            title="More options"
            type="button"
            aria-expanded={isMenuOpen}
            aria-haspopup="true"
          >
            {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
            {activeEndpointsCount > 0 && !isMenuOpen && (
              <span className="nav-menu-dot" title={`${activeEndpointsCount} active custom APIs`} />
            )}
          </button>

          {isMenuOpen && (
            <>
              <div
                className="nav-dropdown-backdrop"
                onClick={() => setIsMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="nav-dropdown-menu" role="menu">
                <button
                  type="button"
                  className="nav-dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenCliModal();
                  }}
                >
                  <Terminal size={16} />
                  <span>cURL / CLI Toolbox</span>
                </button>

                <button
                  type="button"
                  className="nav-dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenSettingsModal();
                  }}
                >
                  <Settings size={16} />
                  <span style={{ flex: 1 }}>Settings & Custom APIs</span>
                  {activeEndpointsCount > 0 && (
                    <span
                      className="badge badge-cyan"
                      style={{ padding: '1px 6px', fontSize: '0.6875rem' }}
                    >
                      {activeEndpointsCount}
                    </span>
                  )}
                </button>

                <div className="nav-dropdown-divider" />

                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="nav-dropdown-item"
                  role="menuitem"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <GithubIcon size={16} />
                  <span style={{ flex: 1 }}>GitHub Repository</span>
                  <ExternalLink size={13} color="var(--text-muted)" />
                </a>
              </div>
            </>
          )}
        </div>
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
