import { Check, Clock, Copy, Download, History, Shield, Trash2, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import type { IpHistoryEntry } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEnabled: boolean;
  history: IpHistoryEntry[];
  onSetEnabled: (enabled: boolean) => void;
  onClearHistory: () => void;
  onDeleteEntry: (id: string) => void;
  onRecordCurrentSnapshot?: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  isEnabled,
  history,
  onSetEnabled,
  onClearHistory,
  onDeleteEntry,
  onRecordCurrentSnapshot,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getCountryFlag = (code?: string) => {
    if (!code || code.length !== 2) return '🌐';
    const codePoints = code
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const ms = Date.now() - new Date(isoString).getTime();
      const secs = Math.floor(ms / 1000);
      if (secs < 60) return 'just now';
      const mins = Math.floor(secs / 60);
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return '';
    }
  };

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ip-history-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCsv = () => {
    const headers = ['Timestamp', 'IPv4', 'IPv6', 'Country', 'City', 'ISP'];
    const rows = history.map((entry) => [
      `"${entry.timestamp}"`,
      `"${entry.ipv4 || ''}"`,
      `"${entry.ipv6 || ''}"`,
      `"${entry.country || ''}"`,
      `"${entry.city || ''}"`,
      `"${entry.org || ''}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `ip-history-${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>IP Connection History</h3>
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

        <div className="modal-body">
          {/* Top Toggle & Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '0.875rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <label
              htmlFor="history-toggle"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                id="history-toggle"
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => onSetEnabled(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Record Local IP History
              </span>
              <span
                className="badge badge-emerald"
                style={{ fontSize: '0.6875rem', padding: '1px 6px' }}
              >
                100% On-Device
              </span>
            </label>

            {isEnabled && history.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleExportCsv}
                  title="Export history as CSV"
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  <Download size={13} />
                  <span>CSV</span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleExportJson}
                  title="Export history as JSON"
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  <Download size={13} />
                  <span>JSON</span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={onClearHistory}
                  title="Clear all IP history entries"
                  style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#fb7185' }}
                >
                  <Trash2 size={13} />
                  <span>Clear</span>
                </button>
              </div>
            )}
          </div>

          {/* Body State 1: Disabled */}
          {!isEnabled ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '2rem 1.5rem',
                gap: '1rem',
                background: 'rgba(255, 255, 255, 0.015)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--border-subtle)',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-primary)',
                }}
              >
                <Clock size={24} />
              </div>
              <div>
                <h4
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: '4px',
                  }}
                >
                  Track Public IP Changes Over Time
                </h4>
                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)',
                    maxWidth: '420px',
                    lineHeight: '1.5',
                  }}
                >
                  Keep a timeline of when your public IP address or ISP changes (e.g. traveling,
                  switching Wi-Fi, or toggling VPNs).
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                }}
              >
                <Shield size={14} color="var(--accent-emerald)" />
                <span>
                  Zero server telemetry. All records remain encrypted & local to your device.
                </span>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onSetEnabled(true);
                  if (onRecordCurrentSnapshot) onRecordCurrentSnapshot();
                }}
                style={{ marginTop: '0.5rem' }}
              >
                Enable IP History Tracking
              </button>
            </div>
          ) : history.length === 0 ? (
            /* Body State 2: Enabled but empty */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '2.5rem 1.5rem',
                gap: '0.75rem',
                background: 'rgba(255, 255, 255, 0.015)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--border-subtle)',
              }}
            >
              <Clock size={32} color="var(--text-muted)" />
              <div>
                <h4
                  style={{
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '4px',
                  }}
                >
                  Tracking Active — No Changes Recorded Yet
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '380px' }}>
                  As your network connects or changes, snapshots will be automatically added here
                  (capped at the 50 most recent).
                </p>
              </div>

              {onRecordCurrentSnapshot && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={onRecordCurrentSnapshot}
                  style={{ marginTop: '0.5rem', fontSize: '0.8125rem' }}
                >
                  Record Current IP Snapshot
                </button>
              )}
            </div>
          ) : (
            /* Body State 3: History List */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  padding: '0 4px',
                }}
              >
                <span>Timeline Records ({history.length} / 50)</span>
                {onRecordCurrentSnapshot && (
                  <button
                    type="button"
                    onClick={onRecordCurrentSnapshot}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-cyan)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    + Record Snapshot Now
                  </button>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '380px',
                  overflowY: 'auto',
                  paddingRight: '2px',
                }}
              >
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      padding: '0.875rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(10, 16, 28, 0.65)',
                      border: '1px solid var(--border-subtle)',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      {/* Timestamp Row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {formatDate(entry.timestamp)}
                        </span>
                        <span
                          className="badge badge-indigo"
                          style={{ fontSize: '0.6875rem', padding: '0 5px' }}
                        >
                          {formatRelativeTime(entry.timestamp)}
                        </span>
                      </div>

                      {/* IPs Row */}
                      <div
                        style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '2px' }}
                      >
                        {entry.ipv4 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                color: 'var(--text-muted)',
                              }}
                            >
                              IPv4:
                            </span>
                            <span
                              className="mono"
                              style={{
                                fontSize: '0.8125rem',
                                color: 'var(--accent-cyan)',
                                fontWeight: 600,
                              }}
                            >
                              {entry.ipv4}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                entry.ipv4 && copyToClipboard(entry.ipv4, `ipv4-${entry.id}`)
                              }
                              title="Copy IPv4"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px',
                                color: 'var(--text-muted)',
                              }}
                            >
                              {copiedKey === `ipv4-${entry.id}` ? (
                                <Check size={12} color="#34d399" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        )}

                        {entry.ipv6 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                color: 'var(--text-muted)',
                              }}
                            >
                              IPv6:
                            </span>
                            <span
                              className="mono"
                              style={{
                                fontSize: '0.75rem',
                                color: '#a5b4fc',
                                fontWeight: 500,
                                maxWidth: '240px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={entry.ipv6}
                            >
                              {entry.ipv6}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                entry.ipv6 && copyToClipboard(entry.ipv6, `ipv6-${entry.id}`)
                              }
                              title="Copy IPv6"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px',
                                color: 'var(--text-muted)',
                              }}
                            >
                              {copiedKey === `ipv6-${entry.id}` ? (
                                <Check size={12} color="#34d399" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Location & ISP Row */}
                      {(entry.city || entry.country || entry.org) && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            marginTop: '2px',
                          }}
                        >
                          <span>{getCountryFlag(entry.country)}</span>
                          <span>{[entry.city, entry.country].filter(Boolean).join(', ')}</span>
                          {entry.org && <span>• {entry.org}</span>}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      onClick={() => onDeleteEntry(entry.id)}
                      title="Delete entry"
                      style={{ padding: '4px' }}
                    >
                      <Trash2 size={14} color="#fb7185" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
