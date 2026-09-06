import React, { useState } from 'react';
import { Save, Settings, X, Cloud } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: {
    cloudflareUrl: string;
  };
  onSaveConfig: (config: { cloudflareUrl: string }) => void;
  onRefreshAll: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onRefreshAll,
}) => {
  const [cloudflareUrl, setCloudflareUrl] = useState(config.cloudflareUrl);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig({
      cloudflareUrl: cloudflareUrl.trim(),
    });
    onClose();
    onRefreshAll();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              Backend Endpoint Configuration
            </h3>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Configure your self-hosted Cloudflare Worker URL. This can also be populated automatically via <code className="mono">pnpm deploy:all</code> into <code className="mono">apps/web/.env.local</code>.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Cloudflare Worker */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cloud size={15} color="#38bdf8" />
                <label className="form-label">Cloudflare Worker URL</label>
              </div>
              <input
                className="form-input"
                type="url"
                placeholder="https://my-ip-info.your-subdomain.workers.dev"
                value={cloudflareUrl}
                onChange={(e) => setCloudflareUrl(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              <Save size={15} />
              <span>Save & Update</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
