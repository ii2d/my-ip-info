import { Cpu, Globe, RefreshCw, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import type React from 'react';
import type { WebRtcLeakResult } from '../types';

interface WebRtcLeakCardProps {
  leakResult: WebRtcLeakResult & { reProbe: () => void };
  primaryIpv4?: string;
}

export const WebRtcLeakCard: React.FC<WebRtcLeakCardProps> = ({ leakResult, primaryIpv4 }) => {
  const isProbing = leakResult.status === 'probing';
  const isUnsupported = leakResult.status === 'unsupported';

  // Check if WebRTC STUN revealed a different public IP than the HTTP API (indicating a VPN/Proxy leak)
  const stunWanIp = leakResult.publicIps[0];
  const isVpnLeaked = Boolean(primaryIpv4 && stunWanIp && primaryIpv4 !== stunWanIp);

  return (
    <div className="glass-card" style={{ padding: '1.75rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            className="btn btn-ghost btn-icon"
            onClick={leakResult.reProbe}
            disabled={isProbing}
            title="Re-run WebRTC STUN probe"
          >
            <RefreshCw size={14} className={isProbing ? 'spin-anim' : ''} />
          </button>
        </div>
      </div>

      {isUnsupported ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          WebRTC is not supported or is blocked by your browser settings / extensions.
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
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
              style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}
            >
              <Cpu size={15} color="var(--accent-cyan)" />
              <span
                style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)' }}
              >
                LOCAL NETWORK CANDIDATES (LAN)
              </span>
            </div>

            {leakResult.localIps.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {leakResult.localIps.map((ip) => (
                  <div key={ip} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-cyan" style={{ fontSize: '0.6875rem' }}>
                      Host
                    </span>
                    <span
                      className="mono"
                      style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}
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
              style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}
            >
              <Globe size={15} color="var(--accent-primary)" />
              <span
                style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)' }}
              >
                STUN REFLEXIVE CANDIDATE (WAN)
              </span>
            </div>

            {stunWanIp ? (
              <div>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}
                >
                  <span className="badge badge-emerald" style={{ fontSize: '0.6875rem' }}>
                    srflx
                  </span>
                  <span
                    className="mono"
                    style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}
                  >
                    {stunWanIp}
                  </span>
                </div>
                {isVpnLeaked && (
                  <span style={{ fontSize: '0.75rem', color: '#fb7185', display: 'block' }}>
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
      )}
    </div>
  );
};
