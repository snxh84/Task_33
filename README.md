# Task 33 — To-Do List App: Express.js + MongoDB backend with React frontend

A full-stack To-Do List application, split into the two parts of the
assignment:

| Part | What | Where |
| --- | --- | --- |
| **Part 1** | Backend — Node.js, Express.js and MongoDB implementing the APIs identified in Task 31, with controller / service / routes structure, validation, error handling and Postman testing | [`backend/`](backend/README.md) |
| **Part 2** | Frontend — the React To-Do app integrated with those APIs via Axios: dynamic UI, loading indicators, error handling | [`frontend/`](frontend/README.md) |

Each part has its own **README** with full details (this file is the
quick-start overview).

## Quick start (local)

```bash
# 1. Backend — starts an in-memory MongoDB automatically if MONGODB_URI is empty
cd backend
npm install
cp .env.example .env
npm start                     # API on http://localhost:5001

# 2. Frontend — in a second terminal
cd ../frontend
npm install
cp .env.example .env          # VITE_API_URL=http://localhost:5001
npm run dev                   # UI on http://localhost:5173
```

Open **http://localhost:5173** and the app is fully functional: add, edit,
toggle, search, filter, delete and clear-completed all persist to MongoDB.

> **Note on ports:** the API plan specified port 5000, but macOS AirPlay
> Receiver already occupies it, so the backend defaults to **5001**
> locally. Set `PORT=5000` in `backend/.env` if you have disabled AirPlay.

## API summary

Base path `/api/v1/tasks` — standard envelope
`{ success, message, data }` / `{ success: false, message, errors }`:

| Method | Endpoint | Purpose | Success |
| --- | --- | --- | --- |
| POST | `/api/v1/tasks` | create a task | 201 |
| GET | `/api/v1/tasks` | list (filter, search, sort, paginate) | 200 |
| GET | `/api/v1/tasks/:id` | fetch one | 200 |
| PUT | `/api/v1/tasks/:id` | replace a task | 200 |
| PATCH | `/api/v1/tasks/:id` | partial update | 200 |
| PATCH | `/api/v1/tasks/:id/toggle` | flip completion server-side | 200 |
| DELETE | `/api/v1/tasks/:id` | delete one | 204 |
| DELETE | `/api/v1/tasks/completed` | clear completed | 200 |
| GET | `/api/v1/tasks/stats` | counts for the footer | 200 |

## Environment variables

**Backend** (`backend/.env`) — `PORT`, `MONGODB_URI` (MongoDB Atlas
connection string; empty = in-memory dev database), `CORS_ORIGINS`
(comma-separated allowed origins).

**Frontend** (`frontend/.env`) — `VITE_API_URL` (backend base URL, read at
build time).

## Testing

- **Postman:** import `backend/postman_collection.json` — every endpoint
  plus the error cases (missing title, bad `dueDate`, malformed JSON,
  invalid/missing id, unknown PATCH field, wrong verb → 405).
- **Automated:** `zsh backend/tests/smoke-test.sh` with the backend running
  — **22/22 checks pass**, including NoSQL-injection and malformed-JSON
  guards.
- **Browser (Part 2):** add / edit / toggle / search / delete / clear
  verified end-to-end, plus the failure path — stopping the backend shows
  the error banner with a working Retry.

## Challenges faced

1. **Port 5000 taken by macOS AirPlay Receiver** → local default moved to
   5001; documented everywhere and overridable via `PORT`.
2. **`completed` vs `status` desyncing (plan C3)** → one pre-save hook +
   service-layer sync always derives one from the other.
3. **Async errors hanging requests in Express 4 (plan C6)** → every handler
   wrapped in `asyncHandler`, all errors funnelled into one
   `errorHandler` middleware (C7).
4. **Route ordering (plan C10)** → static routes (`/completed`, `/stats`,
   `/:id/toggle`) registered before parameterised `/:id`.
5. **Validation & NoSQL injection (plan C4)** → express-validator chains per
   endpoint, field whitelist in the service, 100kb body cap, escaped search
   regex.
6. **PUT silently clearing fields (plan C2/C4.4)** → the inline edit form
   sends the full representation including `status`/`completed`.
7. **Time zones (plan C11)** → the date input is converted to a full
   ISO 8601 string on the client; the server stores UTC.
8. **No Atlas cluster while developing** → in-memory MongoDB fallback so
   everything runs locally with zero external setup.
9. **Serverless hosting on Vercel (plan C13)** → there is no `listen()`
   in production and `server.js` is never loaded; `app.js` carries a
   connect-to-MongoDB middleware and `config/db.js` shares one in-flight
   connect promise, so warm function instances reuse a single connection
   pool instead of racing or exhausting Atlas.

## Submission layout

```
Task_33/
├── README.md              ← this file (both parts overview)
├── backend/               ← Part 1 (its README: backend/README.md)
│   ├── postman_collection.json
│   └── tests/smoke-test.sh
└── frontend/              ← Part 2 (its README: frontend/README.md)
```
