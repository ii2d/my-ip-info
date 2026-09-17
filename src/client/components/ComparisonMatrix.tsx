import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Layers,
  ListFilter,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import type { ProviderResult } from '../types';
import { groupResultsByIp } from '../utils/grouping';

interface ComparisonMatrixProps {
  results: ProviderResult[];
  onRetryProvider?: (providerId: string) => void;
  onRetryAllFailed?: () => void;
  isRefreshing?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const SKELETON_KEYS = ['sk-1', 'sk-2', 'sk-3'];

export const ComparisonMatrix: React.FC<ComparisonMatrixProps> = ({
  results,
  onRetryProvider,
  onRetryAllFailed,
  isRefreshing = false,
  isExpanded = true,
  onToggleExpand,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [expandedIps, setExpandedIps] = useState<Record<string, boolean>>({});

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleExpandIp = (ip: string) => {
    setExpandedIps((prev) => ({
      ...prev,
      [ip]: prev[ip] === undefined ? false : !prev[ip], // default is expanded
    }));
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
    if (ms === undefined || ms === 0) return <span style={{ color: 'var(--text-muted)' }}>-</span>;
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

  // Grouping logic by IP
  const { groups, failedProviders, totalSuccessful } = useMemo(
    () => groupResultsByIp(results),
    [results]
  );

  return (
    <div
      id="comparison-matrix-card"
      className="glass-card"
      style={{ padding: 'clamp(1.1rem, 3vw, 1.75rem)' }}
    >
      {/* Header with View Mode Toggle */}
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
            <Layers size={18} color="var(--accent-primary)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Multi-Source Cross-Validation</h2>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Real-time consensus verification across edge functions, serverless backends, and public
            APIs.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Status Chips */}
          {results.length > 0 && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <span className="badge badge-emerald">{totalSuccessful} Verified</span>
              {failedProviders.length > 0 && (
                <span className="badge badge-rose">{failedProviders.length} Failed</span>
              )}
            </div>
          )}

          {/* Grouped vs Flat toggle (only shown when expanded) */}
          {isExpanded && (
            <div
              style={{
                display: 'flex',
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                style={{
                  background: viewMode === 'grouped' ? 'var(--accent-primary)' : 'transparent',
                  color: viewMode === 'grouped' ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Layers size={13} />
                <span>Group by IP</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('flat')}
                style={{
                  background: viewMode === 'flat' ? 'var(--accent-primary)' : 'transparent',
                  color: viewMode === 'flat' ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <ListFilter size={13} />
                <span>All Sources</span>
              </button>
            </div>
          )}

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

      {isExpanded && (
        <>
          {/* Loading Skeleton */}
          {results.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {SKELETON_KEYS.map((key) => (
                <div
                  key={key}
                  className="skeleton"
                  style={{ height: '72px', borderRadius: 'var(--radius-md)' }}
                />
              ))}
            </div>
          )}

          {/* VIEW MODE 1: GROUPED BY IP CONSENSUS */}
          {viewMode === 'grouped' && results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {groups.map((group) => {
                const isExpanded = expandedIps[group.ip] !== false; // default true
                const isSingleSource = group.providers.length === 1;

                return (
                  <div
                    key={group.ip}
                    style={{
                      background: 'rgba(10, 16, 28, 0.65)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      overflow: 'hidden',
                      transition: 'border-color var(--transition-fast)',
                    }}
                  >
                    {/* Group Summary Header */}
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* Left: IP, Version, Copy & Consensus Chip */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          flexWrap: 'wrap',
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <span
                          className="mono"
                          style={{
                            fontSize: 'clamp(0.9375rem, 2.5vw, 1.0625rem)',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            wordBreak: 'break-all',
                          }}
                        >
                          {group.ip}
                        </span>

                        {group.version && (
                          <span
                            className={
                              group.version === 'IPv6' ? 'badge badge-cyan' : 'badge badge-emerald'
                            }
                            style={{ fontSize: '0.6875rem', padding: '1px 6px', flexShrink: 0 }}
                          >
                            {group.version}
                          </span>
                        )}

                        <button
                          type="button"
                          className="btn btn-ghost btn-icon"
                          onClick={() => copyText(group.ip, group.ip)}
                          style={{ width: '26px', height: '26px', padding: 0, flexShrink: 0 }}
                          title="Copy IP"
                        >
                          {copiedKey === group.ip ? (
                            <Check size={14} color="#34d399" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>

                        {/* Consensus Status Chip */}
                        <span
                          className={isSingleSource ? 'badge badge-amber' : 'badge badge-emerald'}
                          style={{
                            fontSize: '0.6875rem',
                            padding: '2px 7px',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {isSingleSource ? (
                            <ShieldAlert size={11} style={{ marginRight: '3px' }} />
                          ) : (
                            <ShieldCheck size={11} style={{ marginRight: '3px' }} />
                          )}
                          {group.providers.length}{' '}
                          {group.providers.length > 1 ? 'Verified' : 'Single Source'}
                        </span>
                      </div>

                      {/* Right: Latency & Toggle Chevron */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.625rem',
                          flexShrink: 0,
                        }}
                      >
                        {group.avgLatency > 0 && (
                          <div style={{ fontSize: '0.75rem' }}>
                            {getLatencyBadge(group.avgLatency)}
                          </div>
                        )}

                        {group.geoSummary && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-secondary)',
                              display: 'none',
                              ...(typeof window !== 'undefined' && window.innerWidth > 768
                                ? { display: 'inline-block' }
                                : {}),
                            }}
                          >
                            {group.geoSummary}
                          </span>
                        )}

                        <button
                          type="button"
                          className="btn btn-ghost btn-icon"
                          onClick={() => toggleExpandIp(group.ip)}
                          aria-expanded={isExpanded}
                          aria-label={
                            isExpanded ? 'Collapse source details' : 'Expand source details'
                          }
                          style={{ width: '28px', height: '28px', padding: 0 }}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Providers Sub-list */}
                    {isExpanded && (
                      <div
                        style={{
                          padding: '0.75rem 1.25rem',
                          borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                        }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
                            gap: '0.625rem',
                          }}
                        >
                          {group.providers.map((p) => (
                            <div
                              key={p.providerId}
                              style={{
                                background: 'rgba(255, 255, 255, 0.02)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '8px 12px',
                                border: '1px solid var(--border-subtle)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                  {p.providerName}
                                </span>
                                <div>{getCategoryBadge(p.category)}</div>
                              </div>
                              <div>{getLatencyBadge(p.latencyMs)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Failed / Unreachable Providers Group */}
              {failedProviders.length > 0 && (
                <div
                  style={{
                    background: 'rgba(244, 63, 94, 0.04)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(244, 63, 94, 0.25)',
                    overflow: 'hidden',
                    marginTop: '0.5rem',
                  }}
                >
                  <div
                    style={{
                      padding: '0.875rem 1.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(244, 63, 94, 0.08)',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <WifiOff size={16} color="var(--accent-rose)" />
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.9375rem',
                          color: 'var(--accent-rose)',
                        }}
                      >
                        Unreachable / Failed Sources ({failedProviders.length})
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        (Ad-blockers, CORS policy, or network timeouts)
                      </span>
                    </div>

                    {onRetryAllFailed && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={onRetryAllFailed}
                        disabled={isRefreshing}
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <RefreshCw
                          size={12}
                          style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }}
                        />
                        <span>Retry All Failed</span>
                      </button>
                    )}
                  </div>

                  <div
                    style={{
                      padding: '0.75rem 1.25rem',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                      gap: '0.625rem',
                    }}
                  >
                    {failedProviders.map((p) => (
                      <div
                        key={p.providerId}
                        style={{
                          background: 'rgba(10, 16, 28, 0.7)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '8px 12px',
                          border: '1px solid rgba(244, 63, 94, 0.15)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                              {p.providerName}
                            </span>
                            {getCategoryBadge(p.category)}
                          </div>
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: '#fb7185',
                              marginTop: '2px',
                            }}
                          >
                            {p.errorMessage || 'Failed to reach API'}
                          </div>
                        </div>

                        {onRetryProvider && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon"
                            onClick={() => onRetryProvider(p.providerId)}
                            disabled={isRefreshing}
                            style={{ width: '28px', height: '28px', padding: 0 }}
                            title={`Retry ${p.providerName}`}
                          >
                            <RefreshCw size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW MODE 2: FLAT TABLE / CARDS (Power User View) */}
          {viewMode === 'flat' && results.length > 0 && (
            <>
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
                    {results.map((result) => {
                      const isCopied = copiedKey === result.providerId;

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

                          <td style={{ padding: '1rem' }}>
                            {result.version ? (
                              <span
                                className={
                                  result.version === 'IPv6'
                                    ? 'badge badge-cyan'
                                    : 'badge badge-emerald'
                                }
                                style={{ fontSize: '0.6875rem' }}
                              >
                                {result.version}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>-</span>
                            )}
                          </td>

                          <td style={{ padding: '1rem' }}>
                            {result.status === 'loading' ? (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                                ...
                              </span>
                            ) : (
                              getLatencyBadge(result.latencyMs)
                            )}
                          </td>

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

                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            {result.ip ? (
                              <button
                                type="button"
                                className="btn btn-ghost btn-icon"
                                onClick={() => result.ip && copyText(result.ip, result.providerId)}
                                title="Copy IP"
                              >
                                {isCopied ? (
                                  <Check size={15} color="#34d399" />
                                ) : (
                                  <Copy size={15} />
                                )}
                              </button>
                            ) : result.status === 'error' && onRetryProvider ? (
                              <button
                                type="button"
                                className="btn btn-ghost btn-icon"
                                onClick={() => onRetryProvider(result.providerId)}
                                title="Retry provider"
                              >
                                <RefreshCw size={14} />
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Stack View */}
              <div className="comparison-cards-view">
                {results.map((result) => {
                  const isCopied = copiedKey === result.providerId;

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
                                  result.version === 'IPv6'
                                    ? 'badge badge-cyan'
                                    : 'badge badge-emerald'
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
                            type="button"
                            className="btn btn-ghost btn-icon"
                            onClick={() => result.ip && copyText(result.ip, result.providerId)}
                            title="Copy IP"
                            style={{ flexShrink: 0 }}
                          >
                            {isCopied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                          </button>
                        )}
                      </div>

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
            </>
          )}
        </>
      )}
    </div>
  );
};
