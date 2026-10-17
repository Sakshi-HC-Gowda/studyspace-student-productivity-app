/**
 * Pure calendar helpers.
 *
 * WEEK BOUNDARY (documented once, used everywhere):
 *   A study "week" starts on **Monday at 00:00 local time** and runs for
 *   exactly 7 days (so it ends the following Monday at 00:00 local time).
 *   `startOfWeek()` is the single source of truth for this rule; the weekly
 *   study-time total in `study.ts` only ever calls this function.
 */

/** 0 = Sunday … 6 = Saturday, matching `Date#getDay`. Monday = 1. */
export const WEEK_START_DAY = 1;

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Local `YYYY-MM-DD` key for a date (never UTC — avoids off-by-one days). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses a `YYYY-MM-DD` key into local midnight, or `null` if not a real date. */
export function fromDateKey(key: string): Date | null {
  const match = DATE_KEY_PATTERN.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  // Rejects things like 2026-02-31 which `Date` would silently roll over.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/** True when `value` is a syntactically valid and real local calendar key. */
export function isDateKey(value: string): boolean {
  return fromDateKey(value) !== null;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const next = startOfDay(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Monday 00:00 local time for the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  const offset = (day.getDay() - WEEK_START_DAY + 7) % 7;
  return addDays(day, -offset);
}

/** Exclusive end of the week: the following Monday at 00:00 local time. */
export function endOfWeek(date: Date): Date {
  return addDays(startOfWeek(date), 7);
}

/** True when an ISO timestamp falls inside the week containing `now`. */
export function isInWeekOf(timestamp: string, now: Date): boolean {
  const time = new Date(timestamp).getTime();
  if (Number.isNaN(time)) return false;
  const start = startOfWeek(now).getTime();
  const end = endOfWeek(now).getTime();
  return time >= start && time < end;
}

/** Whole-day difference between two calendar keys (`b - a`). */
export function daysBetweenKeys(a: string, b: string): number {
  const from = fromDateKey(a);
  const to = fromDateKey(b);
  if (!from || !to) return Number.NaN;
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
});

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat(undefined, { weekday: 'short' });

/** Short human label for a calendar key, e.g. `Mar 4`. */
export function formatDateKey(key: string): string {
  const date = fromDateKey(key);
  return date ? DATE_FORMATTER.format(date) : key;
}

/** Short weekday label for a calendar key, e.g. `Mon`. */
export function formatWeekdayKey(key: string): string {
  const date = fromDateKey(key);
  return date ? WEEKDAY_FORMATTER.format(date) : '';
}

/** Human range for the week containing `date`, e.g. `Mar 4 – Mar 10`. */
export function formatWeekRange(date: Date): string {
  const start = startOfWeek(date);
  const end = addDays(start, 6);
  return `${DATE_FORMATTER.format(start)} – ${DATE_FORMATTER.format(end)}`;
}

/** `150` -> `2h 30m`, `45` -> `45m`, `0` -> `0m`. */
export function formatMinutes(minutes: number): string {
  const safe = Number.isFinite(minutes) ? Math.max(0, Math.round(minutes)) : 0;
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}
