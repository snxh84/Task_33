# TD33 Part 2 — To-Do List React Frontend (integrated with the Express + MongoDB API)

The React frontend from the previous assignments, now wired to the Part 1
backend so every user action is a real HTTP call and the UI always reflects
the data stored in MongoDB.

## Tech stack

| Piece | Choice |
| --- | --- |
| Build tool | Vite (React template) |
| UI | React 18 (function components + hooks) |
| HTTP | Axios |
| State | `useReducer` + a custom `useTasks` hook |

## Project structure

```
frontend/
├── index.html
├── vite.config.js
├── src/
│   ├── main.jsx                  # mounts <App />
│   ├── App.jsx                   # wires UI ↔ state ↔ filters (debounced search)
│   ├── styles.css                # responsive styling
│   ├── api/
│   │   ├── client.js             # Axios instance + error-envelope interceptor
│   │   └── tasks.js              # one function per API endpoint (§4.1–§4.9)
│   ├── hooks/
│   │   └── useTasks.js           # all task/stats state via useReducer + optimistic updates
│   ├── components/
│   │   ├── TaskForm.jsx          # add a task      → POST /tasks
│   │   ├── TaskList.jsx          # list + loading/error/empty states + pagination
│   │   ├── TaskItem.jsx          # toggle (PATCH …/toggle), inline edit (PUT), delete (DELETE)
│   │   ├── Filters.jsx           # search/status/priority → query params on GET /tasks
│   │   ├── StatsBar.jsx          # GET /tasks/stats + Clear completed (DELETE /tasks/completed)
│   │   ├── ErrorBanner.jsx       # one banner component for every failure
│   │   └── Spinner.jsx           # loading indicator
│   └── utils/
│       └── dates.js              # date-input ↔ ISO helpers (plan C11)
├── .env.example
└── package.json
```

## Setup and run

**Prerequisites:** the Part 1 backend running (see `backend/README.md`) and
Node.js ≥ 18.

```bash
cd frontend
npm install
cp .env.example .env     # points at http://localhost:5001
npm run dev              # http://localhost:5173
```

### Environment variables

| Variable | Required | Example | Purpose |
| --- | --- | --- | --- |
| `VITE_API_URL` | yes | `http://localhost:5001` | Base URL of the backend, **without** a trailing slash. Read at build time — set it in the Vercel project's environment variables before deploying. |

## How the integration works

Every user interaction maps to exactly one endpoint from the plan:

| UI action | Component | API call |
| --- | --- | --- |
| App loads / filters change | `useTasks` | `GET /api/v1/tasks?search=…&status=…&priority=…&page=…` |
| Footer counts | `StatsBar` | `GET /api/v1/tasks/stats` |
| Add task | `TaskForm` | `POST /api/v1/tasks` |
| Tick the checkbox | `TaskItem` | `PATCH /api/v1/tasks/:id/toggle` (flip on the server) |
| Edit → Save | `TaskItem` (inline form) | `PUT /api/v1/tasks/:id` (full replacement) |
| Delete | `TaskItem` | `DELETE /api/v1/tasks/:id` (204) |
| Clear completed | `StatsBar` | `DELETE /api/v1/tasks/completed` |

**Dynamic UI updates.** After every mutation the list (and stats) reloads
silently — the server is the single source of truth. Toggle and delete are
*optimistic*: the row reacts instantly and is rolled back if the request
fails.

**Loading indicators.** The first load shows a spinner; background reloads
show a subtle "Updating…" pulse; the Add button shows "Adding…" while the
request is in flight.

**Error handling.** One Axios interceptor converts the API's error envelope
into a single friendly message, and one `ErrorBanner` component displays it:
load failures get a **Retry** button (which reloads list *and* stats),
mutation failures auto-dismiss after a few seconds, and form input is kept
on failure so the user can fix the reported problem. `window.confirm`
guards destructive actions (delete, clear completed).

**Search & filters.** Typing in the search box is debounced (300 ms) and
sent as `?search=`; status/priority become `?status=`/`?priority=`; the
current page resets to 1 whenever a filter changes. Clearing all filters
restores the full list.

## Testing (what was verified)

End-to-end against the running backend (browser + API):

- ✅ Add task → appears in the list, stats update, form resets
- ✅ Toggle checkbox → optimistic flip, pill changes `pending → completed`, footer counts update
- ✅ Inline edit → title updated via PUT, edit form closes
- ✅ Delete → confirmation dialog, task removed instantly (204)
- ✅ Clear completed → dialog, only completed tasks removed, `deletedCount` reflected in stats
- ✅ Search `grocer` → matches; nonsense search → "No tasks match your filters" empty state
- ✅ Backend stopped → banner "Cannot reach the server…" with Retry; after restart, Retry restores list **and** stats
- ✅ Production build compiles: `npm run build` (0 vulnerabilities in `npm audit`)

## Challenges faced (and how they were addressed)

1. **Backend port conflict.** macOS AirPlay Receiver occupies port 5000,
   so the API runs on **5001** locally; `VITE_API_URL` and the backend
   default were aligned to it.
2. **Stale closures in callbacks.** A `useReducer` store plus a
   `filtersRef` keeps every callback on the current state/filters, so a
   delayed `.then()` never writes back an outdated task list.
3. **PUT replaces everything.** The inline edit form deliberately sends
   `status` and `completed` along with the fields it edits — otherwise the
   replace semantics of PUT (§4.4) would silently reset a completed task to
   pending.
4. **Dates and time zones (plan C11).** `<input type="date">` produces
   `YYYY-MM-DD`; `utils/dates.js` converts that to a full ISO 8601 string
   built from local midnight, which is what the server expects and stores
   as UTC.
5. **One request per keystroke.** The search box is debounced (300 ms) so
   typing does not fire a request for every character.
6. **Confirm dialogs blocking automation.** `window.confirm` pauses the
   page until answered — handled during testing by accepting the dialog
   through the browser tooling before asserting the list updated.

## Deployment (Vercel)

The repository holds two apps, so Vercel imports it as **two projects**
(backend + frontend) — see the backend README for the API side.

1. Push the repository to GitHub.
2. On Vercel: **Add New → Project** → import the repo → open
   **`frontend`** → **Import single project**
   (Root Directory `frontend`; the **Vite** framework is auto-detected,
   build `npm run build`, output `dist`).
3. In *Settings → Environment Variables* add
   `VITE_API_URL=https://your-backend.vercel.app` (the backend project's
   URL, no trailing slash) — it is read **at build time**, so redeploy
   after changing it.
4. Deploy. Once the frontend has a URL, add it to the backend project's
   `CORS_ORIGINS` variable and redeploy the backend too.
5. Cross-check both: the UI must load tasks from the deployed API
   (the browser console would show a CORS error if `CORS_ORIGINS` is
   missing the frontend's origin).
