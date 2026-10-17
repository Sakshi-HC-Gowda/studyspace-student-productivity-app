import { describe, expect, it } from 'vitest';
import type { StudySession, Task } from '../types';
import {
  computeStudyProgress,
  createSession,
  minutesByTask,
  pruneOrphanSessions,
  sanitizeSession,
  validateSessionDraft,
  weeklyMinutesByTask,
  weeklyStudyMinutes,
} from './study';

const TODAY = new Date(2026, 2, 4, 12, 0); // Wednesday of the week starting 2026-03-02

function session(id: string, taskId: string, minutes: number, timestamp: string): StudySession {
  return { id, taskId, minutes, timestamp };
}

const taskA: Task = {
  id: 'a',
  title: 'A',
  course: 'Maths',
  priority: 'medium',
  status: 'todo',
  createdAt: '2026-03-01T00:00:00.000Z',
};

const taskB: Task = { ...taskA, id: 'b', title: 'B', status: 'done' };

describe('weeklyStudyMinutes', () => {
  it('sums only sessions inside the current Monday-to-Monday week', () => {
    const sessions = [
      session('last-week', 'a', 30, new Date(2026, 2, 1, 23, 59).toISOString()), // Sun before
      session('monday', 'a', 15, new Date(2026, 2, 2, 0, 0).toISOString()),
      session('midweek', 'b', 45, new Date(2026, 2, 4, 9, 0).toISOString()),
      session('sunday', 'b', 20, new Date(2026, 2, 8, 23, 59).toISOString()),
      session('next-monday', 'a', 90, new Date(2026, 2, 9, 0, 0).toISOString()),
    ];
    expect(weeklyStudyMinutes(sessions, TODAY)).toBe(80);
  });

  it('is zero with no sessions', () => {
    expect(weeklyStudyMinutes([], TODAY)).toBe(0);
  });

  it('groups weekly totals per task', () => {
    const sessions = [
      session('s1', 'a', 15, new Date(2026, 2, 3, 9, 0).toISOString()),
      session('s2', 'a', 25, new Date(2026, 2, 4, 9, 0).toISOString()),
      session('s3', 'b', 40, new Date(2026, 2, 5, 9, 0).toISOString()),
      session('old', 'b', 999, new Date(2026, 1, 1, 9, 0).toISOString()),
    ];
    expect([...weeklyMinutesByTask(sessions, TODAY).entries()].sort()).toEqual([
      ['a', 40],
      ['b', 40],
    ]);
    expect(minutesByTask(sessions).get('b')).toBe(1039);
  });
});

describe('validateSessionDraft', () => {
  it('accepts a positive whole number of minutes for a known task', () => {
    const result = validateSessionDraft({ taskId: 'a', minutes: '25' }, [taskA, taskB]);
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ taskId: 'a', minutes: 25 });
  });

  it('rejects a missing, unknown or stale task reference', () => {
    expect(validateSessionDraft({ taskId: '', minutes: '25' }, [taskA]).errors.taskId).toBeDefined();
    expect(validateSessionDraft({ taskId: 'ghost', minutes: '25' }, [taskA]).errors.taskId).toContain(
      'no longer exists',
    );
    expect(validateSessionDraft({ taskId: 'ghost', minutes: '25' }, [taskA]).value).toBeNull();
  });

  it('requires minutes greater than zero', () => {
    const cases: Array<[string, string]> = [
      ['', 'Enter how many minutes'],
      ['0', 'greater than zero'],
      ['-10', 'whole number'],
      ['1.5', 'whole number'],
      ['abc', 'whole number'],
    ];
    for (const [input, expected] of cases) {
      const result = validateSessionDraft({ taskId: 'a', minutes: input }, [taskA]);
      expect(result.errors.minutes).toContain(expected);
    }
  });

  it('caps absurdly long sessions', () => {
    expect(validateSessionDraft({ taskId: 'a', minutes: '5000' }, [taskA]).errors.minutes).toContain('1440');
  });
});

describe('createSession', () => {
  it('stamps the session with the injected clock', () => {
    expect(createSession({ taskId: 'a', minutes: 30 }, TODAY, 's1')).toEqual({
      id: 's1',
      taskId: 'a',
      minutes: 30,
      timestamp: TODAY.toISOString(),
    });
  });
});

describe('sanitizeSession', () => {
  it('keeps valid sessions that reference an existing task', () => {
    const record = session('s1', 'a', 30, '2026-03-04T09:00:00.000Z');
    expect(sanitizeSession(record, new Set(['a']))).toEqual(record);
  });

  it('drops sessions with a dangling task reference', () => {
    expect(sanitizeSession(session('s1', 'ghost', 30, '2026-03-04T09:00:00.000Z'), new Set(['a']))).toBeNull();
  });

  it('drops invalid minutes or timestamps', () => {
    const ids = new Set(['a']);
    expect(sanitizeSession(session('s1', 'a', 0, '2026-03-04T09:00:00.000Z'), ids)).toBeNull();
    expect(sanitizeSession(session('s1', 'a', 2.5, '2026-03-04T09:00:00.000Z'), ids)).toBeNull();
    expect(sanitizeSession(session('s1', 'a', 30, 'whenever'), ids)).toBeNull();
    expect(sanitizeSession({ id: '', taskId: 'a', minutes: 5, timestamp: '2026-03-04T09:00:00.000Z' }, ids)).toBeNull();
  });
});

describe('pruneOrphanSessions', () => {
  it('removes sessions whose task was deleted', () => {
    const result = pruneOrphanSessions(
      [
        session('s1', 'a', 30, '2026-03-04T09:00:00.000Z'),
        session('s2', 'ghost', 30, '2026-03-04T09:00:00.000Z'),
      ],
      [taskA],
    );
    expect(result.removed).toBe(1);
    expect(result.sessions.map((s) => s.id)).toEqual(['s1']);
  });
});

describe('computeStudyProgress', () => {
  it('reports completion percentage and weekly minutes', () => {
    const progress = computeStudyProgress(
      [taskA, taskB, { ...taskA, id: 'c', status: 'inProgress' }],
      [session('s1', 'a', 45, new Date(2026, 2, 4, 9, 0).toISOString())],
      TODAY,
    );
    expect(progress).toEqual({
      totalTasks: 3,
      completedTasks: 1,
      percentComplete: 33,
      weeklyMinutes: 45,
      weekStartKey: '2026-03-02',
    });
  });

  it('handles an empty workspace without dividing by zero', () => {
    const progress = computeStudyProgress([], [], TODAY);
    expect(progress.percentComplete).toBe(0);
    expect(progress.completedTasks).toBe(0);
    expect(progress.weeklyMinutes).toBe(0);
  });
});
