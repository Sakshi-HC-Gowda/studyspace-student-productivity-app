import type { Priority, Task, TaskDraft, TaskInput } from '../types';
import { daysBetweenKeys, isDateKey, toDateKey } from './dates';

export const GENERAL_COURSE = 'General';
export const MAX_TITLE_LENGTH = 120;
export const MAX_COURSE_LENGTH = 60;
export const MIN_ESTIMATE_MINUTES = 1;
/** One week of minutes — a generous but sane upper bound for an estimate. */
export const MAX_ESTIMATE_MINUTES = 10_080;

export const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const STATUS_LABEL: Record<Task['status'], string> = {
  todo: 'To do',
  inProgress: 'In progress',
  done: 'Done',
};

export type TaskField = 'title' | 'course' | 'dueDate' | 'estimatedMinutes';
export type TaskErrors = Partial<Record<TaskField, string>>;

export interface TaskValidationResult {
  ok: boolean;
  errors: TaskErrors;
  /** Present only when `ok` is true. */
  value: TaskInput | null;
}

export function emptyDraft(): TaskDraft {
  return {
    title: '',
    course: '',
    dueDate: '',
    priority: 'medium',
    estimatedMinutes: '',
    status: 'todo',
  };
}

export function draftFromTask(task: Task): TaskDraft {
  return {
    title: task.title,
    course: task.course === GENERAL_COURSE ? '' : task.course,
    dueDate: task.dueDate ?? '',
    priority: task.priority,
    estimatedMinutes: task.estimatedMinutes === undefined ? '' : String(task.estimatedMinutes),
    status: task.status,
  };
}

/**
 * Validates the raw form draft. Pure: no DOM, no storage, no `Date.now()`.
 * `today` is injected so tests can pin "today" for due-date rules.
 */
export function validateTaskDraft(draft: TaskDraft, today: Date): TaskValidationResult {
  const errors: TaskErrors = {};

  const title = draft.title.trim();
  if (title.length === 0) {
    errors.title = 'Give the task a title.';
  } else if (title.length > MAX_TITLE_LENGTH) {
    errors.title = `Keep the title under ${MAX_TITLE_LENGTH} characters.`;
  }

  const course = draft.course.trim();
  if (course.length > MAX_COURSE_LENGTH) {
    errors.course = `Keep the course under ${MAX_COURSE_LENGTH} characters.`;
  }

  const dueDate = draft.dueDate.trim();
  if (dueDate !== '' && !isDateKey(dueDate)) {
    errors.dueDate = 'Use a real date in YYYY-MM-DD format.';
  }

  const estimateRaw = draft.estimatedMinutes.trim();
  let estimatedMinutes: number | undefined;
  if (estimateRaw !== '') {
    const parsed = Number(estimateRaw);
    if (!/^\d+$/.test(estimateRaw) || !Number.isInteger(parsed)) {
      errors.estimatedMinutes = 'Estimate must be a whole number of minutes.';
    } else if (parsed < MIN_ESTIMATE_MINUTES) {
      errors.estimatedMinutes = 'Estimate must be at least 1 minute.';
    } else if (parsed > MAX_ESTIMATE_MINUTES) {
      errors.estimatedMinutes = `Estimate must be ${MAX_ESTIMATE_MINUTES} minutes or less.`;
    } else {
      estimatedMinutes = parsed;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, value: null };
  }

  const value: TaskInput = {
    title,
    course: course === '' ? GENERAL_COURSE : course,
    priority: draft.priority,
    status: draft.status,
  };
  if (dueDate !== '') value.dueDate = dueDate;
  if (estimatedMinutes !== undefined) value.estimatedMinutes = estimatedMinutes;
  // `today` is accepted for signature stability with date-aware rules.
  void today;

  return { ok: true, errors: {}, value };
}

/** Builds a brand-new task from validated input. */
export function createTask(input: TaskInput, now: Date, id: string): Task {
  const task: Task = {
    id,
    title: input.title,
    course: input.course,
    priority: input.priority,
    status: input.status,
    createdAt: now.toISOString(),
  };
  if (input.dueDate !== undefined) task.dueDate = input.dueDate;
  if (input.estimatedMinutes !== undefined) task.estimatedMinutes = input.estimatedMinutes;
  return task;
}

/** Applies validated input onto an existing task, preserving `id`/`createdAt`. */
export function applyTaskInput(task: Task, input: TaskInput): Task {
  const next: Task = {
    id: task.id,
    title: input.title,
    course: input.course,
    priority: input.priority,
    status: input.status,
    createdAt: task.createdAt,
  };
  if (input.dueDate !== undefined) next.dueDate = input.dueDate;
  if (input.estimatedMinutes !== undefined) next.estimatedMinutes = input.estimatedMinutes;
  return next;
}

const PRIORITIES: readonly Priority[] = ['low', 'medium', 'high'];
const STATUSES: readonly Task['status'][] = ['todo', 'inProgress', 'done'];

export function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && (PRIORITIES as readonly string[]).includes(value);
}

export function isStatus(value: unknown): value is Task['status'] {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value);
}

/**
 * Coerces unknown input (e.g. parsed localStorage JSON) into a `Task`, or
 * returns `null` when the record cannot be trusted. Used by the storage layer
 * so a single bad record never discards the rest of the data.
 */
export function sanitizeTask(value: unknown): Task | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;

  if (typeof raw.id !== 'string' || raw.id.trim() === '') return null;
  if (typeof raw.title !== 'string' || raw.title.trim() === '') return null;
  if (typeof raw.createdAt !== 'string' || Number.isNaN(new Date(raw.createdAt).getTime())) {
    return null;
  }

  const task: Task = {
    id: raw.id,
    title: raw.title.trim().slice(0, MAX_TITLE_LENGTH),
    course:
      typeof raw.course === 'string' && raw.course.trim() !== ''
        ? raw.course.trim().slice(0, MAX_COURSE_LENGTH)
        : GENERAL_COURSE,
    priority: isPriority(raw.priority) ? raw.priority : 'medium',
    status: isStatus(raw.status) ? raw.status : 'todo',
    createdAt: raw.createdAt,
  };

  if (typeof raw.dueDate === 'string' && isDateKey(raw.dueDate)) {
    task.dueDate = raw.dueDate;
  }
  if (
    typeof raw.estimatedMinutes === 'number' &&
    Number.isInteger(raw.estimatedMinutes) &&
    raw.estimatedMinutes >= MIN_ESTIMATE_MINUTES &&
    raw.estimatedMinutes <= MAX_ESTIMATE_MINUTES
  ) {
    task.estimatedMinutes = raw.estimatedMinutes;
  }

  return task;
}

/** True when the task is not completed and its due date is before today. */
export function isOverdue(task: Task, now: Date): boolean {
  if (task.status === 'done' || task.dueDate === undefined) return false;
  return task.dueDate < toDateKey(now);
}

/** True when the task is due exactly today (or overdue — see `isOverdue`). */
export function isDueToday(task: Task, now: Date): boolean {
  return task.dueDate === toDateKey(now) && task.status !== 'done';
}

/**
 * Ordering for active (not done) work: earliest due date first, tasks without a
 * due date last, then priority (high → low), then creation time, then title.
 */
export function compareTasks(a: Task, b: Task): number {
  const aDue = a.dueDate;
  const bDue = b.dueDate;
  if (aDue !== bDue) {
    if (aDue === undefined) return 1;
    if (bDue === undefined) return -1;
    if (aDue !== bDue) return aDue < bDue ? -1 : 1;
  }
  if (a.priority !== b.priority) return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  const byCreated = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  if (byCreated !== 0 && Number.isFinite(byCreated)) return byCreated;
  return a.title.localeCompare(b.title);
}

export function compareByNewestFirst(a: Task, b: Task): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export type DueGroupKey = 'overdue' | 'today' | 'tomorrow' | 'thisWeek' | 'later' | 'noDate';

export interface DueGroup {
  key: DueGroupKey;
  label: string;
  tasks: Task[];
}

const DUE_GROUP_LABEL: Record<DueGroupKey, string> = {
  overdue: 'Overdue',
  today: 'Today',
  tomorrow: 'Tomorrow',
  thisWeek: 'This week',
  later: 'Later',
  noDate: 'No due date',
};

const DUE_GROUP_ORDER: readonly DueGroupKey[] = [
  'overdue',
  'today',
  'tomorrow',
  'thisWeek',
  'later',
  'noDate',
];

/** Buckets tasks by due date relative to `now`; empty buckets are omitted. */
export function groupByDueDate(tasks: Task[], now: Date): DueGroup[] {
  const buckets = new Map<DueGroupKey, Task[]>();
  const todayKey = toDateKey(now);

  for (const task of tasks) {
    let key: DueGroupKey;
    if (task.dueDate === undefined) {
      key = 'noDate';
    } else if (isOverdue(task, now)) {
      key = 'overdue';
    } else {
      const delta = daysBetweenKeys(todayKey, task.dueDate);
      if (delta <= 0) key = 'today';
      else if (delta === 1) key = 'tomorrow';
      else if (delta <= 7) key = 'thisWeek';
      else key = 'later';
    }
    const bucket = buckets.get(key);
    if (bucket) bucket.push(task);
    else buckets.set(key, [task]);
  }

  return DUE_GROUP_ORDER.filter((key) => buckets.has(key)).map((key) => ({
    key,
    label: DUE_GROUP_LABEL[key],
    tasks: (buckets.get(key) ?? []).slice().sort(compareTasks),
  }));
}

/** Distinct, alphabetically sorted course names. */
export function collectCourses(tasks: Task[]): string[] {
  const set = new Set<string>();
  for (const task of tasks) set.add(task.course);
  return [...set].sort((a, b) => a.localeCompare(b));
}
