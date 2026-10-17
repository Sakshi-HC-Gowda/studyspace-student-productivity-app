export interface SummaryCardsProps {
  total: number;
  open: number;
  completed: number;
  dueToday: number;
  overdue: number;
  percentComplete: number;
  weeklyMinutes: string;
  weekRange: string;
}

interface Card {
  key: string;
  label: string;
  value: string;
  hint: string;
  tone?: 'accent' | 'warn';
}

/** The four derived numbers a student checks first. */
export function SummaryCards({
  total,
  open,
  completed,
  dueToday,
  overdue,
  percentComplete,
  weeklyMinutes,
  weekRange,
}: SummaryCardsProps) {
  const cards: Card[] = [
    {
      key: 'total',
      label: 'Tasks tracked',
      value: String(total),
      hint: total === 1 ? '1 task in total' : `${open} still open`,
      tone: 'accent',
    },
    {
      key: 'completed',
      label: 'Completed',
      value: String(completed),
      hint: total === 0 ? 'No tasks yet' : `${percentComplete}% of all tasks`,
    },
    {
      key: 'today',
      label: 'Due today',
      value: String(dueToday),
      hint: overdue > 0 ? `${overdue} overdue` : 'Nothing overdue',
      tone: overdue > 0 ? 'warn' : undefined,
    },
    {
      key: 'week',
      label: 'Study time this week',
      value: weeklyMinutes,
      hint: weekRange,
      tone: 'accent',
    },
  ];

  return (
    <ul className="summary-grid">
      {cards.map((card) => (
        <li key={card.key} className={card.tone === undefined ? 'stat' : `stat is-${card.tone}`}>
          <p className="stat__label">{card.label}</p>
          <p className="stat__value">{card.value}</p>
          <p className="stat__hint">{card.hint}</p>
        </li>
      ))}
    </ul>
  );
}
