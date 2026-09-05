import React, { useState } from 'react';
import { Check, Copy, Globe, MapPin, Shield, Wifi, Zap } from 'lucide-react';
import { GeoLocationInfo } from '@my-ip/core';

interface HeroCardProps {
  ipv4?: string;
  ipv6?: string;
  geo?: GeoLocationInfo;
  avgLatency?: number;
  isRefreshing: boolean;
}

export const HeroCard: React.FC<HeroCardProps> = ({
  ipv4,
  ipv6,
  geo,
  avgLatency,
  isRefreshing,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Convert country code to emoji flag (e.g. "US" -> 🇺🇸)
  const getCountryFlag = (code?: string) => {
    if (!code || code.length !== 2) return '🌐';
    const codePoints = code
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  return (
    <div className="glass-card" style={{ padding: '2rem 2.25rem' }}>
      {/* Top row: Status indicators & Network stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="pulse-dot" />
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Network Status: Active
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {avgLatency !== undefined && (
            <div className="badge badge-emerald">
              <Zap size={13} />
              <span>Avg Latency: {avgLatency} ms</span>
            </div>
          )}

          {geo?.colo && (
            <div className="badge badge-cyan">
              <Globe size={13} />
              <span>Edge PoP: {geo.colo}</span>
            </div>
          )}

          {geo?.asn && (
            <div className="badge badge-amber">
              <Shield size={13} />
              <span>{geo.asn}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main IP Display Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* IPv4 Card */}
        <div
          style={{
            background: 'rgba(10, 16, 28, 0.7)',
            padding: '1.25rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.05em' }}>
              PRIMARY IPv4
            </span>
            <span className="badge badge-cyan" style={{ fontSize: '0.6875rem', padding: '1px 7px' }}>
              A Record
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <span className="mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {ipv4 || (isRefreshing ? 'Checking...' : 'Not Detected')}
            </span>

            {ipv4 && (
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => copyToClipboard(ipv4, 'ipv4')}
                title="Copy IPv4"
              >
                {copiedKey === 'ipv4' ? <Check size={16} color="#34d399" /> : <Copy size={16} />}
              </button>
            )}
          </div>
        </div>

        {/* IPv6 Card */}
        <div
          style={{
            background: 'rgba(10, 16, 28, 0.7)',
            padding: '1.25rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a855f7', letterSpacing: '0.05em' }}>
              PRIMARY IPv6
            </span>
            <span
              className={ipv6 ? 'badge badge-emerald' : 'badge badge-amber'}
              style={{ fontSize: '0.6875rem', padding: '1px 7px' }}
            >
              {ipv6 ? 'AAAA Record' : 'No IPv6'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <span
              className="mono"
              style={{
                fontSize: ipv6 ? '1.1rem' : '1.3rem',
                fontWeight: 700,
                color: ipv6 ? 'var(--text-primary)' : 'var(--text-muted)',
                wordBreak: 'break-all',
              }}
            >
              {ipv6 || (isRefreshing ? 'Checking...' : 'No IPv6 Connectivity')}
            </span>

            {ipv6 && (
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => copyToClipboard(ipv6, 'ipv6')}
                title="Copy IPv6"
              >
                {copiedKey === 'ipv6' ? <Check size={16} color="#34d399" /> : <Copy size={16} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Geolocation & ISP Footer Banner */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '1.25rem',
          borderTop: '1px solid var(--border-subtle)',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.75rem' }}>{getCountryFlag(geo?.countryCode)}</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={15} color="var(--accent-cyan)" />
              <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                {[geo?.city, geo?.region, geo?.country].filter(Boolean).join(', ') || 'Resolving location...'}
              </span>
            </div>
            {geo?.timezone && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Timezone: {geo.timezone}
              </span>
            )}
          </div>
        </div>

        {geo?.asOrganization && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Wifi size={17} color="var(--accent-primary)" />
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                Internet Service Provider
              </span>
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                {geo.asOrganization}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
