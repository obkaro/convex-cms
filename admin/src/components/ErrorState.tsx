import type { ReactNode } from 'react';

interface ErrorStateProps {
  /** The error to display */
  error: Error | string | null | undefined;
  /** Optional title for the error (defaults to "Something went wrong") */
  title?: string;
  /** Optional retry handler - shows a retry button when provided */
  onRetry?: () => void;
  /** Whether a retry is currently in progress */
  isRetrying?: boolean;
  /** Optional custom icon */
  icon?: ReactNode;
  /** Optional additional CSS class */
  className?: string;
}

/**
 * ErrorState displays a full-page or section error state with
 * an icon, message, and optional retry button.
 *
 * Usage:
 * ```tsx
 * if (error) {
 *   return <ErrorState error={error} onRetry={() => refetch()} />
 * }
 * ```
 */
export function ErrorState({
  error,
  title = 'Something went wrong',
  onRetry,
  isRetrying = false,
  icon,
  className = '',
}: ErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : error ?? 'An unexpected error occurred';

  return (
    <div className={`error-state ${className}`} role="alert" data-testid="error-state">
      <div className="error-state-icon">
        {icon ?? (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )}
      </div>
      <h3 className="error-state-title">{title}</h3>
      <p className="error-state-message">{errorMessage}</p>
      {onRetry && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={onRetry}
          disabled={isRetrying}
          data-testid="error-retry-button"
        >
          {isRetrying ? 'Retrying...' : 'Try Again'}
        </button>
      )}
    </div>
  );
}

interface ErrorAlertProps {
  /** The error to display */
  error: Error | string | null | undefined;
  /** Optional dismiss handler - shows a dismiss button when provided */
  onDismiss?: () => void;
  /** Optional retry handler - shows a retry button when provided */
  onRetry?: () => void;
  /** Whether a retry is currently in progress */
  isRetrying?: boolean;
  /** Variant of the alert (default: 'error') */
  variant?: 'error' | 'warning';
  /** Optional additional CSS class */
  className?: string;
}

/**
 * ErrorAlert displays an inline error alert with optional dismiss/retry actions.
 *
 * Usage:
 * ```tsx
 * {error && <ErrorAlert error={error} onDismiss={() => setError(null)} />}
 * ```
 */
export function ErrorAlert({
  error,
  onDismiss,
  onRetry,
  isRetrying = false,
  variant = 'error',
  className = '',
}: ErrorAlertProps) {
  if (!error) return null;

  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <div
      className={`error-alert error-alert--${variant} ${className}`}
      role="alert"
      data-testid="error-alert"
    >
      <div className="error-alert-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div className="error-alert-content">
        <p className="error-alert-message">{errorMessage}</p>
      </div>
      <div className="error-alert-actions">
        {onRetry && (
          <button
            type="button"
            className="error-alert-btn error-alert-btn--retry"
            onClick={onRetry}
            disabled={isRetrying}
            data-testid="error-alert-retry"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            className="error-alert-btn error-alert-btn--dismiss"
            onClick={onDismiss}
            aria-label="Dismiss error"
            data-testid="error-alert-dismiss"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
