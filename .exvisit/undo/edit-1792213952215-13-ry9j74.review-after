import type { StudySession, Task } from '../types';
import { isInWeekOf, startOfWeek } from './dates';

/** A logged session must be at least one minute and no more than a full day. */
export const MAX_SESSION_MINUTES = 1_440;

export type SessionField = 'taskId' | 'minutes';
export type SessionErrors = Partial<Record<SessionField, string>>;

export interface SessionValidationResult {
  ok: boolean;
  errors: SessionErrors;
  /** Present only when `ok` is true. */
  value: { taskId: string; minutes: number } | null;
}

/**
 * Validates a study-session draft against the set of tasks that currently
 * exist, so a session can never reference a task the app does not have.
 */
export function validateSessionDraft(
  draft: { taskId: string; minutes: string },
  tasks: Task[],
): SessionValidationResult {
  const errors: SessionErrors = {};

  const taskId = draft.taskId.trim();
  if (taskId === '') {
    errors.taskId = 'Pick the task you studied.';
  } else if (!tasks.some((task) => task.id === taskId)) {
    errors.taskId = 'That task no longer exists. Pick another one.';
  }

  const raw = draft.minutes.trim();
  let minutes: number | undefined;
  if (raw === '') {
    errors.minutes = 'Enter how many minutes you studied.';
  } else {
    const parsed = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isInteger(parsed)) {
      errors.minutes = 'Minutes must be a whole number.';
    } else if (parsed <= 0) {
      errors.minutes = 'Minutes must be greater than zero.';
    } else if (parsed > MAX_SESSION_MINUTES) {
      errors.minutes = `A single session can be at most ${MAX_SESSION_MINUTES} minutes.`;
    } else {
      minutes = parsed;
    }
  }

  if (Object.keys(errors).length > 0 || taskId === '' || minutes === undefined) {
    return { ok: false, errors, value: null };
  }
  return { ok: true, errors: {}, value: { taskId, minutes } };
}

export function createSession(
  input: { taskId: string; minutes: number },
  now: Date,
  id: string,
): StudySession {
  return {
    id,
    taskId: input.taskId,
    minutes: input.minutes,
    timestamp: now.toISOString(),
  };
}

/** Coerces unknown input into a `StudySession`, dropping invalid references. */
export function sanitizeSession(value: unknown, taskIds: ReadonlySet<string>): StudySession | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;

  if (typeof raw.id !== 'string' || raw.id.trim() === '') return null;
  if (typeof raw.taskId !== 'string' || !taskIds.has(raw.taskId)) return null;
  if (typeof raw.timestamp !== 'string' || Number.isNaN(new Date(raw.timestamp).getTime())) {
    return null;
  }
  if (
    typeof raw.minutes !== 'number' ||
    !Number.isInteger(raw.minutes) ||
    raw.minutes <= 0 ||
    raw.minutes > MAX_SESSION_MINUTES
  ) {
    return null;
  }

  return { id: raw.id, taskId: raw.taskId, minutes: raw.minutes, timestamp: raw.timestamp };
}

/**
 * Total minutes studied in the week containing `now`.
 * Week boundary: Monday 00:00 local → next Monday 00:00 local (see `dates.ts`).
 */
export function weeklyStudyMinutes(sessions: StudySession[], now: Date): number {
  return sessions
    .filter((session) => isInWeekOf(session.timestamp, now))
    .reduce((total, session) => total + session.minutes, 0);
}

/** Minutes per task across all time, keyed by task id. */
export function minutesByTask(sessions: StudySession[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const session of sessions) {
    totals.set(session.taskId, (totals.get(session.taskId) ?? 0) + session.minutes);
  }
  return totals;
}

/** Minutes per task for the week containing `now`. */
export function weeklyMinutesByTask(sessions: StudySession[], now: Date): Map<string, number> {
  return minutesByTask(sessions.filter((session) => isInWeekOf(session.timestamp, now)));
}

/** Sessions that belong to the week containing `now`. */
export function sessionsInWeek(sessions: StudySession[], now: Date): StudySession[] {
  return sessions.filter((session) => isInWeekOf(session.timestamp, now));
}

/**
 * Removes sessions whose task no longer exists. Called after a delete so the
 * store never keeps a dangling reference.
 */
export function pruneOrphanSessions(sessions: StudySession[], tasks: Task[]): {
  sessions: StudySession[];
  removed: number;
} {
  const ids = new Set(tasks.map((task) => task.id));
  const kept = sessions.filter((session) => ids.has(session.taskId));
  return { sessions: kept, removed: sessions.length - kept.length };
}

export interface StudyProgress {
  totalTasks: number;
  completedTasks: number;
  /** 0–100, rounded. `0` when there are no tasks. */
  percentComplete: number;
  weeklyMinutes: number;
  /** Local `YYYY-MM-DD` key of the Monday that starts the current week. */
  weekStartKey: string;
}

/** Derived dashboard numbers. Pure: reads no clock other than `now`. */
export function computeStudyProgress(
  tasks: Task[],
  sessions: StudySession[],
  now: Date,
): StudyProgress {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === 'done').length;
  return {
    totalTasks,
    completedTasks,
    percentComplete: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
    weeklyMinutes: weeklyStudyMinutes(sessions, now),
    weekStartKey: formatWeekStartKey(now),
  };
}

function formatWeekStartKey(now: Date): string {
  const monday = startOfWeek(now);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const d = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
