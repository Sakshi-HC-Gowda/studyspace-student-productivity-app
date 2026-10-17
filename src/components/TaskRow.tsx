import type { Task } from '../types';
import { formatDateKey, formatMinutes } from '../utils/dates';
import { PRIORITY_LABEL, STATUS_LABEL, isDueToday, isOverdue } from '../utils/tasks';

export interface TaskRowProps {
  task: Task;
  now: Date;
  loggedMinutes: number;
  onToggleDone: (id: string) => void;
  onSetStatus: (id: string, status: Task['status']) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onLogStudy: (task: Task) => void;
}

function dueChip(task: Task, now: Date): { text: string; className: string } {
  if (task.dueDate === undefined) return { text: 'No due date', className: 'chip chip--muted' };
  if (isOverdue(task, now)) {
    return { text: `Overdue · ${formatDateKey(task.dueDate)}`, className: 'chip chip--overdue' };
  }
  if (isDueToday(task, now)) return { text: 'Due today', className: 'chip chip--today' };
  return { text: `Due ${formatDateKey(task.dueDate)}`, className: 'chip' };
}

/** One task: status control, identifying chips, and its row actions. */
export function TaskRow({
  task,
  now,
  loggedMinutes,
  onToggleDone,
  onSetStatus,
  onEdit,
  onDelete,
  onLogStudy,
}: TaskRowProps) {
  const due = dueChip(task, now);
  const done = task.status === 'done';
  const overdue = isOverdue(task, now);

  return (
    <li className={`task${done ? ' is-done' : ''}`}>
      <div className="task__status">
        <input
          type="checkbox"
          className="checkbox"
          checked={done}
          aria-label={`Mark “${task.title}” as done`}
          onChange={() => onToggleDone(task.id)}
        />
        {!done ? (
          <label className="visually-hidden" htmlFor={`status-${task.id}`}>
            Progress for “{task.title}”
          </label>
        ) : null}
        {!done ? (
          <select
            id={`status-${task.id}`}
            className="input input--compact"
            value={task.status}
            onChange={(event) => onSetStatus(task.id, event.target.value as Task['status'])}
          >
            <option value="todo">{STATUS_LABEL.todo}</option>
            <option value="inProgress">{STATUS_LABEL.inProgress}</option>
          </select>
        ) : null}
      </div>

      <div className="task__main">
        <p className="task__title">{task.title}</p>
        <ul className="chips">
          <li className="chip chip--course">{task.course}</li>
          <li className={overdue ? 'chip chip--overdue' : due.className}>{due.text}</li>
          <li className={`chip chip--priority-${task.priority}`}>{PRIORITY_LABEL[task.priority]} priority</li>
          {task.estimatedMinutes !== undefined ? (
            <li className="chip">Est. {formatMinutes(task.estimatedMinutes)}</li>
          ) : null}
          {loggedMinutes > 0 ? (
            <li className="chip chip--studied">{formatMinutes(loggedMinutes)} studied</li>
          ) : null}
        </ul>
      </div>

      <div className="task__actions">
        <button
          type="button"
          className="button button--ghost button--small"
          onClick={() => onLogStudy(task)}
        >
          Log study
        </button>
        <button
          type="button"
          className="button button--ghost button--small"
          onClick={() => onEdit(task)}
        >
          Edit
        </button>
        <button
          type="button"
          className="button button--danger button--small"
          onClick={() => onDelete(task)}
        >
          Delete
        </button>
      </div>
    </li>
  );
}
