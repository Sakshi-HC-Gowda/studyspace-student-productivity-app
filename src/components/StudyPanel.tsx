import { useState } from 'react';
import type { FormEvent } from 'react';
import type { StudySession, Task } from '../types';
import { formatMinutes } from '../utils/dates';
import { weeklyMinutesByTask, type SessionErrors, type StudyProgress } from '../utils/study';

export interface StudyPanelProps {
  tasks: Task[];
  sessions: StudySession[];
  now: Date;
  progress: StudyProgress;
  /** Human range for the current week, e.g. `Mar 4 – Mar 10`. */
  weekRange: string;
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
  onLogSession: (draft: { taskId: string; minutes: string }) => {
    ok: boolean;
    errors: SessionErrors;
  };
  onAddTask: () => void;
}

/** Weeks are Monday 00:00 → the following Monday 00:00, local time. */
const WEEK_BOUNDARY_NOTE = 'A study week runs Monday 00:00 to Sunday 23:59 local time.';

/**
 * Study progress card: completion bar, current-week total, the per-task
 * breakdown for this week, and the form that logs a session.
 */
export function StudyPanel({
  tasks,
  sessions,
  now,
  progress,
  weekRange,
  selectedTaskId,
  onSelectTask,
  onLogSession,
  onAddTask,
}: StudyPanelProps) {
  const [minutes, setMinutes] = useState('');
  const [errors, setErrors] = useState<SessionErrors>({});

  const hasTasks = tasks.length > 0;
  const knownIds = new Set(tasks.map((task) => task.id));
  // A task that was deleted after it was picked must not stay selected.
  const selectValue = knownIds.has(selectedTaskId) ? selectedTaskId : '';

  const options = tasks
    .slice()
    .sort((a, b) => {
      const aOpen = a.status === 'done' ? 1 : 0;
      const bOpen = b.status === 'done' ? 1 : 0;
      if (aOpen !== bOpen) return aOpen - bOpen;
      return a.title.localeCompare(b.title);
    });

  const weeklyByTask = weeklyMinutesByTask(sessions, now);
  const breakdown = [...weeklyByTask.entries()]
    .filter(([taskId, total]) => total > 0 && knownIds.has(taskId))
    .sort((a, b) => b[1] - a[1]);
  const titleById = new Map(tasks.map((task) => [task.id, task.title]));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = onLogSession({ taskId: selectValue, minutes });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setMinutes('');
  }

  return (
    <section className="card card--study" aria-labelledby="study-heading">
      <div className="card__head">
        <h2 className="card__title" id="study-heading">
          Study progress
        </h2>
        <p className="card__subtitle">
          {formatMinutes(progress.weeklyMinutes)} this week · {weekRange}
        </p>
      </div>

      <div className="progress">
        <div
          className="progress__track"
          role="progressbar"
          aria-label="Task completion"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percentComplete}
          aria-valuetext={`${progress.percentComplete}% of tasks complete`}
        >
          <div className="progress__fill" style={{ width: `${progress.percentComplete}%` }} />
        </div>
        <p className="progress__label">
          {progress.totalTasks === 0
            ? 'No tasks to complete yet.'
            : `${progress.completedTasks} of ${progress.totalTasks} tasks complete · ${progress.percentComplete}%`}
        </p>
      </div>

      <p className="note">{WEEK_BOUNDARY_NOTE}</p>

      {hasTasks ? (
        <form className="session-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="session-task">
              Task you studied
            </label>
            <select
              id="session-task"
              className="input"
              value={selectValue}
              aria-invalid={errors.taskId !== undefined}
              aria-describedby={errors.taskId === undefined ? undefined : 'session-error-task'}
              onChange={(event) => {
                onSelectTask(event.target.value);
                setErrors((current) => ({ ...current, taskId: undefined }));
              }}
            >
              <option value="">Choose a task…</option>
              {options.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title} — {task.course}
                  {task.status === 'done' ? ' (done)' : ''}
                </option>
              ))}
            </select>
            {errors.taskId === undefined ? null : (
              <p className="field__error" id="session-error-task">
                {errors.taskId}
              </p>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="session-minutes">
              Minutes studied
            </label>
            <input
              id="session-minutes"
              className="input"
              type="text"
              inputMode="numeric"
              value={minutes}
              placeholder="e.g. 45"
              aria-invalid={errors.minutes !== undefined}
              aria-describedby={errors.minutes === undefined ? undefined : 'session-error-minutes'}
              onChange={(event) => {
                setMinutes(event.target.value);
                setErrors((current) => ({ ...current, minutes: undefined }));
              }}
            />
            {errors.minutes === undefined ? null : (
              <p className="field__error" id="session-error-minutes">
                {errors.minutes}
              </p>
            )}
          </div>

          <button type="submit" className="button button--primary">
            Log session
          </button>
        </form>
      ) : (
        <div className="inline-empty">
          <p>Add a task first — study time is always logged against a task.</p>
          <button type="button" className="button button--primary" onClick={onAddTask}>
            Add a task
          </button>
        </div>
      )}

      {breakdown.length > 0 ? (
        <div className="breakdown">
          <h3 className="breakdown__title">This week by task</h3>
          <ul className="breakdown__list">
            {breakdown.map(([taskId, total]) => (
              <li key={taskId} className="breakdown__row">
                <span className="breakdown__name">{titleById.get(taskId) ?? 'Unknown task'}</span>
                <span className="breakdown__value">{formatMinutes(total)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="note">No study time logged this week yet.</p>
      )}
    </section>
  );
}
