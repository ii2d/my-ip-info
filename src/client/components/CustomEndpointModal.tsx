import { AlertCircle, CheckCircle2, Play, Plus, Server, Trash2, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import type { CustomEndpoint } from '../types';

interface CustomEndpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  endpoints: CustomEndpoint[];
  onSaveEndpoints: (endpoints: CustomEndpoint[]) => void;
  onRefreshAll: () => void;
}

export const CustomEndpointModal: React.FC<CustomEndpointModalProps> = ({
  isOpen,
  onClose,
  endpoints,
  onSaveEndpoints,
  onRefreshAll,
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);

  if (!isOpen) return null;

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
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(`Failed: ${err.message || 'CORS blocked or unreachable'}`);
    }
  };

  const handleAdd = () => {
    if (!url.trim()) return;
    const newEndpoint: CustomEndpoint = {
      id: Date.now().toString(),
      name: name.trim() || new URL(url).hostname,
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

  const handleDelete = (id: string) => {
    const updated = endpoints.filter((ep) => ep.id !== id);
    onSaveEndpoints(updated);
    onRefreshAll();
  };

  const handleToggle = (id: string) => {
    const updated = endpoints.map((ep) => (ep.id === id ? { ...ep, enabled: !ep.enabled } : ep));
    onSaveEndpoints(updated);
    onRefreshAll();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              Custom API & Serverless Endpoints
            </h3>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Add your own deployed Cloudflare Worker, AWS Lambda, Firebase Function, or external IP
            service to cross-validate in real-time.
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
              <label className="form-label">Endpoint Name / Label</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. My Custom Cloudflare Worker"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Endpoint URL</label>
              <input
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
                    testStatus === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                  color: testStatus === 'success' ? '#34d399' : '#fb7185',
                  border: `1px solid ${
                    testStatus === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'
                  }`,
                }}
              >
                {testStatus === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
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
                onClick={handleAdd}
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
              Active Endpoints ({endpoints.length})
            </h4>

            {endpoints.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                No custom endpoints added yet. Add one above or deploy your own serverless backend!
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
                        onChange={() => handleToggle(ep.id)}
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
                      onClick={() => handleDelete(ep.id)}
                      title="Delete endpoint"
                    >
                      <Trash2 size={15} color="#fb7185" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
