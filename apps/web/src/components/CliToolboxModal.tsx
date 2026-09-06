import { Check, Copy, Terminal, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

interface CliToolboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  cloudflareUrl?: string;
  currentHost?: string;
}

export const CliToolboxModal: React.FC<CliToolboxModalProps> = ({
  isOpen,
  onClose,
  cloudflareUrl,
  currentHost,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const baseEndpoint =
    cloudflareUrl ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://api.my-ip.info');

  const commands = [
    {
      id: 'curl-ip',
      label: 'Get Plaintext IP (cURL)',
      cmd: `curl -s ${baseEndpoint}/api/v1/ip`,
    },
    {
      id: 'curl-v4',
      label: 'Force IPv4 Only',
      cmd: `curl -4 -s ${baseEndpoint}/api/v1/ip`,
    },
    {
      id: 'curl-v6',
      label: 'Force IPv6 Only',
      cmd: `curl -6 -s ${baseEndpoint}/api/v1/ip`,
    },
    {
      id: 'curl-info',
      label: 'Full Terminal Diagnostics (cURL)',
      cmd: `curl -s ${baseEndpoint}/api/v1/info`,
    },
    {
      id: 'curl-json',
      label: 'Full JSON Intelligence (formatted with jq)',
      cmd: `curl -s -H "Accept: application/json" ${baseEndpoint}/api/v1/info | jq .`,
    },
    {
      id: 'curl-geo',
      label: 'Geolocation & ASN Only',
      cmd: `curl -s ${baseEndpoint}/api/v1/geo | jq .`,
    },
    {
      id: 'curl-yaml',
      label: 'YAML Intelligence',
      cmd: `curl -s ${baseEndpoint}/api/v1/yaml`,
    },
    {
      id: 'powershell',
      label: 'PowerShell (Windows)',
      cmd: `(Invoke-RestMethod -Uri "${baseEndpoint}/api/v1/info").ip`,
    },
  ];

  const copyCmd = (cmd: string, id: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>CLI & Developer Toolbox</h3>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Query your deployed endpoints directly from your command line, CI/CD pipelines, or
            scripts.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {commands.map((item) => (
              <div
                key={item.id}
                style={{
                  background: 'rgba(10, 16, 28, 0.7)',
                  padding: '0.875rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}
                >
                  <span
                    style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}
                  >
                    {item.label}
                  </span>
                  <button
                    className="btn btn-ghost btn-icon"
                    style={{ padding: '4px' }}
                    onClick={() => copyCmd(item.cmd, item.id)}
                    title="Copy command"
                  >
                    {copiedKey === item.id ? (
                      <Check size={14} color="#34d399" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>

                <pre
                  className="mono"
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--accent-cyan)',
                    overflowX: 'auto',
                    margin: 0,
                  }}
                >
                  {item.cmd}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
