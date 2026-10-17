# Studyspace

A local-first student productivity dashboard: plan study tasks, track progress, log study time.
Built with **React + TypeScript (strict) + Vite**, styled with plain CSS, persisted in
`localStorage`, tested with **Vitest**.

There is **no backend, no account, no database and no network call at runtime**. Everything the app
needs to run is in this repository — it works offline and needs no API keys.

---

## 1. Requirements

| Tool | Version used for the verified run |
| --- | --- |
| Node.js | v22.14.0 (any Node 18+ works) |
| npm | 10.9.2 |

## 2. Setup and run

```bash
npm install      # only needed once
npm run dev      # dev server, http://localhost:5173
```

Production build and local preview of the built output:

```bash
npm run build    # tsc -b && vite build  -> writes ./dist
npm run preview  # serves ./dist, http://localhost:4173
```

Other scripts:

```bash
npm test          # Vitest, single run
npm run test:watch
npm run typecheck # tsc -b across tsconfig.app.json + tsconfig.node.json
```

## 3. Features

**Tasks**
- Create, edit, complete and delete tasks. Quick add captures a title only; the dialog captures
  course, due date, priority, estimate and status.
- Each task has `id`, `title`, `course`, optional `dueDate`, `priority` (`low`/`medium`/`high`),
  optional `estimatedMinutes`, `status` (`todo`/`inProgress`/`done`) and a `createdAt` timestamp.
- IDs are unique (`crypto.randomUUID` with a monotonic fallback for older browsers).
- Validation: title is required and length-bounded, the course is trimmed and defaults to `General`,
  the estimate must be a whole number inside a documented range, the due date must be a real
  calendar date. Invalid input is reported per field and never stored.
- Optional fields are stored as absent, not as `0`/`''`, so the UI can tell "no estimate" from
  "zero minutes".

**Views, filtering and sorting**
- Views: **All** open tasks, **Today** (due today or overdue), **Upcoming**, **Completed**, and the
  optional **Plan week** view.
- Filter by course (options derived from your own tasks) and by status, with a live result count.
- Active tasks are sorted by due date first, then priority, then title. Tasks with no due date sort
  last; completed tasks sort newest first.
- Overdue tasks are flagged inline (red chip) and counted in the summary card.
- The list is grouped into due-date buckets: Overdue, Today, Tomorrow, This week, Later, No due date.
- Filtered empty states explain what is empty and offer the relevant action (add a task / clear
  filters), instead of a blank panel.

**Study time**
- Log a session against an **existing** task (`select` filled from the task list). Minutes must be a
  whole number ≥ 1; invalid input is rejected with an inline message.
- Each session stores `id`, `taskId`, `minutes` and an ISO `timestamp`.
- Summary card shows study time for the **current week**; the panel adds a per-task breakdown for the
  same week and the completion progress bar.
- Deleting a task also deletes its sessions (the confirmation says so when sessions exist), and
  storage drops any session whose `taskId` is missing — no dangling task reference is ever retained.

**Storage**
- One versioned key: `studyspace:data`, holding `{ version: 1, tasks: [], sessions: [] }`.
- Restored on startup, auto-saved on every change.
- Malformed JSON, a non-object payload, a missing version marker or a **future** version is treated
  as unreadable: the raw text is left untouched (and copied to `studyspace:data.backup` on a
  best-effort basis), a banner explains it, and writes are paused rather than overwriting good data
  with defaults. You can keep working in the tab, or explicitly clear the payload.
- Individual bad records are dropped and reported (`repaired`); every valid record is kept.
- Older unversioned keys (`studyspace:tasks`, `studyspace.v0`) are migrated forward once.
- Every read/write is wrapped: if `localStorage` throws (Safari private mode, disabled cookies,
  quota) the app stays usable and says that changes are kept in this tab only.

**UX / accessibility**
- Sidebar navigation with per-view counts, welcome header with a greeting and today's numbers,
  four derived summary cards, quick add, task list, study progress panel, footer.
- Keyboard: skip link, real `<button>`/`<label>`/`<select>` elements, visible focus rings,
  `Escape` closes dialogs, dialogs focus their confirmation button, `role="alert"` for errors,
  `aria-live` for the result count, `aria-current="page"` on the active view.
- Meaningful **loading** (skeleton card), **empty** and **error** (banner) states.
- Responsive: sidebar collapses to a horizontal nav row under 880px; single-column layout under
  560px; no horizontal overflow at 390px or 1440px.
- Colour tokens were chosen for readable contrast; the palette is checked in the browser
  inspection (no text below WCAG contrast, measured).

**Optional planner (not AI)**
- The "Plan week" view contains a **local heuristic** planner (`src/utils/plan.ts`), clearly labelled
  as a proposal: it spreads open tasks across seven days, respects the study budget, never schedules
  a task after its own due date, and stops when the window is full.
- Nothing is written until you press **Approve plan**; you can edit or remove any proposed block
  first. Approving only fills in due dates for tasks that had none.
- It makes **no network call and uses no API key**. Any real AI/LLM feature would need a backend to
  hold the key; this project deliberately ships without one.

## 4. Project structure

```
student-productivity-app/
├─ index.html                  # Vite entry (title, meta description, favicon)
├─ vite.config.ts              # React plugin, `base: './'` for static hosting, Vitest config
├─ vitest.setup.ts             # jest-dom matchers + cleanup
├─ tsconfig.json               # project references
├─ tsconfig.app.json           # strict app config (src)
├─ tsconfig.node.json          # config for vite.config.ts
├─ public/favicon.svg          # the only static asset
└─ src/
   ├─ main.tsx                 # React root
   ├─ App.tsx                  # dashboard shell: state wiring, view/route switch, dialogs
   ├─ index.css                # design tokens + all component styles
   ├─ types.ts                 # Task, StudySession, AppData, TaskDraft, TaskInput, PlanDay
   ├─ App.test.tsx             # workflow tests driving the real App end to end
   ├─ hooks/
   │  └─ useStudyspace.ts      # load/save lifecycle, notices, task + session actions
   ├─ storage/
   │  ├─ storage.ts            # versioned localStorage read/write, sanitising, error reporting
   │  └─ storage.test.ts
   ├─ utils/                   # pure, UI-free logic
   │  ├─ tasks.ts              # validation, normalisation, sorting, grouping, labels
   │  ├─ filters.ts            # view + filter selection, empty-state advice
   │  ├─ study.ts              # session validation, weekly totals, per-task totals, progress
   │  ├─ dates.ts              # local calendar keys, week boundaries, formatting
   │  ├─ plan.ts               # optional heuristic 7-day planner
   │  └─ id.ts                 # unique id generation
   └─ components/              # presentational, one job each
      ├─ Sidebar.tsx  Banner.tsx  SummaryCards.tsx  QuickAdd.tsx  FilterBar.tsx
      ├─ TaskList.tsx TaskRow.tsx EmptyState.tsx   StudyPanel.tsx PlanView.tsx
      └─ TaskFormDialog.tsx ConfirmDialog.tsx
```

All logic that can be reasoned about without a DOM lives in `src/utils` and `src/storage` as pure
functions; components receive props and call callbacks. `App.tsx` owns the state, `useStudyspace`
owns persistence.

## 5. Data model and storage contract

```ts
interface Task {
  id: string;
  title: string;
  course: string;                 // defaults to "General"
  dueDate?: string;               // local calendar key "YYYY-MM-DD"
  priority: 'low' | 'medium' | 'high';
  estimatedMinutes?: number;      // whole minutes >= 1
  status: 'todo' | 'inProgress' | 'done';
  createdAt: string;              // ISO-8601
}

interface StudySession {
  id: string;
  taskId: string;                 // must reference an existing task
  minutes: number;                // whole minutes >= 1
  timestamp: string;              // ISO-8601
}
```

Keys: `studyspace:data` (current, versioned envelope) · `studyspace:data.backup` (copy of an
unreadable payload) · `studyspace:tasks`, `studyspace.v0` (legacy, read once and migrated).

Dates are stored as local calendar keys, never as UTC instants, so a task cannot shift a day because
of a timezone offset.

**Week boundary (documented on purpose):** a study week runs **Monday 00:00 through Sunday 23:59 in
local time** — i.e. the current week starts at the most recent Monday 00:00 and ends at the next
Monday 00:00. The same boundary drives "study time this week", the per-task breakdown, the sidebar
"Week of …" label and the summary card. This is stated in the UI under the progress bar.

## 6. Tests

```bash
npm test
```

Vitest (jsdom) with 6 unit suites plus one integration suite, **99 tests** total:

| Suite | What it covers |
| --- | --- |
| `src/utils/tasks.test.ts` | title/course/estimate/due-date validation, sanitising, optional fields, unique ids, sorting (due date → priority → title), due-date grouping incl. no-date and done |
| `src/utils/filters.test.ts` | All/Today/Upcoming/Completed selection, overdue handling, course + status filters, result counts, empty-state advice |
| `src/utils/dates.test.ts` | local calendar keys, Monday–Sunday week start/end, week range labels, formatting, month/year boundaries |
| `src/utils/study.test.ts` | session validation (positive whole minutes, existing task), weekly totals across the boundary, per-task totals, completion progress, sanitising stored sessions |
| `src/utils/plan.test.ts` | heuristic planner: seven days, budget respected, no task after its due date, overflow reported, edits and removals, approval mapping |
| `src/storage/storage.test.ts` | envelope round-trip, version handling, legacy migration, malformed/unreadable payloads left untouched, dropped records reported as repaired, orphan sessions removed, throwing storage handled |
| `src/App.test.tsx` | real workflows on the mounted app: quick add → persisted, blank title rejected, completion moves a task to Completed, logging study minutes updates the weekly card and storage, invalid minutes rejected, delete needs confirmation and removes its sessions, restore-from-storage, unreadable data left intact, course/status filtering with a filtered empty state, full-details dialog validation |

## 7. Static deployment

The build output is a plain static folder, so any static host works.

```bash
npm run build     # -> dist/
npm run preview   # sanity-check the built app at http://localhost:4173
```

`vite.config.ts` sets `base: './'`, so `dist/` can be served from a sub-path (for example
`https://user.github.io/studyspace/`) without rebuilding. Drop `dist/` on Netlify, Vercel, Cloudflare
Pages, GitHub Pages or any static server. Because there is no router and no API, no rewrite rules or
environment variables are needed.

### Git notes

- `node_modules`, `dist`, coverage, logs and `*.tsbuildinfo` are ignored.
- There are **no secrets** in this project: no `.env` file is read, no API key is used, and nothing
  is sent anywhere at runtime.
- Roughly: `git init && git add . && git commit -m "Studyspace MVP"`, then push and enable Pages
  (or run `npx gh-pages -d dist` if you prefer the `gh-pages` branch).
- To produce a shareable archive without build output:

  ```bash
  git archive --format=zip -o studyspace.zip HEAD
  # or, without git:
  npm pack --dry-run   # shows exactly which files would ship
  ```

  A download link is not something this environment can host; the archive command above is the
  supported way to hand the project to someone else.

## 8. Architectural decisions

1. **Pure logic is separate from React.** `src/utils/*` and `src/storage/storage.ts` have no DOM or
   React imports, which is why they are directly unit-testable (89 of the tests never mount a
   component).
2. **One state owner.** `App.tsx` holds view/filter/dialog state; `useStudyspace` owns the data and
   persistence. Components are presentational and receive props, so no component reaches into
   storage.
3. **Storage is a module, not an inline `useEffect`.** Reading, sanitising and writing live in one
   place with an explicit result type (`LoadResult` / `WriteResult`), so every failure mode is a
   value the UI can report instead of an exception.
4. **Never overwrite unreadable data.** Invalid payloads stay put, writes are paused, and the user
   decides to clear them. Losing a student's list to a bug is worse than a banner.
5. **Dates as `YYYY-MM-DD` keys.** Due dates are calendar facts, not instants; storing local keys
   removes a whole class of timezone bugs.
6. **Small component set, no router, no state library.** Five views are a `useState` union, not five
   routes, which keeps the dependency list at React + ReactDOM (plus dev-only tooling).
7. **One CSS file with design tokens.** No CSS framework: the palette, radii, shadows and breakpoints
   are custom properties, so the whole look is auditable in one place.
8. **The planner is a labelled heuristic.** It is deterministic utility code behind an
   approve-before-apply step, so it can never silently rewrite the user's data or imply an AI
   integration that isn't there.

## 9. Known limitations

- **Single browser, single device.** Data lives in `localStorage`; there is no sync, no export
  button (the raw JSON is readable under `studyspace:data`) and clearing site data erases it.
- **No accounts or sharing.** Anyone with access to the browser profile sees the same list.
- **No reminders/notifications.** Due dates are displayed, not pushed.
- **The week is Monday-based and uses the device's local time**; it is not configurable, and the
  "today" boundary only refreshes on mount, on a storage change or when you press *Refresh today*.
- **No recurring tasks, subtasks, tags or attachments.**
- **The planner is a heuristic, not AI.** It balances due dates and estimates; it does not understand
  your subject matter. A real AI planner requires a backend that holds the API key — deliberately out
  of scope here.
- **No e2e browser suite.** Workflows are covered by jsdom integration tests against the real
  `App`; layout and visual regressions are not automatically checked.
- **Accessibility is tested by construction, not by audit.** Landmarks, labels, focus handling and
  contrast are in place and were measured in a headless browser, but there is no automated axe run.
