import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Priority, TaskDraft, TaskInput } from '../types';
import {
  GENERAL_COURSE,
  MAX_COURSE_LENGTH,
  MAX_ESTIMATE_MINUTES,
  MAX_TITLE_LENGTH,
  MIN_ESTIMATE_MINUTES,
  PRIORITY_LABEL,
  STATUS_LABEL,
  validateTaskDraft,
  type TaskErrors,
  type TaskField,
} from '../utils/tasks';

export interface TaskFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial: TaskDraft;
  courses: string[];
  onCancel: () => void;
  onSubmit: (input: TaskInput) => void;
}

const PRIORITIES: readonly Priority[] = ['low', 'medium', 'high'];
const ERROR_ID: Record<TaskField, string> = {
  title: 'task-error-title',
  course: 'task-error-course',
  dueDate: 'task-error-dueDate',
  estimatedMinutes: 'task-error-estimate',
};

/** Create/edit dialog. Validation comes from the pure `validateTaskDraft`. */
export function TaskFormDialog({
  open,
  mode,
  initial,
  courses,
  onCancel,
  onSubmit,
}: TaskFormDialogProps) {
  const [draft, setDraft] = useState<TaskDraft>(initial);
  const [errors, setErrors] = useState<TaskErrors>({});
  const titleRef = useRef<HTMLInputElement>(null);

  // Re-seed the form each time the dialog opens, never while it is being used.
  useEffect(() => {
    if (!open) return;
    setDraft(initial);
    setErrors({});
    titleRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  function update<K extends keyof TaskDraft>(field: K, value: TaskDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field as TaskField];
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateTaskDraft(draft, new Date());
    if (!result.ok || result.value === null) {
      setErrors(result.errors);
      const firstBroken = (Object.keys(result.errors) as TaskField[])[0];
      if (firstBroken === 'title') titleRef.current?.focus();
      return;
    }
    setErrors({});
    onSubmit(result.value);
  }

  const errorCount = Object.keys(errors).length;

  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="task-form-title">
        <form onSubmit={handleSubmit} noValidate>
          <h2 className="dialog__title" id="task-form-title">
            {mode === 'create' ? 'Add a task' : 'Edit task'}
          </h2>

          <div className="dialog__body">
            {errorCount > 0 ? (
              <p className="form-summary" role="alert">
                {errorCount === 1 ? 'One field needs attention.' : `${errorCount} fields need attention.`}
              </p>
            ) : null}

            <div className="form-grid">
              <div className="field field--wide">
                <label className="field__label" htmlFor="task-title">
                  Title <span className="field__required">(required)</span>
                </label>
                <input
                  id="task-title"
                  ref={titleRef}
                  className="input"
                  type="text"
                  value={draft.title}
                  maxLength={MAX_TITLE_LENGTH + 20}
                  aria-invalid={errors.title !== undefined}
                  aria-describedby={errors.title === undefined ? undefined : ERROR_ID.title}
                  onChange={(event) => update('title', event.target.value)}
                />
                {errors.title === undefined ? null : (
                  <p className="field__error" id={ERROR_ID.title}>
                    {errors.title}
                  </p>
                )}
              </div>

              <div className="field">
                <label className="field__label" htmlFor="task-course">
                  Course{' '}
                  <span className="field__optional">(optional — defaults to {GENERAL_COURSE})</span>
                </label>
                <input
                  id="task-course"
                  className="input"
                  type="text"
                  list="task-course-options"
                  value={draft.course}
                  maxLength={MAX_COURSE_LENGTH + 10}
                  aria-invalid={errors.course !== undefined}
                  aria-describedby={errors.course === undefined ? undefined : ERROR_ID.course}
                  onChange={(event) => update('course', event.target.value)}
                />
                <datalist id="task-course-options">
                  {courses.map((course) => (
                    <option key={course} value={course} />
                  ))}
                </datalist>
                {errors.course === undefined ? null : (
                  <p className="field__error" id={ERROR_ID.course}>
                    {errors.course}
                  </p>
                )}
              </div>

              <div className="field">
                <label className="field__label" htmlFor="task-due">
                  Due date <span className="field__optional">(optional)</span>
                </label>
                <input
                  id="task-due"
                  className="input"
                  type="date"
                  value={draft.dueDate}
                  aria-invalid={errors.dueDate !== undefined}
                  aria-describedby={errors.dueDate === undefined ? undefined : ERROR_ID.dueDate}
                  onChange={(event) => update('dueDate', event.target.value)}
                />
                {errors.dueDate === undefined ? null : (
                  <p className="field__error" id={ERROR_ID.dueDate}>
                    {errors.dueDate}
                  </p>
                )}
              </div>

              <div className="field">
                <label className="field__label" htmlFor="task-priority">
                  Priority
                </label>
                <select
                  id="task-priority"
                  className="input"
                  value={draft.priority}
                  onChange={(event) => update('priority', event.target.value as Priority)}
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {PRIORITY_LABEL[priority]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="task-estimate">
                  Estimate in minutes <span className="field__optional">(optional)</span>
                </label>
                <input
                  id="task-estimate"
                  className="input"
                  type="text"
                  inputMode="numeric"
                  value={draft.estimatedMinutes}
                  aria-invalid={errors.estimatedMinutes !== undefined}
                  aria-describedby={
                    errors.estimatedMinutes === undefined ? undefined : ERROR_ID.estimatedMinutes
                  }
                  onChange={(event) => update('estimatedMinutes', event.target.value)}
                />
                <p className="field__hint">
                  Whole minutes between {MIN_ESTIMATE_MINUTES} and {MAX_ESTIMATE_MINUTES}.
                </p>
                {errors.estimatedMinutes === undefined ? null : (
                  <p className="field__error" id={ERROR_ID.estimatedMinutes}>
                    {errors.estimatedMinutes}
                  </p>
                )}
              </div>

              <div className="field">
                <label className="field__label" htmlFor="task-status">
                  Status
                </label>
                <select
                  id="task-status"
                  className="input"
                  value={draft.status}
                  onChange={(event) => update('status', event.target.value as TaskDraft['status'])}
                >
                  <option value="todo">{STATUS_LABEL.todo}</option>
                  <option value="inProgress">{STATUS_LABEL.inProgress}</option>
                  <option value="done">{STATUS_LABEL.done}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="dialog__actions">
            <button type="button" className="button button--ghost" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="button button--primary">
              {mode === 'create' ? 'Add task' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
