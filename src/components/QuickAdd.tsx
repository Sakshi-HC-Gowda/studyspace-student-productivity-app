import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { GENERAL_COURSE, MAX_TITLE_LENGTH } from '../utils/tasks';

export interface QuickAddProps {
  courses: string[];
  course: string;
  onChangeCourse: (course: string) => void;
  onAdd: (title: string) => void;
  onOpenDetails: () => void;
}

/**
 * Title-first capture. Only a title is required; everything else can be filled
 * in later through the full task dialog.
 */
export function QuickAdd({
  courses,
  course,
  onChangeCourse,
  onAdd,
  onOpenDetails,
}: QuickAddProps) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (trimmed === '') {
      setError('Give the task a title first.');
      inputRef.current?.focus();
      return;
    }
    if (trimmed.length > MAX_TITLE_LENGTH) {
      setError(`Keep the title under ${MAX_TITLE_LENGTH} characters.`);
      return;
    }
    setError(null);
    onAdd(trimmed);
    setTitle('');
    inputRef.current?.focus();
  }

  const courseOptions = [GENERAL_COURSE, ...courses.filter((entry) => entry !== GENERAL_COURSE)];

  return (
    <form className="quick-add" onSubmit={handleSubmit} aria-labelledby="quick-add-heading">
      <h2 id="quick-add-heading" className="card__title">
        Quick add
      </h2>
      <div className="quick-add__row">
        <div className="field field--grow">
          <label className="field__label" htmlFor="quick-add-title">
            Task title
          </label>
          <input
            id="quick-add-title"
            ref={inputRef}
            className="input"
            type="text"
            value={title}
            maxLength={MAX_TITLE_LENGTH + 20}
            placeholder="e.g. Finish biology problem set"
            autoComplete="off"
            aria-invalid={error !== null}
            aria-describedby={error === null ? undefined : 'quick-add-error'}
            onChange={(event) => {
              setTitle(event.target.value);
              if (error !== null) setError(null);
            }}
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="quick-add-course">
            Course
          </label>
          <select
            id="quick-add-course"
            className="input"
            value={course}
            onChange={(event) => onChangeCourse(event.target.value)}
          >
            {courseOptions.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="button button--primary quick-add__submit">
          Add task
        </button>
      </div>

      <p className="quick-add__note">
        Added tasks start as <strong>To do</strong> with no due date or estimate.{' '}
        <button type="button" className="link" onClick={onOpenDetails}>
          Add a task with full details
        </button>
      </p>

      {error !== null ? (
        <p className="field__error" id="quick-add-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
