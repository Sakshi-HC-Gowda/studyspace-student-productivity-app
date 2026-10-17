import type { EmptyStateAdvice } from '../utils/filters';

export interface EmptyStateProps {
  advice: EmptyStateAdvice;
  actionLabel?: string;
  onAction?: () => void;
}

/** Explains an empty list instead of showing a blank panel. */
export function EmptyState({ advice, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="empty">
      <p className="empty__title">{advice.title}</p>
      <p className="empty__body">{advice.body}</p>
      {actionLabel && onAction ? (
        <button type="button" className="button button--primary" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
