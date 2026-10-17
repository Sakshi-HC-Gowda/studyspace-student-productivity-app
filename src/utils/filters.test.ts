import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import {
  ALL_COURSES,
  ALL_STATUSES,
  defaultFilters,
  describeEmptyState,
  filterByFields,
  filterByView,
  selectTasks,
} from './filters';
import { GENERAL_COURSE } from './tasks';

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

const OVERDUE = task({ id: 'overdue', dueDate: '2026-03-02' });
const DUE_TODAY = task({ id: 'today', dueDate: '2026-03-04' });
const FUTURE = task({ id: 'future', dueDate: '2026-03-11', course: 'Chemistry' });
const NO_DATE = task({ id: 'nodate', course: 'Chemistry', priority: 'high' });
const DONE = task({ id: 'done', status: 'done', dueDate: '2026-03-01' });
const ALL = [OVERDUE, DUE_TODAY, FUTURE, NO_DATE, DONE];

const ids = (tasks: Task[]) => tasks.map((t) => t.id);

describe('filterByView', () => {
  it('All shows open tasks and hides completed ones', () => {
    expect(ids(filterByView(ALL, 'all', TODAY)).sort()).toEqual(['future', 'nodate', 'overdue', 'today']);
  });

  it('Today shows tasks due today or already overdue', () => {
    expect(ids(filterByView(ALL, 'today', TODAY)).sort()).toEqual(['overdue', 'today']);
  });

  it('Upcoming shows only open tasks with a future due date', () => {
    expect(ids(filterByView(ALL, 'upcoming', TODAY))).toEqual(['future']);
  });

  it('Completed shows only finished tasks', () => {
    expect(ids(filterByView(ALL, 'completed', TODAY))).toEqual(['done']);
  });

  it('ignores completed tasks with past due dates in Today', () => {
    expect(ids(filterByView([DONE], 'today', TODAY))).toEqual([]);
  });
});

describe('filterByFields', () => {
  it('returns everything with the default filters', () => {
    expect(ids(filterByFields(ALL, defaultFilters())).length).toBe(ALL.length);
  });

  it('filters by course', () => {
    expect(ids(filterByFields(ALL, { course: 'Chemistry', status: ALL_STATUSES }))).toEqual([
      'future',
      'nodate',
    ]);
  });

  it('filters by status', () => {
    expect(ids(filterByFields(ALL, { course: ALL_COURSES, status: 'done' }))).toEqual(['done']);
  });

  it('combines both filters', () => {
    expect(ids(filterByFields(ALL, { course: 'Chemistry', status: 'todo' }))).toEqual([
      'future',
      'nodate',
    ]);
    expect(ids(filterByFields(ALL, { course: 'Chemistry', status: 'done' }))).toEqual([]);
  });
});

describe('selectTasks', () => {
  it('filters and sorts active tasks by due date then priority', () => {
    const selected = selectTasks({ tasks: ALL, view: 'all', filters: defaultFilters(), now: TODAY });
    expect(ids(selected)).toEqual(['overdue', 'today', 'future', 'nodate']);
  });

  it('sorts completed tasks newest first', () => {
    const older = task({ id: 'older', status: 'done', createdAt: '2026-01-01T00:00:00.000Z' });
    const newer = task({ id: 'newer', status: 'done', createdAt: '2026-02-01T00:00:00.000Z' });
    const selected = selectTasks({ tasks: [older, newer], view: 'completed', filters: defaultFilters(), now: TODAY });
    expect(ids(selected)).toEqual(['newer', 'older']);
  });

  it('does not mutate the input array', () => {
    const input = [NO_DATE, OVERDUE];
    selectTasks({ tasks: input, view: 'all', filters: defaultFilters(), now: TODAY });
    expect(ids(input)).toEqual(['nodate', 'overdue']);
  });
});

describe('describeEmptyState', () => {
  it('explains a brand-new workspace', () => {
    const advice = describeEmptyState([], 'all', defaultFilters(), TODAY);
    expect(advice.kind).toBe('no-tasks');
    expect(advice.body).toContain('quick add');
  });

  it('explains that a view is simply clear', () => {
    const advice = describeEmptyState([FUTURE], 'today', defaultFilters(), TODAY);
    expect(advice.kind).toBe('all-clear');
    expect(advice.body).toContain('due today');
  });

  it('explains that filters excluded everything', () => {
    const advice = describeEmptyState(ALL, 'all', { course: 'Physics', status: ALL_STATUSES }, TODAY);
    expect(advice.kind).toBe('no-matches');
    expect(advice.body).toContain('Physics');
  });

  it('explains an empty completed view', () => {
    const advice = describeEmptyState([task({ id: 'x' })], 'completed', defaultFilters(), TODAY);
    expect(advice.kind).toBe('no-tasks');
    expect(advice.title).toContain('Nothing completed');
  });

  it('mentions the default course bucket', () => {
    const general = task({ id: 'g', course: GENERAL_COURSE });
    const advice = describeEmptyState([general], 'upcoming', defaultFilters(), TODAY);
    expect(advice.kind).toBe('all-clear');
  });
});
