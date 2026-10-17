export type Priority = 'low' | 'medium' | 'high';
export type Status = 'todo' | 'inProgress' | 'done';

/** Which top-level list the dashboard is showing. */
export type ViewKey = 'all' | 'today' | 'upcoming' | 'completed' | 'plan';

/**
 * A single study task. All date-only fields are stored as local calendar keys
 * (`YYYY-MM-DD`) so a task never shifts day because of a timezone offset.
 */
export interface Task {
  id: string;
  title: string;
  /** Course / subject label. Falls back to `GENERAL_COURSE` when left blank. */
  course: string;
  /** Optional due date as a local calendar key `YYYY-MM-DD`. */
  dueDate?: string;
  priority: Priority;
  /** Optional estimate in whole minutes (>= 1). */
  estimatedMinutes?: number;
  status: Status;
  /** ISO-8601 timestamp of creation. */
  createdAt: string;
}

/** A logged block of study time, always attached to an existing task. */
export interface StudySession {
  id: string;
  taskId: string;
  /** Whole minutes, >= 1. */
  minutes: number;
  /** ISO-8601 timestamp of when the session was logged. */
  timestamp: string;
}

/** Everything that is persisted to localStorage. */
export interface AppData {
  tasks: Task[];
  sessions: StudySession[];
}

/** Raw (string-based) form state for the create/edit task form. */
export interface TaskDraft {
  title: string;
  course: string;
  /** `''` means "no due date". */
  dueDate: string;
  priority: Priority;
  /** `''` means "no estimate". */
  estimatedMinutes: string;
  status: Status;
}

/** Validated, normalised values ready to be stored on a `Task`. */
export interface TaskInput {
  title: string;
  course: string;
  dueDate?: string;
  priority: Priority;
  estimatedMinutes?: number;
  status: Status;
}

/** A proposed slot in the optional seven-day study plan. */
export interface PlanItem {
  /** Local calendar key `YYYY-MM-DD`. */
  date: string;
  taskId: string;
  minutes: number;
}

export interface PlanDay {
  date: string;
  items: PlanItem[];
  totalMinutes: number;
}
