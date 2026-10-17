import type { Task } from '../types';
import { groupByDueDate } from '../utils/tasks';
import type { EmptyStateAdvice } from '../utils/filters';
import { EmptyState } from './EmptyState';
import { TaskRow } from './TaskRow';

export interface TaskListProps {
  tasks: Task[];
  now: Date;
  minutesByTask: Map<string, number>;
  grouped: boolean;
  advice: EmptyStateAdvice;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onToggleDone: (id: string) => void;
  onSetStatus: (id: string, status: Task['status']) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onLogStudy: (task: Task) => void;
}

/** The task list, optionally grouped into due-date buckets. */
export function TaskList(props: TaskListProps) {
  const {
    tasks,
    now,
    minutesByTask,
    grouped,
    advice,
    emptyActionLabel,
    onEmptyAction,
    onToggleDone,
    onSetStatus,
    onEdit,
    onDelete,
    onLogStudy,
  } = props;

  if (tasks.length === 0) {
    return (
      <EmptyState advice={advice} actionLabel={emptyActionLabel} onAction={onEmptyAction} />
    );
  }

  function renderRows(rows: Task[]) {
    return (
      <ul className="task-list">
        {rows.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            now={now}
            loggedMinutes={minutesByTask.get(task.id) ?? 0}
            onToggleDone={onToggleDone}
            onSetStatus={onSetStatus}
            onEdit={onEdit}
            onDelete={onDelete}
            onLogStudy={onLogStudy}
          />
        ))}
      </ul>
    );
  }

  if (!grouped) return renderRows(tasks);

  const groups = groupByDueDate(tasks, now);
  return (
    <div className="groups">
      {groups.map((group) => (
        <section className="group" key={group.key} aria-labelledby={`group-${group.key}`}>
          <h3 className="group__header" id={`group-${group.key}`}>
            {group.label}
            <span className="group__count">{group.tasks.length}</span>
          </h3>
          {renderRows(group.tasks)}
        </section>
      ))}
    </div>
  );
}
