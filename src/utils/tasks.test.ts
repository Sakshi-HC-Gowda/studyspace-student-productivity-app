import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import {
  GENERAL_COURSE,
  applyTaskInput,
  collectCourses,
  compareTasks,
  createTask,
  draftFromTask,
  emptyDraft,
  groupByDueDate,
  isDueToday,
  isOverdue,
  sanitizeTask,
  validateTaskDraft,
} from './tasks';

const TODAY = new Date(2026, 2, 4, 10, 0); // Wed 2026-03-04

function task(overrides: Partial<Task> & { id: string }): Task {
  return {
    title: `Task ${overrides.id}`,
    course: 'Biology',
    priority: 'medium',
    status: 'todo',
    createdAt: '2026-03-01T08:00:00.000Z',
    ...overrides,
  };
}

describe('validateTaskDraft', () => {
  it('accepts a minimal valid task and leaves optional fields off', () => {
    const result = validateTaskDraft({ ...emptyDraft(), title: 'Read chapter 4' }, TODAY);
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({
      title: 'Read chapter 4',
      course: GENERAL_COURSE,
      priority: 'medium',
      status: 'todo',
    });
    expect(result.value && 'dueDate' in result.value).toBe(false);
    expect(result.value && 'estimatedMinutes' in result.value).toBe(false);
  });

  it('trims the title and rejects a blank one', () => {
    expect(validateTaskDraft({ ...emptyDraft(), title: '   ' }, TODAY).errors.title).toBeDefined();
    const ok = validateTaskDraft({ ...emptyDraft(), title: '  Lab report  ' }, TODAY);
    expect(ok.value?.title).toBe('Lab report');
  });

  it('rejects an over-long title', () => {
    const result = validateTaskDraft({ ...emptyDraft(), title: 'x'.repeat(121) }, TODAY);
    expect(result.ok).toBe(false);
    expect(result.errors.title).toContain('120');
  });

  it('keeps a supplied course and falls back to General when blank', () => {
    expect(validateTaskDraft({ ...emptyDraft(), title: 'a', course: ' Chemistry ' }, TODAY).value?.course).toBe(
      'Chemistry',
    );
    expect(validateTaskDraft({ ...emptyDraft(), title: 'a', course: '' }, TODAY).value?.course).toBe(
      GENERAL_COURSE,
    );
  });

  it('validates the optional due date', () => {
    expect(validateTaskDraft({ ...emptyDraft(), title: 'a', dueDate: '2026-03-09' }, TODAY).value?.dueDate).toBe(
      '2026-03-09',
    );
    expect(validateTaskDraft({ ...emptyDraft(), title: 'a', dueDate: '2026-02-31' }, TODAY).errors.dueDate).toBeDefined();
    expect(validateTaskDraft({ ...emptyDraft(), title: 'a', dueDate: 'someday' }, TODAY).errors.dueDate).toBeDefined();
  });

  it('validates numeric estimates', () => {
    const cases: Array<[string, string | undefined]> = [
      ['90', undefined],
      ['0', 'at least 1 minute'],
      ['-5', 'whole number'],
      ['2.5', 'whole number'],
      ['abc', 'whole number'],
      ['20000', 'or less'],
    ];
    for (const [input, expected] of cases) {
      const result = validateTaskDraft({ ...emptyDraft(), title: 'a', estimatedMinutes: input }, TODAY);
      if (expected === undefined) {
        expect(result.ok).toBe(true);
        expect(result.value?.estimatedMinutes).toBe(Number(input));
      } else {
        expect(result.ok).toBe(false);
        expect(result.errors.estimatedMinutes).toContain(expected);
      }
    }
  });

  it('reports every problem at once', () => {
    const result = validateTaskDraft({ ...emptyDraft(), title: '', estimatedMinutes: 'x' }, TODAY);
    expect(Object.keys(result.errors).sort()).toEqual(['estimatedMinutes', 'title']);
    expect(result.value).toBeNull();
  });
});

describe('createTask / applyTaskInput', () => {
  it('creates a task with the given id and creation timestamp', () => {
    const input = validateTaskDraft({ ...emptyDraft(), title: 'Essay', course: 'History', priority: 'high' }, TODAY)
      .value;
    const created = createTask(input!, TODAY, 'task-1');
    expect(created).toEqual({
      id: 'task-1',
      title: 'Essay',
      course: 'History',
      priority: 'high',
      status: 'todo',
      createdAt: TODAY.toISOString(),
    });
  });

  it('edits a task without changing id or creation time, and clears cleared optional fields', () => {
    const original = task({ id: 't1', dueDate: '2026-03-09', estimatedMinutes: 60 });
    const input = validateTaskDraft(
      { ...emptyDraft(), title: 'Renamed', course: 'Maths', priority: 'low' },
      TODAY,
    ).value;
    const edited = applyTaskInput(original, input!);
    expect(edited.id).toBe('t1');
    expect(edited.createdAt).toBe(original.createdAt);
    expect(edited.title).toBe('Renamed');
    expect(edited.course).toBe('Maths');
    expect('dueDate' in edited).toBe(false);
    expect('estimatedMinutes' in edited).toBe(false);
  });

  it('round-trips a task through a draft', () => {
    const original = task({ id: 't2', course: GENERAL_COURSE, dueDate: '2026-03-09', estimatedMinutes: 45 });
    const draft = draftFromTask(original);
    expect(draft).toEqual({
      title: 'Task t2',
      course: '',
      dueDate: '2026-03-09',
      priority: 'medium',
      estimatedMinutes: '45',
      status: 'todo',
    });
    expect(applyTaskInput(original, validateTaskDraft(draft, TODAY).value!)).toEqual(original);
  });
});

describe('due-date state', () => {
  it('flags overdue open tasks only', () => {
    expect(isOverdue(task({ id: 'a', dueDate: '2026-03-03' }), TODAY)).toBe(true);
    expect(isOverdue(task({ id: 'b', dueDate: '2026-03-04' }), TODAY)).toBe(false);
    expect(isOverdue(task({ id: 'c', dueDate: '2026-03-03', status: 'done' }), TODAY)).toBe(false);
    expect(isOverdue(task({ id: 'd' }), TODAY)).toBe(false);
  });

  it('flags tasks due today only while they are open', () => {
    expect(isDueToday(task({ id: 'a', dueDate: '2026-03-04' }), TODAY)).toBe(true);
    expect(isDueToday(task({ id: 'b', dueDate: '2026-03-04', status: 'done' }), TODAY)).toBe(false);
    expect(isDueToday(task({ id: 'c', dueDate: '2026-03-05' }), TODAY)).toBe(false);
  });
});

describe('compareTasks', () => {
  it('sorts by due date, then priority, then creation date', () => {
    const tasks = [
      task({ id: 'no-date-low', priority: 'low' }),
      task({ id: 'later-high', dueDate: '2026-03-20', priority: 'high' }),
      task({ id: 'soon-low', dueDate: '2026-03-06', priority: 'low' }),
      task({ id: 'soon-high', dueDate: '2026-03-06', priority: 'high' }),
      task({ id: 'no-date-high', priority: 'high' }),
    ];
    expect(tasks.slice().sort(compareTasks).map((t) => t.id)).toEqual([
      'soon-high',
      'soon-low',
      'later-high',
      'no-date-high',
      'no-date-low',
    ]);
  });

  it('breaks remaining ties by creation time', () => {
    const older = task({ id: 'older', dueDate: '2026-03-06', createdAt: '2026-02-01T00:00:00.000Z' });
    const newer = task({ id: 'newer', dueDate: '2026-03-06', createdAt: '2026-02-02T00:00:00.000Z' });
    expect([newer, older].sort(compareTasks).map((t) => t.id)).toEqual(['older', 'newer']);
  });
});

describe('groupByDueDate', () => {
  it('buckets tasks and omits empty groups', () => {
    const groups = groupByDueDate(
      [
        task({ id: 'overdue', dueDate: '2026-03-01' }),
        task({ id: 'today', dueDate: '2026-03-04' }),
        task({ id: 'tomorrow', dueDate: '2026-03-05' }),
        task({ id: 'thisWeek', dueDate: '2026-03-08' }),
        task({ id: 'later', dueDate: '2026-03-30' }),
        task({ id: 'none' }),
      ],
      TODAY,
    );
    expect(groups.map((g) => [g.key, g.tasks.map((t) => t.id)])).toEqual([
      ['overdue', ['overdue']],
      ['today', ['today']],
      ['tomorrow', ['tomorrow']],
      ['thisWeek', ['thisWeek']],
      ['later', ['later']],
      ['noDate', ['none']],
    ]);
  });

  it('returns nothing for an empty list', () => {
    expect(groupByDueDate([], TODAY)).toEqual([]);
  });

  it('orders tasks inside a group', () => {
    const groups = groupByDueDate(
      [
        task({ id: 'today-low', dueDate: '2026-03-04', priority: 'low' }),
        task({ id: 'today-high', dueDate: '2026-03-04', priority: 'high' }),
      ],
      TODAY,
    );
    expect(groups[0]?.tasks.map((t) => t.id)).toEqual(['today-high', 'today-low']);
  });
});

describe('sanitizeTask', () => {
  it('keeps a well-formed record', () => {
    const record = task({ id: 'ok', dueDate: '2026-03-09', estimatedMinutes: 30 });
    expect(sanitizeTask(record)).toEqual(record);
  });

  it('fills in defaults for soft problems', () => {
    const result = sanitizeTask({
      id: 'soft',
      title: '  Trim me  ',
      createdAt: '2026-03-01T08:00:00.000Z',
      priority: 'urgent',
      status: 'paused',
      dueDate: 'not-a-date',
      estimatedMinutes: -4,
    });
    expect(result).toEqual({
      id: 'soft',
      title: 'Trim me',
      course: GENERAL_COURSE,
      priority: 'medium',
      status: 'todo',
      createdAt: '2026-03-01T08:00:00.000Z',
    });
  });

  it('rejects records without id, title or a valid creation time', () => {
    expect(sanitizeTask(null)).toBeNull();
    expect(sanitizeTask('nope')).toBeNull();
    expect(sanitizeTask({ id: '', title: 'a', createdAt: '2026-03-01T00:00:00Z' })).toBeNull();
    expect(sanitizeTask({ id: 'a', title: '   ', createdAt: '2026-03-01T00:00:00Z' })).toBeNull();
    expect(sanitizeTask({ id: 'a', title: 'b', createdAt: 'yesterday' })).toBeNull();
  });
});

describe('collectCourses', () => {
  it('lists distinct courses alphabetically', () => {
    expect(
      collectCourses([task({ id: '1', course: 'Zoology' }), task({ id: '2', course: 'Art' }), task({ id: '3', course: 'Zoology' })]),
    ).toEqual(['Art', 'Zoology']);
    expect(collectCourses([])).toEqual([]);
  });
});
