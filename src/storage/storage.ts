import type { AppData, StudySession, Task } from '../types';
import { sanitizeTask } from '../utils/tasks';
import { sanitizeSession } from '../utils/study';

/**
 * Versioned localStorage persistence.
 *
 * Key:      `studyspace:data`
 * Envelope: `{ version: 1, tasks: Task[], sessions: StudySession[] }`
 *
 * Rules that this module guarantees:
 *  - Missing data is an empty, non-error state.
 *  - A malformed / unreadable / future-version payload is *never overwritten*
 *    with defaults. The caller receives `status: 'unreadable'` and the raw text
 *    is copied to `studyspace:data.backup` on a best-effort basis.
 *  - Individual bad records are dropped and reported (`status: 'repaired'`),
 *    while every valid record is kept.
 *  - Study sessions pointing at a task that no longer exists are dropped, so a
 *    dangling task reference can never be retained.
 *  - Every read/write is wrapped: storage can throw (Safari private mode,
 *    disabled cookies, quota), and the app must stay usable either way.
 */

export const STORAGE_KEY = 'studyspace:data';
export const BACKUP_KEY = 'studyspace:data.backup';
export const STORAGE_VERSION = 1;

/** Unversioned keys from earlier prototypes, read once and migrated forward. */
export const LEGACY_KEYS = ['studyspace:tasks', 'studyspace.v0'] as const;

export type LoadStatus =
  | 'empty'
  | 'loaded'
  | 'repaired'
  | 'legacy-migrated'
  /** Stored text exists but cannot be trusted; storage writes are blocked. */
  | 'unreadable';

export interface LoadResult {
  status: LoadStatus;
  data: AppData;
  /** Human-readable notes (dropped records, backup location, …). */
  issues: string[];
  /** True when the caller should immediately persist the sanitised data. */
  shouldRewrite: boolean;
}

export interface WriteResult {
  ok: boolean;
  error?: string;
}

function emptyData(): AppData {
  return { tasks: [], sessions: [] };
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/**
 * Parses and sanitises a stored payload. Pure — `raw` in, result out — which is
 * what makes it straightforward to unit test.
 */
export function parseStoredState(raw: string | null): LoadResult {
  if (raw === null || raw.trim() === '') {
    return { status: 'empty', data: emptyData(), issues: [], shouldRewrite: false };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      status: 'unreadable',
      data: emptyData(),
      issues: [
        'Saved data could not be read as JSON. It has been left untouched and copied to a backup key.',
      ],
      shouldRewrite: false,
    };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      status: 'unreadable',
      data: emptyData(),
      issues: [
        'Saved data has an unexpected shape. It has been left untouched and copied to a backup key.',
      ],
      shouldRewrite: false,
    };
  }

  const envelope = parsed as Record<string, unknown>;
  const version = envelope.version;

  if (typeof version === 'number' && version > STORAGE_VERSION) {
    return {
      status: 'unreadable',
      data: emptyData(),
      issues: [
        `Saved data was written by a newer version of Studyspace (v${version}). ` +
          'It has been left untouched so nothing is lost.',
      ],
      shouldRewrite: false,
    };
  }

  // No `version` field but a plausible shape: treat as the pre-versioning
  // format (v0) and migrate it forward.
  const isLegacyShape = typeof version !== 'number' && 'tasks' in envelope;
  const effectiveVersion = typeof version === 'number' ? version : isLegacyShape ? 0 : Number.NaN;

  if (!Number.isFinite(effectiveVersion)) {
    return {
      status: 'unreadable',
      data: emptyData(),
      issues: [
        'Saved data is missing its version marker. It has been left untouched and copied to a backup key.',
      ],
      shouldRewrite: false,
    };
  }

  const issues: string[] = [];
  const rawTasks = Array.isArray(envelope.tasks) ? envelope.tasks : [];
  const rawSessions = Array.isArray(envelope.sessions) ? envelope.sessions : [];

  if (!Array.isArray(envelope.tasks)) {
    issues.push('No valid task list was found in saved data; starting with an empty list.');
  }

  const tasks: Task[] = [];
  const seenTaskIds = new Set<string>();
  let droppedTasks = 0;
  for (const candidate of rawTasks) {
    const task = sanitizeTask(candidate);
    if (!task || seenTaskIds.has(task.id)) {
      droppedTasks += 1;
      continue;
    }
    seenTaskIds.add(task.id);
    tasks.push(task);
  }

  // Sessions are validated *against the surviving tasks*, which is what keeps
  // dangling task references out of the store.
  const sessions: StudySession[] = [];
  const seenSessionIds = new Set<string>();
  let droppedSessions = 0;
  for (const candidate of rawSessions) {
    const session = sanitizeSession(candidate, seenTaskIds);
    if (!session || seenSessionIds.has(session.id)) {
      droppedSessions += 1;
      continue;
    }
    seenSessionIds.add(session.id);
    sessions.push(session);
  }

  if (droppedTasks > 0) {
    issues.push(
      `${droppedTasks} saved task${droppedTasks === 1 ? '' : 's'} could not be read and ${
        droppedTasks === 1 ? 'was' : 'were'
      } skipped.`,
    );
  }
  if (droppedSessions > 0) {
    issues.push(
      `${droppedSessions} saved study session${droppedSessions === 1 ? '' : 's'} pointed at a missing task or had invalid minutes and ${
        droppedSessions === 1 ? 'was' : 'were'
      } skipped.`,
    );
  }

  if (effectiveVersion < STORAGE_VERSION) {
    issues.unshift(`Saved data was migrated from format v${effectiveVersion} to v${STORAGE_VERSION}.`);
    return { status: 'legacy-migrated', data: { tasks, sessions }, issues, shouldRewrite: true };
  }

  if (droppedTasks > 0 || droppedSessions > 0 || !Array.isArray(envelope.tasks)) {
    return { status: 'repaired', data: { tasks, sessions }, issues, shouldRewrite: true };
  }

  return { status: 'loaded', data: { tasks, sessions }, issues, shouldRewrite: false };
}

function safeGetItem(key: string): { ok: true; value: string | null } | { ok: false; error: string } {
  try {
    return { ok: true, value: window.localStorage.getItem(key) };
  } catch (error) {
    return { ok: false, error: describeStorageError(error) };
  }
}

function safeSetItem(key: string, value: string): WriteResult {
  try {
    window.localStorage.setItem(key, value);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: describeStorageError(error) };
  }
}

/**
 * Reads the app state from localStorage, falling back to legacy keys and
 * finally to an empty state. Never throws.
 */
export function loadState(): LoadResult & { readError?: string } {
  const primary = safeGetItem(STORAGE_KEY);
  if (!primary.ok) {
    return {
      status: 'empty',
      data: emptyData(),
      issues: [],
      shouldRewrite: false,
      readError: primary.error,
    };
  }

  const result = parseStoredState(primary.value);

  if (result.status === 'unreadable' && primary.value !== null) {
    // Keep a copy of what we could not read. The primary key is untouched, so
    // the user can still recover by hand or reset deliberately.
    const backup = safeSetItem(BACKUP_KEY, primary.value);
    if (backup.ok) {
      result.issues.push(`A copy of the unreadable data is kept at "${BACKUP_KEY}".`);
    }
  }

  if (result.status === 'empty') {
    for (const legacyKey of LEGACY_KEYS) {
      const legacy = safeGetItem(legacyKey);
      if (!legacy.ok || legacy.value === null) continue;
      const migrated = parseStoredState(
        JSON.stringify({ version: 0, tasks: tryParseTaskList(legacy.value), sessions: [] }),
      );
      migrated.issues.unshift(`Imported tasks from the older storage key "${legacyKey}".`);
      migrated.status = 'legacy-migrated';
      migrated.shouldRewrite = true;
      return migrated;
    }
  }

  return result;
}

function tryParseTaskList(raw: string): unknown[] {
  try {
    const value: unknown = JSON.parse(raw);
    if (Array.isArray(value)) return value;
    if (typeof value === 'object' && value !== null) {
      const record = value as Record<string, unknown>;
      return Array.isArray(record.tasks) ? record.tasks : [];
    }
    return [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

/** Serialises state into the versioned envelope. Pure. */
export function serializeState(data: AppData): string {
  return JSON.stringify({ version: STORAGE_VERSION, tasks: data.tasks, sessions: data.sessions });
}

export function saveState(data: AppData): WriteResult {
  return safeSetItem(STORAGE_KEY, serializeState(data));
}

/** Deliberately wipes stored data. Used only from an explicit user action. */
export function clearState(): WriteResult {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: describeStorageError(error) };
  }
}

/** Turns a thrown storage error into a message a student can act on. */
export function describeStorageError(error: unknown): string {
  const name = error instanceof DOMException || error instanceof Error ? error.name : '';
  if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
    return 'Browser storage is full, so the latest change could not be saved. Delete a few tasks or study sessions to free space.';
  }
  if (name === 'SecurityError') {
    return 'Browser storage is blocked (private browsing or blocked cookies), so changes are kept in memory for this tab only.';
  }
  return 'Browser storage is unavailable, so changes are kept in memory for this tab only.';
}

/** True when localStorage is actually usable in this browser session. */
export function isStorageAvailable(): boolean {
  try {
    const probe = '__studyspace_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
