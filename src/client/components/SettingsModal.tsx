import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  Play,
  Plus,
  Save,
  Server,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import type { CustomEndpoint } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  endpoints: CustomEndpoint[];
  onSaveEndpoints: (endpoints: CustomEndpoint[]) => void;
  config: {
    cloudflareUrl: string;
  };
  onSaveConfig: (config: { cloudflareUrl: string }) => void;
  onRefreshAll: () => void;
  initialTab?: 'endpoints' | 'backend';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  endpoints,
  onSaveEndpoints,
  config,
  onSaveConfig,
  onRefreshAll,
  initialTab = 'endpoints',
}) => {
  const [activeTab, setActiveTab] = useState<'endpoints' | 'backend'>(initialTab);
  const [cloudflareUrl, setCloudflareUrl] = useState(config.cloudflareUrl);

  // Custom Endpoint Form State
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setCloudflareUrl(config.cloudflareUrl);
      setName('');
      setUrl('');
      setTestStatus('idle');
      setTestMessage(null);
    }
  }, [isOpen, initialTab, config.cloudflareUrl]);

  if (!isOpen) return null;

  const handleSaveConfig = () => {
    onSaveConfig({
      cloudflareUrl: cloudflareUrl.trim(),
    });
    onClose();
    onRefreshAll();
  };

  const testEndpoint = async (targetUrl: string) => {
    if (!targetUrl) return;
    setTestStatus('testing');
    setTestMessage(null);

    const startTime = performance.now();
    try {
      const res = await fetch(targetUrl, { cache: 'no-store' });
      const latency = Math.round(performance.now() - startTime);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        setTestStatus('success');
        setTestMessage(
          `Success! Responded in ${latency}ms. Detected IP: ${data.ip || data.query || 'N/A'}`
        );
      } else {
        const text = (await res.text()).trim();
        setTestStatus('success');
        setTestMessage(`Success! Responded in ${latency}ms. Output: ${text.slice(0, 40)}`);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'CORS blocked or unreachable';
      setTestStatus('error');
      setTestMessage(`Failed: ${errorMessage}`);
    }
  };

  const handleAddEndpoint = () => {
    if (!url.trim()) return;
    let endpointName = name.trim();
    if (!endpointName) {
      try {
        endpointName = new URL(url).hostname;
      } catch {
        endpointName = 'Custom Endpoint';
      }
    }

    const newEndpoint: CustomEndpoint = {
      id: Date.now().toString(),
      name: endpointName,
      url: url.trim(),
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    const updated = [...endpoints, newEndpoint];
    onSaveEndpoints(updated);
    setName('');
    setUrl('');
    setTestStatus('idle');
    setTestMessage(null);
    onRefreshAll();
  };

  const handleDeleteEndpoint = (id: string) => {
    const updated = endpoints.filter((ep) => ep.id !== id);
    onSaveEndpoints(updated);
    onRefreshAll();
  };

  const handleToggleEndpoint = (id: string) => {
    const updated = endpoints.map((ep) => (ep.id === id ? { ...ep, enabled: !ep.enabled } : ep));
    onSaveEndpoints(updated);
    onRefreshAll();
  };

  const activeEndpointsCount = endpoints.filter((ep) => ep.enabled).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Settings & Endpoints</h3>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="modal-tabs">
          <button
            type="button"
            className={`modal-tab ${activeTab === 'endpoints' ? 'active' : ''}`}
            onClick={() => setActiveTab('endpoints')}
          >
            <Server size={15} />
            <span>Custom APIs</span>
            {activeEndpointsCount > 0 && (
              <span
                className="badge badge-cyan"
                style={{ padding: '1px 6px', fontSize: '0.6875rem' }}
              >
                {activeEndpointsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`modal-tab ${activeTab === 'backend' ? 'active' : ''}`}
            onClick={() => setActiveTab('backend')}
          >
            <Cloud size={15} />
            <span>Worker Override</span>
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'endpoints' && (
            <>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Add custom serverless functions, Cloudflare Workers, or external IP APIs to
                cross-validate your IP and latency in real-time.
              </p>

              {/* Add New Endpoint Form */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div className="form-group">
                  <label className="form-label" htmlFor="endpoint-name-input">
                    Endpoint Name / Label
                  </label>
                  <input
                    id="endpoint-name-input"
                    className="form-input"
                    type="text"
                    placeholder="e.g. My Custom Cloudflare Worker"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="endpoint-url-input">
                    Endpoint URL
                  </label>
                  <input
                    id="endpoint-url-input"
                    className="form-input"
                    type="url"
                    placeholder="https://my-ip.example.com/api/v1/info"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>

                {testMessage && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.8125rem',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor:
                        testStatus === 'success'
                          ? 'rgba(16, 185, 129, 0.1)'
                          : 'rgba(244, 63, 94, 0.1)',
                      color: testStatus === 'success' ? '#34d399' : '#fb7185',
                      border: `1px solid ${
                        testStatus === 'success'
                          ? 'rgba(16, 185, 129, 0.2)'
                          : 'rgba(244, 63, 94, 0.2)'
                      }`,
                    }}
                  >
                    {testStatus === 'success' ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <AlertCircle size={16} />
                    )}
                    <span>{testMessage}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => testEndpoint(url)}
                    disabled={!url.trim() || testStatus === 'testing'}
                  >
                    <Play size={14} />
                    <span>{testStatus === 'testing' ? 'Testing...' : 'Test URL'}</span>
                  </button>

                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={handleAddEndpoint}
                    disabled={!url.trim()}
                  >
                    <Plus size={15} />
                    <span>Add Endpoint</span>
                  </button>
                </div>
              </div>

              {/* List of Custom Endpoints */}
              <div>
                <h4
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '0.75rem',
                  }}
                >
                  Configured Endpoints ({endpoints.length})
                </h4>

                {endpoints.length === 0 ? (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    No custom endpoints added yet. Add one above to test!
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {endpoints.map((ep) => (
                      <div
                        key={ep.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem 1rem',
                          background: 'rgba(10, 16, 28, 0.6)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={ep.enabled}
                            onChange={() => handleToggleEndpoint(ep.id)}
                            style={{ cursor: 'pointer' }}
                          />
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                color: 'var(--text-primary)',
                              }}
                            >
                              {ep.name}
                            </div>
                            <div
                              className="mono"
                              style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
                            >
                              {ep.url}
                            </div>
                          </div>
                        </div>

                        <button
                          className="btn btn-ghost btn-icon"
                          onClick={() => handleDeleteEndpoint(ep.id)}
                          title="Delete endpoint"
                          type="button"
                        >
                          <Trash2 size={15} color="#fb7185" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'backend' && (
            <>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                By default, my-ip-info queries its own unified Worker at{' '}
                <code className="mono">/api/v1/info</code>. You can optionally specify a custom or
                remote Worker URL here to override or test.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Cloud size={15} color="#38bdf8" />
                    <label className="form-label" htmlFor="cloudflare-worker-url">
                      Cloudflare Worker URL
                    </label>
                  </div>
                  <input
                    id="cloudflare-worker-url"
                    className="form-input"
                    type="url"
                    placeholder="https://my-ip-info.your-subdomain.workers.dev"
                    value={cloudflareUrl}
                    onChange={(e) => setCloudflareUrl(e.target.value)}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  marginTop: '0.5rem',
                }}
              >
                <button className="btn btn-ghost" onClick={onClose} type="button">
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleSaveConfig} type="button">
                  <Save size={15} />
                  <span>Save & Update</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
