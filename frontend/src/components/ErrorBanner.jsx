/**
 * ErrorBanner — one component for every failure the user should see
 * (Part 2, step 5: display appropriate error messages).
 *
 * variant "error"  → load/action failures, with optional Retry/Dismiss
 * variant "info"   → neutral notices
 */
export default function ErrorBanner({ message, variant = 'error', onRetry, onClose }) {
  if (!message) return null;
  return (
    <div className={`banner banner-${variant}`} role="alert">
      <span className="banner-text">{message}</span>
      <span className="banner-actions">
        {onRetry && (
          <button type="button" className="btn btn-small" onClick={onRetry}>
            Retry
          </button>
        )}
        {onClose && (
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={onClose}
            aria-label="Dismiss message"
          >
            ✕
          </button>
        )}
      </span>
    </div>
  );
}
