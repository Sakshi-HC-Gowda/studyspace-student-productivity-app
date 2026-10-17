import { describe, expect, it } from 'vitest';
import type { PlanDay, Task } from '../types';
import {
  DAILY_BUDGET_MINUTES,
  DEFAULT_TASK_MINUTES,
  applyPlanDueDates,
  buildSevenDayPlan,
  firstPlannedDate,
  movePlanItem,
  planTotals,
  removePlanItem,
  unplannedTasks,
} from './plan';

/** Wednesday 4 March 2026, 15:30 local. */
const NOW = new Date(2026, 2, 4, 15, 30);

function makeTask(overrides: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  return {
    course: 'General',
    priority: 'medium',
    status: 'todo',
    createdAt: '2026-03-01T08:00:00.000Z',
    ...overrides,
  };
}

describe('plan', () => {
  it('covers exactly seven days starting today', () => {
    const plan = buildSevenDayPlan([], NOW);
    expect(plan).toHaveLength(7);
    expect(plan.map((day) => day.date)).toEqual([
      '2026-03-04',
      '2026-03-05',
      '2026-03-06',
      '2026-03-07',
      '2026-03-08',
      '2026-03-09',
      '2026-03-10',
    ]);
    expect(plan.every((day) => day.totalMinutes === 0)).toBe(true);
  });

  it('leaves completed tasks out of the plan entirely', () => {
    const tasks = [
      makeTask({ id: 'done', title: 'Finished essay', status: 'done', estimatedMinutes: 60 }),
      makeTask({ id: 'open', title: 'Open task', estimatedMinutes: 30 }),
    ];
    const plan = buildSevenDayPlan(tasks, NOW);
    expect(planTotals(plan).taskIds).toEqual(['open']);
    // Completed work is not "unplanned"; it is simply finished.
    expect(unplannedTasks(tasks, plan)).toEqual([]);
  });

  it('schedules a task on its due date, not before', () => {
    const tasks = [makeTask({ id: 'a', title: 'Due Friday', dueDate: '2026-03-06' })];
    const plan = buildSevenDayPlan(tasks, NOW);
    expect(plan[0]?.items).toEqual([]);
    expect(plan[2]?.items).toEqual([
      { date: '2026-03-06', taskId: 'a', minutes: DEFAULT_TASK_MINUTES },
    ]);
  });

  it('pulls overdue tasks onto today', () => {
    const tasks = [makeTask({ id: 'late', title: 'Overdue', dueDate: '2026-03-01' })];
    const plan = buildSevenDayPlan(tasks, NOW);
    expect(plan[0]?.items.map((item) => item.taskId)).toEqual(['late']);
  });

  it('spills a long task across days instead of overloading one day', () => {
    const tasks = [makeTask({ id: 'big', title: 'Big project', estimatedMinutes: 300 })];
    const plan = buildSevenDayPlan(tasks, NOW, { dailyBudgetMinutes: 120 });
    expect(plan[0]?.totalMinutes).toBe(120);
    expect(plan[1]?.totalMinutes).toBe(120);
    expect(plan[2]?.totalMinutes).toBe(60);
    expect(planTotals(plan).totalMinutes).toBe(300);
  });

  it('stops at the end of the window and reports what did not fit', () => {
    const tasks = [
      makeTask({ id: 'huge', title: 'Huge project', estimatedMinutes: 2000 }),
      makeTask({ id: 'starved', title: 'Never scheduled', estimatedMinutes: 60 }),
    ];
    const plan = buildSevenDayPlan(tasks, NOW, { dailyBudgetMinutes: 60 });
    expect(planTotals(plan).totalMinutes).toBe(7 * 60);
    // Minutes left over from the window are dropped, not scheduled late.
    expect(planTotals(plan).totalMinutes).toBeLessThan(2000);
    expect(unplannedTasks(tasks, plan).map((task) => task.id)).toEqual(['starved']);
  });

  it('orders tasks with the same day by priority', () => {
    const tasks = [
      makeTask({ id: 'low', title: 'Low', priority: 'low' }),
      makeTask({ id: 'high', title: 'High', priority: 'high' }),
    ];
    const plan = buildSevenDayPlan(tasks, NOW);
    expect(plan[0]?.items.map((item) => item.taskId)).toEqual(['high', 'low']);
  });

  it('never exceeds the documented daily budget', () => {
    const tasks = Array.from({ length: 6 }, (_, index) =>
      makeTask({ id: `t${index}`, title: `Task ${index}`, estimatedMinutes: 90 }),
    );
    const plan = buildSevenDayPlan(tasks, NOW);
    for (const day of plan) {
      expect(day.totalMinutes).toBeLessThanOrEqual(DAILY_BUDGET_MINUTES);
    }
  });

  it('moves a block to another day when there is room', () => {
    const tasks = [makeTask({ id: 'a', title: 'Move me', estimatedMinutes: 45 })];
    const plan = buildSevenDayPlan(tasks, NOW);
    const result = movePlanItem(plan, 'a', '2026-03-04', '2026-03-06');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan[0]?.items).toEqual([]);
    expect(result.plan[2]?.totalMinutes).toBe(45);
  });

  it('refuses a move that would break the daily budget', () => {
    const tasks = [makeTask({ id: 'a', title: 'Big', estimatedMinutes: 120 })];
    const plan = buildSevenDayPlan(tasks, NOW);
    const result = movePlanItem(plan, 'a', '2026-03-04', '2026-03-05', 60);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('only has');
  });

  it('merges a block moved onto a day that already holds the task', () => {
    const tasks = [makeTask({ id: 'a', title: 'Big', estimatedMinutes: 180 })];
    const plan = buildSevenDayPlan(tasks, NOW, { dailyBudgetMinutes: 120 });
    expect(plan[0]?.totalMinutes).toBe(120);
    expect(plan[1]?.totalMinutes).toBe(60);
    const result = movePlanItem(plan, 'a', '2026-03-05', '2026-03-04', 240);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan[0]?.items).toEqual([
      { date: '2026-03-04', taskId: 'a', minutes: 180 },
    ]);
    expect(result.plan[1]?.items).toEqual([]);
  });

  it('removes a block and keeps the totals honest', () => {
    const tasks = [makeTask({ id: 'a', title: 'Drop me', estimatedMinutes: 45 })];
    const plan = buildSevenDayPlan(tasks, NOW);
    const next = removePlanItem(plan, 'a', '2026-03-04');
    expect(next[0]?.totalMinutes).toBe(0);
    expect(planTotals(next).totalMinutes).toBe(0);
  });

  it('applies approved dates only to tasks that have none', () => {
    const tasks = [
      makeTask({ id: 'undated', title: 'No date', estimatedMinutes: 30 }),
      makeTask({ id: 'dated', title: 'Dated', dueDate: '2026-03-06', estimatedMinutes: 30 }),
    ];
    const plan = buildSevenDayPlan(tasks, NOW);
    const next = applyPlanDueDates(tasks, plan);
    expect(next[0]?.dueDate).toBe('2026-03-04');
    expect(next[1]?.dueDate).toBe('2026-03-06');
    expect(firstPlannedDate(plan, 'dated')).toBe('2026-03-06');
    expect(firstPlannedDate(plan as PlanDay[], 'missing')).toBeNull();
  });
});
