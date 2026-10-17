import type { Task, ViewKey } from '../types';
import { isDateKey, toDateKey } from './dates';
import { compareByNewestFirst, compareTasks, isOverdue, STATUS_LABEL } from './tasks';

export interface TaskFilters {
  course: string | 'all';
  status: Task['status'] | 'all';
}

export const ALL_COURSES = 'all';
export const ALL_STATUSES = 'all';

export function defaultFilters(): TaskFilters {
  return { course: ALL_COURSES, status: ALL_STATUSES };
}

/** Applies the view (All/Today/Upcoming/Completed) to a task list. */
export function filterByView(tasks: Task[], view: ViewKey, now: Date): Task[] {
  const todayKey = toDateKey(now);
  switch (view) {
    case 'all':
      return tasks.filter((task) => task.status !== 'done');
    case 'today':
      return tasks.filter(
        (task) =>
          task.status !== 'done' &&
          ((task.dueDate !== undefined && task.dueDate <= todayKey) || isOverdue(task, now)),
      );
    case 'upcoming':
      return tasks.filter(
        (task) =>
          task.status !== 'done' &&
          task.dueDate !== undefined &&
          isDateKey(task.dueDate) &&
          task.dueDate > todayKey,
      );
    case 'completed':
      return tasks.filter((task) => task.status === 'done');
    case 'plan':
      return tasks.filter((task) => task.status !== 'done');
    default:
      return tasks;
  }
}

/** Applies the course + status dropdown filters. */
export function filterByFields(tasks: Task[], filters: TaskFilters): Task[] {
  return tasks.filter((task) => {
    if (filters.course !== ALL_COURSES && task.course !== filters.course) return false;
    if (filters.status !== ALL_STATUSES && task.status !== filters.status) return false;
    return true;
  });
}

export interface SelectTasksOptions {
  tasks: Task[];
  view: ViewKey;
  filters: TaskFilters;
  now: Date;
}

/** View filter + field filters + sorting. The single entry point for the list. */
export function selectTasks({ tasks, view, filters, now }: SelectTasksOptions): Task[] {
  const selected = filterByFields(filterByView(tasks, view, now), filters);
  return view === 'completed'
    ? selected.slice().sort(compareByNewestFirst)
    : selected.slice().sort(compareTasks);
}

/** Explains an empty list: nothing stored at all vs nothing matching. */
export interface EmptyStateAdvice {
  kind: 'no-tasks' | 'no-matches' | 'all-clear';
  title: string;
  body: string;
}

export function describeEmptyState(
  allTasks: Task[],
  view: ViewKey,
  filters: TaskFilters,
  now: Date,
): EmptyStateAdvice {
  if (view === 'completed' && allTasks.every((task) => task.status !== 'done')) {
    return {
      kind: 'no-tasks',
      title: 'Nothing completed yet',
      body: 'Finish a task and it will appear here with its study time.',
    };
  }
  if (allTasks.length === 0) {
    return {
      kind: 'no-tasks',
      title: 'No tasks yet',
      body: 'Add your first task with the quick add box above to get started.',
    };
  }
  if (filterByView(allTasks, view, now).length === 0) {
    const messages: Record<ViewKey, string> = {
      all: 'There are no open tasks right now — enjoy the break.',
      today: 'Nothing is due today or overdue. Check the Upcoming view for what is next.',
      upcoming: 'No tasks have a future due date yet. Add one or set a due date on an existing task.',
      completed: 'No completed tasks yet.',
      plan: 'There are no open tasks to plan — add one first.',
    };
    return { kind: 'all-clear', title: 'All clear', body: messages[view] };
  }
  const filterParts: string[] = [];
  if (filters.course !== ALL_COURSES) filterParts.push(`course “${filters.course}”`);
  if (filters.status !== ALL_STATUSES) filterParts.push(`status “${STATUS_LABEL[filters.status]}”`);
  return {
    kind: 'no-matches',
    title: 'No tasks match these filters',
    body:
      filterParts.length > 0
        ? `No tasks in this view match ${filterParts.join(' and ')}. Clear the filters to see everything.`
        : 'Try a different course or status, or clear the filters to see everything.',
  };
}
