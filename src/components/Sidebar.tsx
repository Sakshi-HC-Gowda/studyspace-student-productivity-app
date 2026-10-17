import type { ViewKey } from '../types';

export interface NavItem {
  key: ViewKey;
  label: string;
  hint: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'all', label: 'All tasks', hint: 'Every open task' },
  { key: 'today', label: 'Today', hint: 'Due today or overdue' },
  { key: 'upcoming', label: 'Upcoming', hint: 'Future due dates' },
  { key: 'completed', label: 'Completed', hint: 'Finished work' },
  { key: 'plan', label: 'Plan week', hint: 'Optional 7-day proposal' },
];

export interface SidebarProps {
  view: ViewKey;
  counts: Record<ViewKey, number>;
  onSelect: (view: ViewKey) => void;
  storageLabel: string;
  storageWritable: boolean;
  weekLabel: string;
}

/** Persistent navigation plus a plain-language storage status line. */
export function Sidebar({
  view,
  counts,
  onSelect,
  storageLabel,
  storageWritable,
  weekLabel,
}: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Studyspace sections">
      <div className="brand">
        <span className="brand__mark" aria-hidden="true">
          SS
        </span>
        <span className="brand__text">
          <strong className="brand__name">Studyspace</strong>
          <span className="brand__sub">Local-first study tracker</span>
        </span>
      </div>

      <nav className="nav" aria-label="Task views">
        <ul className="nav__list">
          {NAV_ITEMS.map((item) => {
            const active = view === item.key;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  className={active ? 'nav__item is-active' : 'nav__item'}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => onSelect(item.key)}
                >
                  <span className="nav__row">
                    <span className="nav__label">{item.label}</span>
                    <span className="nav__count">{counts[item.key]}</span>
                  </span>
                  <span className="nav__hint">{item.hint}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar__footer">
        <p className="sidebar__week">Week of {weekLabel}</p>
        <p className={storageWritable ? 'storage is-ok' : 'storage is-warn'}>
          <span aria-hidden="true">{storageWritable ? '●' : '▲'}</span> {storageLabel}
        </p>
      </div>
    </aside>
  );
}
