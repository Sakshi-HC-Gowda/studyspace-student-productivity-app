import type { ReactNode } from 'react';

export interface BannerProps {
  level: 'info' | 'warning' | 'error';
  title: string;
  children: ReactNode;
  onDismiss?: () => void;
  actions?: ReactNode;
}

/** Announced region for storage problems and repair notes. */
export function Banner({ level, title, children, onDismiss, actions }: BannerProps) {
  return (
    <div
      className={`banner banner--${level}`}
      role={level === 'error' ? 'alert' : 'status'}
      aria-live={level === 'error' ? 'assertive' : 'polite'}
    >
      <div className="banner__text">
        <p className="banner__title">{title}</p>
        <div className="banner__body">{children}</div>
      </div>
      <div className="banner__actions">
        {actions}
        {onDismiss ? (
          <button type="button" className="button button--ghost button--small" onClick={onDismiss}>
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}
