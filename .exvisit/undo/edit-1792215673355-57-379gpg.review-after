import { useState } from 'react';
import type { PlanDay, Task } from '../types';
import { formatDateKey, formatMinutes, formatWeekdayKey } from '../utils/dates';
import {
  DAILY_BUDGET_MINUTES,
  movePlanItem,
  planTotals,
  removePlanItem,
  unplannedTasks,
} from '../utils/plan';

export interface PlanViewProps {
  tasks: Task[];
  plan: PlanDay[] | null;
  approved: boolean;
  onGenerate: () => void;
  onChange: (plan: PlanDay[] | null) => void;
  onApprove: () => void;
}

/**
 * The optional week planner. Everything here is a local heuristic — no AI
 * service, no API key, no network call. The proposal is editable and only
 * becomes real data when the user presses `Approve plan`.
 */
export function PlanView({ tasks, plan, approved, onGenerate, onChange, onApprove }: PlanViewProps) {
  const [message, setMessage] = useState<string | null>(null);

  if (plan === null) {
    return (
      <section className="card card--plan" aria-labelledby="plan-heading">
        <h2 className="card__title" id="plan-heading">
          Plan the week
        </h2>
        <p className="card__body">
          Spreads your open tasks across the next seven days, up to{' '}
          {formatMinutes(DAILY_BUDGET_MINUTES)} of study per day, by due date and priority.
        </p>
        <ul className="plan-notes">
          <li>Nothing is saved until you review and approve the proposal.</li>
          <li>Every block can be moved to another day or removed before approving.</li>
          <li>
            This is a local rule-based helper, not an AI service: it runs entirely in your browser and
            needs no API key.
          </li>
        </ul>
        <button type="button" className="button button--primary" onClick={onGenerate}>
          Build a 7-day proposal
        </button>
      </section>
    );
  }

  const totals = planTotals(plan);
  const unplanned = unplannedTasks(tasks, plan);
  const titleById = new Map(tasks.map((task) => [task.id, task.title]));
  const dayOptions = plan.map((day) => day.date);

  function move(taskId: string, fromDate: string, toDate: string) {
    const result = movePlanItem(plan as PlanDay[], taskId, fromDate, toDate);
    if (!result.ok) {
      setMessage(result.reason);
      return;
    }
    setMessage(null);
    onChange(result.plan);
  }

  return (
    <section className="card card--plan" aria-labelledby="plan-heading">
      <div className="card__head">
        <h2 className="card__title" id="plan-heading">
          Proposed 7-day plan
        </h2>
        <p className="card__subtitle">
          {formatMinutes(totals.totalMinutes)} across {totals.blockCount}{' '}
          {totals.blockCount === 1 ? 'block' : 'blocks'}
          {approved ? ' · applied' : ''}
        </p>
      </div>

      <p className="plan-message" role="status" aria-live="polite">
        {message ?? (approved ? 'Plan approved. Due dates were filled in for planned tasks.' : 'Review the proposal before applying it.')}
      </p>

      <ol className="plan-days">
        {plan.map((day) => (
          <li className="plan-day" key={day.date}>
            <p className="plan-day__head">
              <span className="plan-day__name">{formatWeekdayKey(day.date)}</span>
              <span className="plan-day__date">{formatDateKey(day.date)}</span>
              <span className="plan-day__total">{formatMinutes(day.totalMinutes)}</span>
            </p>
            {day.items.length === 0 ? (
              <p className="plan-day__empty">Free</p>
            ) : (
              <ul className="plan-day__items">
                {day.items.map((item) => (
                  <li className="plan-item" key={`${item.date}-${item.taskId}`}>
                    <span className="plan-item__title">
                      {titleById.get(item.taskId) ?? 'Deleted task'}
                    </span>
                    <span className="plan-item__minutes">{formatMinutes(item.minutes)}</span>
                    <span className="field field--inline">
                      <label className="visually-hidden" htmlFor={`move-${item.date}-${item.taskId}`}>
                        Move {titleById.get(item.taskId) ?? 'this block'} to another day
                      </label>
                      <select
                        id={`move-${item.date}-${item.taskId}`}
                        className="input input--compact"
                        value={day.date}
                        onChange={(event) => move(item.taskId, day.date, event.target.value)}
                      >
                        {dayOptions.map((date) => (
                          <option key={date} value={date}>
                            {formatWeekdayKey(date)} {formatDateKey(date)}
                          </option>
                        ))}
                      </select>
                    </span>
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      onClick={() => {
                        setMessage(null);
                        onChange(removePlanItem(plan, item.taskId, day.date));
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>

      {unplanned.length > 0 ? (
        <p className="note note--warn">
          {unplanned.length} {unplanned.length === 1 ? 'task does' : 'tasks do'} not fit in this week:{' '}
          {unplanned.map((task) => task.title).join(', ')}. Raise the daily budget by moving blocks, or
          plan again next week.
        </p>
      ) : (
        <p className="note">Every open task fits inside this week.</p>
      )}

      <div className="plan-actions">
        <button type="button" className="button button--ghost" onClick={onGenerate}>
          Rebuild proposal
        </button>
        <button type="button" className="button button--ghost" onClick={() => onChange(null)}>
          Discard
        </button>
        <button
          type="button"
          className="button button--primary"
          onClick={onApprove}
          disabled={totals.totalMinutes === 0}
        >
          {approved ? 'Approve again' : 'Approve plan'}
        </button>
      </div>
    </section>
  );
}
