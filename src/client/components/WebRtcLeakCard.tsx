import { ChevronDown, Cpu, Globe, RefreshCw, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import type React from 'react';
import type { WebRtcLeakResult } from '../types';

interface WebRtcLeakCardProps {
  leakResult: WebRtcLeakResult & { reProbe: () => void };
  primaryIpv4?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const WebRtcLeakCard: React.FC<WebRtcLeakCardProps> = ({
  leakResult,
  primaryIpv4,
  isExpanded = true,
  onToggleExpand,
}) => {
  const isProbing = leakResult.status === 'probing';
  const isUnsupported = leakResult.status === 'unsupported';

  // Check if WebRTC STUN revealed a different public IP than the HTTP API (indicating a VPN/Proxy leak)
  const stunWanIp = leakResult.publicIps[0];
  const isVpnLeaked = Boolean(primaryIpv4 && stunWanIp && primaryIpv4 !== stunWanIp);

  return (
    <div
      id="webrtc-leak-card"
      className="glass-card"
      style={{ padding: 'clamp(1.1rem, 3vw, 1.75rem)' }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isExpanded ? '1.25rem' : 0,
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="var(--accent-emerald)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>WebRTC & STUN Leak Inspector</h2>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Interrogates browser WebRTC ICE candidates to detect local LAN interfaces and VPN
            bypasses.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {isVpnLeaked ? (
            <span className="badge badge-rose">
              <ShieldAlert size={14} /> Potential VPN Bypass Detected
            </span>
          ) : leakResult.status === 'completed' ? (
            <span className="badge badge-emerald">
              <ShieldCheck size={14} /> Diagnostic Complete
            </span>
          ) : (
            <span className="badge badge-cyan">Gathering ICE Candidates...</span>
          )}

          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={leakResult.reProbe}
            disabled={isProbing}
            title="Re-run WebRTC STUN probe"
          >
            <RefreshCw size={14} className={isProbing ? 'spin-anim' : ''} />
          </button>

          {onToggleExpand && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onToggleExpand}
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <span>{isExpanded ? 'Hide' : 'Details'}</span>
              <ChevronDown
                size={14}
                style={{
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.25s ease',
                }}
              />
            </button>
          )}
        </div>
      </div>

      {isExpanded &&
        (isUnsupported ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            WebRTC is not supported or is blocked by your browser settings / extensions.
          </p>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {/* Local Interface IPs (LAN) */}
            <div
              style={{
                background: 'rgba(10, 16, 28, 0.6)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '0.75rem',
                }}
              >
                <Cpu size={15} color="var(--accent-cyan)" />
                <span
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                  }}
                >
                  LOCAL NETWORK CANDIDATES (LAN)
                </span>
              </div>

              {leakResult.localIps.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {leakResult.localIps.map((ip) => (
                    <div
                      key={ip}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}
                    >
                      <span
                        className="badge badge-cyan"
                        style={{ fontSize: '0.6875rem', flexShrink: 0 }}
                      >
                        Host
                      </span>
                      <span
                        className="mono"
                        style={{
                          fontSize: '0.8125rem',
                          color: 'var(--text-primary)',
                          wordBreak: 'break-all',
                          overflowWrap: 'anywhere',
                          minWidth: 0,
                        }}
                      >
                        {ip}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {isProbing
                    ? 'Probing interfaces...'
                    : 'No local IP exposed (mDNS protected or hidden)'}
                </span>
              )}
            </div>

            {/* Public STUN WAN IP */}
            <div
              style={{
                background: 'rgba(10, 16, 28, 0.6)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: isVpnLeaked
                  ? '1px solid rgba(244, 63, 94, 0.4)'
                  : '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '0.75rem',
                }}
              >
                <Globe size={15} color="var(--accent-primary)" />
                <span
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                  }}
                >
                  STUN REFLEXIVE CANDIDATE (WAN)
                </span>
              </div>

              {stunWanIp ? (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px',
                      minWidth: 0,
                    }}
                  >
                    <span
                      className="badge badge-emerald"
                      style={{ fontSize: '0.6875rem', flexShrink: 0 }}
                    >
                      srflx
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        wordBreak: 'break-all',
                        overflowWrap: 'anywhere',
                        minWidth: 0,
                      }}
                    >
                      {stunWanIp}
                    </span>
                  </div>
                  {isVpnLeaked && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#fb7185',
                        display: 'block',
                        wordBreak: 'break-word',
                      }}
                    >
                      ⚠️ STUN detected an IP different from your HTTP IP ({primaryIpv4})!
                    </span>
                  )}
                </div>
              ) : (
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {isProbing
                    ? 'Contacting Google STUN server...'
                    : 'No reflexive STUN candidate returned'}
                </span>
              )}
            </div>
          </div>
        ))}
    </div>
  );
};
