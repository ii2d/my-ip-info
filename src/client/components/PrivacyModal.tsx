import { CheckCircle2, Database, EyeOff, Globe, Radio, Shield, ShieldCheck, X } from 'lucide-react';
import type React from 'react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Privacy & Data Handling Policy</h3>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            title="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ gap: '1.25rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '0.875rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              color: '#38bdf8',
              fontSize: '0.875rem',
            }}
          >
            <ShieldCheck size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>Strict Zero-Log Policy:</strong> Your IP address, geolocation, and request
              data are never stored, logged, or monetized.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Section 1: In-Memory Processing */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  color: 'var(--text-primary)',
                  marginBottom: '0.375rem',
                }}
              >
                <Database size={16} color="var(--accent-emerald)" />
                <span>Zero Persistent Logging</span>
              </div>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.5',
                  margin: 0,
                }}
              >
                Requests to our edge API endpoints (such as <code className="mono">/api/v1/ip</code>{' '}
                and <code className="mono">/api/v1/info</code>) are processed ephemerally in edge
                worker memory. No database, server log, or tracking store persists your IP address
                or request metadata.
              </p>
            </div>

            {/* Section 2: Client-Side Multi-Source Queries */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  color: 'var(--text-primary)',
                  marginBottom: '0.375rem',
                }}
              >
                <Globe size={16} color="#38bdf8" />
                <span>Direct Client-Side Multi-Source Requests</span>
              </div>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.5',
                  margin: 0,
                }}
              >
                Diagnostic queries across secondary providers (Cloudflare Trace, ipify, etc.) and
                your configured custom endpoints are initiated directly from your browser via HTTPS.
                They never pass through an intermediary proxy server.
              </p>
            </div>

            {/* Section 3: WebRTC STUN Leaks */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  color: 'var(--text-primary)',
                  marginBottom: '0.375rem',
                }}
              >
                <Radio size={16} color="#f59e0b" />
                <span>WebRTC STUN Leak Diagnostics</span>
              </div>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.5',
                  margin: 0,
                }}
              >
                The WebRTC leak test creates an isolated, local WebRTC peer connection that sends
                standard STUN requests to Google and Cloudflare STUN servers solely to reflect your
                reflexive candidate IP. No media, audio, or video streams are ever created or
                transmitted.
              </p>
            </div>

            {/* Section 4: Cookies & Analytics */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  color: 'var(--text-primary)',
                  marginBottom: '0.375rem',
                }}
              >
                <EyeOff size={16} color="#a855f7" />
                <span>No Cookies, Trackers, or Advertising</span>
              </div>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.5',
                  margin: 0,
                }}
              >
                This application does not set advertising or tracking cookies, nor does it embed
                third-party tracking SDKs (like Google Analytics, Facebook Pixel, etc.). Your local
                browser storage (<code className="mono">localStorage</code>) is used strictly to
                save your preferences, custom endpoint list, backend overrides, and opt-in local IP
                connection history (disabled by default, stored 100% on your device, and never
                transmitted to any server).
              </p>
            </div>

            {/* Section 5: Open Source Transparency */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  color: 'var(--text-primary)',
                  marginBottom: '0.375rem',
                }}
              >
                <CheckCircle2 size={16} color="var(--accent-emerald)" />
                <span>Open Source & Publicly Auditable</span>
              </div>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.5',
                  margin: 0,
                }}
              >
                All source code for the client application, Cloudflare Workers backend, and Node.js
                runtime is publicly auditable on GitHub under the MIT License.
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: '0.5rem',
            }}
          >
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Got It
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
