import type { Status, ViewKey } from '../types';
import { ALL_COURSES, ALL_STATUSES, type TaskFilters } from '../utils/filters';
import { STATUS_LABEL } from '../utils/tasks';

export interface FilterBarProps {
  filters: TaskFilters;
  courses: string[];
  resultCount: number;
  totalCount: number;
  view: ViewKey;
  onChange: (filters: TaskFilters) => void;
}

const STATUSES: readonly Status[] = ['todo', 'inProgress', 'done'];

/** Course + status dropdowns with a live result count and a reset button. */
export function FilterBar({
  filters,
  courses,
  resultCount,
  totalCount,
  view,
  onChange,
}: FilterBarProps) {
  const filtered = filters.course !== ALL_COURSES || filters.status !== ALL_STATUSES;

  return (
    <div className="toolbar" role="group" aria-label={`Filters for the ${view} view`}>
      <div className="field">
        <label className="field__label" htmlFor="filter-course">
          Course
        </label>
        <select
          id="filter-course"
          className="input"
          value={filters.course}
          onChange={(event) => onChange({ ...filters, course: event.target.value })}
        >
          <option value={ALL_COURSES}>All courses</option>
          {courses.map((course) => (
            <option key={course} value={course}>
              {course}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="filter-status">
          Status
        </label>
        <select
          id="filter-status"
          className="input"
          value={filters.status}
          onChange={(event) =>
            onChange({ ...filters, status: event.target.value as TaskFilters['status'] })
          }
        >
          <option value={ALL_STATUSES}>All statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
      </div>

      <p className="toolbar__count" aria-live="polite">
        Showing <strong>{resultCount}</strong> of {totalCount} in this view
        {filtered ? ' after filters' : ''}.
      </p>

      <button
        type="button"
        className="button button--ghost"
        onClick={() => onChange({ course: ALL_COURSES, status: ALL_STATUSES })}
        disabled={!filtered}
      >
        Clear filters
      </button>
    </div>
  );
}
