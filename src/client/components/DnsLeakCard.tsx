import { Globe, Radio, RefreshCw, Server, ShieldAlert, ShieldCheck } from 'lucide-react';
import type React from 'react';
import type { DnsLeakResult } from '../types';

interface DnsLeakCardProps {
  dnsResult: DnsLeakResult & { reTest: () => void };
}

export const DnsLeakCard: React.FC<DnsLeakCardProps> = ({ dnsResult }) => {
  const isTesting = dnsResult.status === 'testing';
  const isError = dnsResult.status === 'error';
  const hasDnsServers = dnsResult.dnsServers.length > 0;

  return (
    <div className="glass-card" style={{ padding: 'clamp(1.1rem, 3vw, 1.75rem)' }}>
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
            <Radio size={18} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>DNS Resolver & Leak Inspector</h2>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Resolves non-cached subdomains to detect if DNS queries bypass your proxy or VPN.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isTesting ? (
            <span className="badge badge-cyan">Probing DNS Resolvers...</span>
          ) : isError ? (
            <span className="badge badge-rose">Probe Error</span>
          ) : dnsResult.isLeaking ? (
            <span className="badge badge-rose">
              <ShieldAlert size={14} /> Potential DNS Leak
            </span>
          ) : hasDnsServers ? (
            <span className="badge badge-emerald">
              <ShieldCheck size={14} /> DNS Resolvers Clean
            </span>
          ) : (
            <span className="badge badge-slate">Ready</span>
          )}

          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={dnsResult.reTest}
            disabled={isTesting}
            title="Re-test DNS leak status"
          >
            <RefreshCw size={14} className={isTesting ? 'spin-anim' : ''} />
          </button>
        </div>
      </div>

      {isError ? (
        <div
          style={{
            background: 'rgba(244, 63, 94, 0.08)',
            border: '1px solid rgba(244, 63, 94, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <span style={{ color: 'var(--accent-rose)', fontSize: '0.875rem' }}>
            {dnsResult.errorMessage ||
              'Unable to contact DNS probe authority. Check your connection.'}
          </span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={dnsResult.reTest}>
            Retry
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
            gap: '1.25rem',
          }}
        >
          {/* Detected Upstream DNS Resolvers */}
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
                justifyContent: 'space-between',
                marginBottom: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Server size={15} color="var(--accent-emerald)" />
                <span
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                  }}
                >
                  DETECTED UPSTREAM RESOLVERS
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-muted)',
                }}
              >
                {dnsResult.dnsServers.length} found
              </span>
            </div>

            {hasDnsServers ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {dnsResult.dnsServers.map((server) => (
                  <div
                    key={server.ip}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 10px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.875rem',
                          color: 'var(--text-primary)',
                          fontWeight: 600,
                        }}
                      >
                        {server.ip}
                      </span>
                      {server.country && (
                        <span
                          className="badge badge-slate"
                          style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}
                        >
                          {server.country}
                        </span>
                      )}
                    </div>
                    {(server.org || server.asn) && (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          marginTop: '3px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={server.org || server.asn}
                      >
                        {server.org || server.asn}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : isTesting ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                  padding: '1rem 0',
                }}
              >
                <RefreshCw size={14} className="spin-anim" />
                <span>Sending 10 parallel nonce queries...</span>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No active DNS servers detected yet.
              </p>
            )}
          </div>

          {/* Diagnostic Conclusion & Summary */}
          <div
            style={{
              background: 'rgba(10, 16, 28, 0.6)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '0.75rem',
                }}
              >
                <Globe size={15} color="var(--accent-cyan)" />
                <span
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                  }}
                >
                  RESOLVER LEAK ASSESSMENT
                </span>
              </div>

              <div
                style={{
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                  color: dnsResult.isLeaking ? 'var(--accent-rose)' : 'var(--text-secondary)',
                }}
              >
                {dnsResult.isLeaking ? (
                  <p>
                    <strong>Warning:</strong> Your DNS queries appear to be resolving through
                    servers located outside your proxy exit path or with divergent providers. Your
                    real network provider or location may be visible.
                  </p>
                ) : hasDnsServers ? (
                  <p>
                    <strong>Clean:</strong> Your DNS requests are handled by consistent upstream
                    resolvers without exposing private local network interfaces.
                  </p>
                ) : (
                  <p style={{ color: 'var(--text-muted)' }}>
                    Awaiting probe results to assess DNS resolver consistency.
                  </p>
                )}
              </div>
            </div>

            <div
              style={{
                marginTop: '1rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
              }}
            >
              Probes utilize one-time random subdomains to bypass recursive DNS caches and capture
              your system's true upstream resolver.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
