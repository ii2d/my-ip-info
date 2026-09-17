import { AlertCircle, ChevronRight, RefreshCw, WifiOff, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import type { ProviderResult } from '../types';

interface ErrorBannerProps {
  failedResults: ProviderResult[];
  isAllFailed: boolean;
  isRefreshing: boolean;
  onRetryFailed: () => void;
  onViewDetails?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  failedResults,
  isAllFailed,
  isRefreshing,
  onRetryFailed,
  onViewDetails,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [previousFailCount, setPreviousFailCount] = useState(failedResults.length);

  // Re-show banner if new failures occur
  useEffect(() => {
    if (failedResults.length !== previousFailCount) {
      setIsDismissed(false);
      setPreviousFailCount(failedResults.length);
    }
  }, [failedResults.length, previousFailCount]);

  if (failedResults.length === 0 || isDismissed) {
    return null;
  }

  const failedNames = failedResults.map((r) => r.providerName).slice(0, 3);
  const remainingCount = failedResults.length - failedNames.length;
  const failedSummary =
    failedNames.join(', ') + (remainingCount > 0 ? ` +${remainingCount} more` : '');

  return (
    <div
      className="glass-card"
      style={{
        marginBottom: '1.25rem',
        padding: '0.875rem 1.25rem',
        border: isAllFailed
          ? '1px solid rgba(244, 63, 94, 0.4)'
          : '1px solid rgba(245, 158, 11, 0.35)',
        background: isAllFailed ? 'rgba(244, 63, 94, 0.08)' : 'rgba(245, 158, 11, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.875rem',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '240px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: isAllFailed ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: isAllFailed ? 'var(--accent-rose)' : 'var(--accent-amber)',
            flexShrink: 0,
          }}
        >
          {isAllFailed ? <WifiOff size={17} /> : <AlertCircle size={17} />}
        </div>

        <div>
          <div
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: isAllFailed ? 'var(--accent-rose)' : '#fef08a',
            }}
          >
            {isAllFailed
              ? 'All IP detection services failed to respond'
              : `${failedResults.length} IP provider${failedResults.length > 1 ? 's' : ''} failed to respond`}
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              marginTop: '1px',
            }}
          >
            {isAllFailed
              ? 'Please check your internet connection or proxy settings.'
              : `Affected: ${failedSummary}. You may be blocked by ad-blocker, CORS, or experiencing timeout.`}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onRetryFailed}
          disabled={isRefreshing}
          style={{
            padding: '5px 12px',
            fontSize: '0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <RefreshCw
            size={13}
            style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }}
          />
          <span>{isAllFailed ? 'Retry All' : 'Retry Failed'}</span>
        </button>

        {onViewDetails && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onViewDetails}
            style={{
              padding: '5px 10px',
              fontSize: '0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: 'var(--text-secondary)',
            }}
          >
            <span>View Errors</span>
            <ChevronRight size={13} />
          </button>
        )}

        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={() => setIsDismissed(true)}
          style={{ width: '28px', height: '28px', padding: 0 }}
          title="Dismiss banner"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
