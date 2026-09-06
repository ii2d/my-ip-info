import { Check, Copy, ExternalLink, ShieldAlert, ShieldCheck, WifiOff } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import type { ProviderResult } from '../types';

interface ComparisonMatrixProps {
  results: ProviderResult[];
  isInitialLoading?: boolean;
}

const SKELETON_ROW_KEYS = ['sk-row-1', 'sk-row-2', 'sk-row-3', 'sk-row-4'];
const SKELETON_CARD_KEYS = ['sk-card-1', 'sk-card-2', 'sk-card-3'];

export const ComparisonMatrix: React.FC<ComparisonMatrixProps> = ({
  results,
  isInitialLoading = false,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyIp = (ip: string, id: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCategoryBadge = (category: ProviderResult['category']) => {
    switch (category) {
      case 'self-hosted':
        return <span className="badge badge-emerald">⚡ Edge / Serverless</span>;
      case 'custom':
        return <span className="badge badge-cyan">🔧 Custom API</span>;
      default:
        return <span className="badge badge-amber">🌐 Public API</span>;
    }
  };

  const getLatencyBadge = (ms?: number) => {
    if (ms === undefined) return <span style={{ color: 'var(--text-muted)' }}>-</span>;
    let color = '#34d399'; // green
    if (ms > 100 && ms <= 300)
      color = '#38bdf8'; // cyan
    else if (ms > 300) color = '#fbbf24'; // amber

    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <span
          style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color }}
        />
        <span className="mono" style={{ fontSize: '0.8125rem', color }}>
          {ms} ms
        </span>
      </div>
    );
  };

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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Multi-Source Comparison Grid</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Real-time cross-validation across edge functions, serverless backends, and public APIs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {isInitialLoading ? (
            <div
              className="skeleton"
              style={{ width: '95px', height: '22px', borderRadius: 'var(--radius-full)' }}
            />
          ) : (
            <>
              <span className="badge badge-emerald">
                {results.filter((r) => r.status === 'success').length} Responded
              </span>
              {results.some((r) => r.status === 'error') && (
                <span className="badge badge-rose">
                  {results.filter((r) => r.status === 'error').length} Failed
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="comparison-table-view">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <th style={{ padding: '0.75rem 1rem' }}>Source / Provider</th>
              <th style={{ padding: '0.75rem 1rem' }}>Detected IP</th>
              <th style={{ padding: '0.75rem 1rem' }}>Type</th>
              <th style={{ padding: '0.75rem 1rem' }}>Latency</th>
              <th style={{ padding: '0.75rem 1rem' }}>Organization / Geo</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isInitialLoading
              ? SKELETON_ROW_KEYS.map((rowKey) => (
                  <tr key={rowKey} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div
                        className="skeleton"
                        style={{ width: '130px', height: '16px', marginBottom: '6px' }}
                      />
                      <div
                        className="skeleton"
                        style={{
                          width: '80px',
                          height: '12px',
                          borderRadius: 'var(--radius-full)',
                        }}
                      />
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div className="skeleton" style={{ width: '140px', height: '16px' }} />
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div
                        className="skeleton"
                        style={{
                          width: '45px',
                          height: '18px',
                          borderRadius: 'var(--radius-full)',
                        }}
                      />
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div className="skeleton" style={{ width: '60px', height: '16px' }} />
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div
                        className="skeleton"
                        style={{ width: '150px', height: '16px', marginBottom: '4px' }}
                      />
                      <div className="skeleton" style={{ width: '100px', height: '12px' }} />
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div
                        className="skeleton"
                        style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)' }}
                      />
                    </td>
                  </tr>
                ))
              : results.map((result) => {
                  const isCopied = copiedId === result.providerId;

                  return (
                    <tr
                      key={result.providerId}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background var(--transition-fast)',
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')
                      }
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Provider Name & Category */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: '0.9375rem',
                              color: 'var(--text-primary)',
                            }}
                          >
                            {result.providerName}
                          </span>
                          <div>{getCategoryBadge(result.category)}</div>
                        </div>
                      </td>

                      {/* Detected IP */}
                      <td style={{ padding: '1rem' }}>
                        {result.status === 'loading' ? (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            Querying...
                          </span>
                        ) : result.status === 'error' ? (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: '#fb7185',
                              fontSize: '0.8125rem',
                            }}
                          >
                            <WifiOff size={14} />
                            <span>{result.errorMessage || 'Failed'}</span>
                          </div>
                        ) : (
                          <span
                            className="mono"
                            style={{
                              fontSize: '0.9375rem',
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                            }}
                          >
                            {result.ip}
                          </span>
                        )}
                      </td>

                      {/* IP Version */}
                      <td style={{ padding: '1rem' }}>
                        {result.version ? (
                          <span
                            className={
                              result.version === 'IPv6' ? 'badge badge-cyan' : 'badge badge-emerald'
                            }
                            style={{ fontSize: '0.6875rem' }}
                          >
                            {result.version}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>

                      {/* Latency */}
                      <td style={{ padding: '1rem' }}>
                        {result.status === 'loading' ? (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                            ...
                          </span>
                        ) : (
                          getLatencyBadge(result.latencyMs)
                        )}
                      </td>

                      {/* Organization & Location */}
                      <td style={{ padding: '1rem' }}>
                        {result.geo ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span
                              style={{
                                fontSize: '0.8125rem',
                                fontWeight: 500,
                                color: 'var(--text-primary)',
                              }}
                            >
                              {[result.geo.city, result.geo.country].filter(Boolean).join(', ')}
                            </span>
                            {result.geo.asOrganization && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {result.geo.asOrganization}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                            IP Only
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        {result.ip && (
                          <button
                            className="btn btn-ghost btn-icon"
                            onClick={() => copyIp(result.ip!, result.providerId)}
                            title="Copy IP"
                          >
                            {isCopied ? <Check size={15} color="#34d399" /> : <Copy size={15} />}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Stack View */}
      <div className="comparison-cards-view">
        {isInitialLoading
          ? SKELETON_CARD_KEYS.map((cardKey) => (
              <div key={cardKey} className="comparison-card-item">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div className="skeleton" style={{ width: '120px', height: '18px' }} />
                  <div
                    className="skeleton"
                    style={{ width: '90px', height: '18px', borderRadius: 'var(--radius-full)' }}
                  />
                </div>
                <div
                  className="skeleton"
                  style={{ width: '100%', height: '42px', borderRadius: 'var(--radius-sm)' }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div className="skeleton" style={{ width: '60px', height: '14px' }} />
                  <div className="skeleton" style={{ width: '110px', height: '14px' }} />
                </div>
              </div>
            ))
          : results.map((result) => {
              const isCopied = copiedId === result.providerId;

              return (
                <div key={result.providerId} className="comparison-card-item">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.9375rem',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {result.providerName}
                    </span>
                    {getCategoryBadge(result.category)}
                  </div>

                  {/* Detected IP + Copy */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(255, 255, 255, 0.02)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {result.status === 'loading' ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        Querying...
                      </span>
                    ) : result.status === 'error' ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#fb7185',
                          fontSize: '0.8125rem',
                        }}
                      >
                        <WifiOff size={14} />
                        <span>{result.errorMessage || 'Failed'}</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          className="mono"
                          style={{
                            fontSize: '0.9375rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            wordBreak: 'break-all',
                          }}
                        >
                          {result.ip}
                        </span>
                        {result.version && (
                          <span
                            className={
                              result.version === 'IPv6' ? 'badge badge-cyan' : 'badge badge-emerald'
                            }
                            style={{ fontSize: '0.625rem', padding: '1px 5px' }}
                          >
                            {result.version}
                          </span>
                        )}
                      </div>
                    )}

                    {result.ip && (
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => copyIp(result.ip!, result.providerId)}
                        title="Copy IP"
                        style={{ flexShrink: 0 }}
                      >
                        {isCopied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                      </button>
                    )}
                  </div>

                  {/* Latency & Location Footer */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <div>{getLatencyBadge(result.latencyMs)}</div>
                    {result.geo ? (
                      <span>
                        {[result.geo.city, result.geo.country].filter(Boolean).join(', ')}
                      </span>
                    ) : (
                      <span>IP Only</span>
                    )}
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
};
