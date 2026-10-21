# TD33 Part 1 — To-Do List REST API (Node.js · Express.js · MongoDB)

The backend for the To-Do List app, implementing every endpoint from the
Task 31 API plan using a **controller / service / routes** structure with
central error handling and request validation.

## Tech stack

| Piece | Choice |
| --- | --- |
| Runtime | Node.js (≥ 18) |
| Framework | Express.js 4 |
| Database | MongoDB via Mongoose 8 |
| Validation | express-validator 7 |
| CORS | `cors` with an explicit origin list |
| Local testing DB | `mongodb-memory-server` (dev fallback) |

## Project structure

```
backend/
├── src/
│   ├── server.js                     # entry point — connect DB, app.listen()
│   ├── app.js                        # the Express app (json limit, CORS, routes, error handler)
│   ├── config/
│   │   ├── env.js                    # loads .env once
│   │   └── db.js                     # mongoose connection (cached; in-memory fallback)
│   ├── routes/
│   │   └── task.routes.js            # /api/v1/tasks — paths, methods, validation chains
│   ├── controllers/
│   │   └── task.controller.js        # HTTP layer: status codes, Location header, envelope
│   ├── services/
│   │   └── task.service.js           # business logic + all database queries
│   ├── models/
│   │   └── task.model.js             # Mongoose schema (matches plan §3) + indexes
│   ├── validators/
│   │   └── task.validators.js        # express-validator chains for every endpoint
│   ├── middleware/
│   │   ├── validate.js               # runs validator chains → 400 with field errors
│   │   ├── asyncHandler.js           # catches rejected promises (challenge C6)
│   │   ├── errorHandler.js           # one place renders every error (C7)
│   │   └── notFound.js               # 404 envelope for unknown routes
│   └── utils/
│       ├── ApiError.js               # throwable { statusCode, message, errors }
│       └── methodNotAllowed.js       # 405 with an Allow header
├── tests/
│   └── smoke-test.sh                 # 22 automated curl checks (22/22 passing)
├── postman_collection.json           # import into Postman — all endpoints + error cases
├── .env.example
└── package.json
```

**Request flow:** `routes` (path + validation) → `controller` (HTTP concerns)
→ `service` (business logic + queries) → `model` (MongoDB). Errors thrown
anywhere bubble up to the single error-handling middleware.

## Setup and run

```bash
cd backend
npm install
cp .env.example .env      # then edit .env (see below)
npm start                 # or: npm run dev  (auto-restarts on changes)
```

The API is ready at `http://localhost:5001` (health check: `GET /health`).

> **Why port 5001 and not 5000?** The API plan said 5000, but macOS
> AirPlay Receiver (ControlCenter) already occupies port 5000, so the
> server cannot bind it. The local default is 5001; set `PORT=5000` in
> `.env` if you have disabled AirPlay Receiver. Render always sets its
> own `PORT`.

### Environment variables (`.env`)

| Variable | Required | Example | Purpose |
| --- | --- | --- | --- |
| `PORT` | no | `5001` | Local port; Render injects its own |
| `MONGODB_URI` | **yes in production** | `mongodb+srv://user:pass@cluster0.xx.mongodb.net/todo` | MongoDB Atlas connection string |
| `CORS_ORIGINS` | recommended | `http://localhost:5173,https://your-app.netlify.app` | Comma-separated browser origins allowed to call the API; `*` or empty = allow all (dev) |

**No database yet?** If `MONGODB_URI` is empty the server automatically
starts an **in-memory MongoDB** (mongodb-memory-server) so the API runs and
can be tested locally with zero setup. Data disappears when the server
stops. In production (`NODE_ENV=production`) a missing `MONGODB_URI` is a
hard failure with a clear message. For a free persistent database create a
cluster at [MongoDB Atlas](https://www.mongodb.com/atlas) and paste its
connection string.

## API endpoints

Base path: `/api/v1/tasks`. Every response uses the plan's envelope —
success `{ success, message, data }`, error `{ success: false, message, errors? }`.

| # | Method | Endpoint | Purpose | Success |
| --- | --- | --- | --- | --- |
| 1 | `POST` | `/api/v1/tasks` | create a task (title required) | 201 + `Location` header |
| 2 | `GET` | `/api/v1/tasks` | list — filter, search, sort, paginate | 200 |
| 3 | `GET` | `/api/v1/tasks/:id` | fetch one task | 200 |
| 4 | `PUT` | `/api/v1/tasks/:id` | replace a task (full resource) | 200 |
| 5 | `PATCH` | `/api/v1/tasks/:id` | partial update | 200 |
| 6 | `PATCH` | `/api/v1/tasks/:id/toggle` | flip completion server-side | 200 |
| 7 | `DELETE` | `/api/v1/tasks/:id` | delete one task | 204 |
| 8 | `DELETE` | `/api/v1/tasks/completed` | clear all completed | 200 + `deletedCount` |
| 9 | `GET` | `/api/v1/tasks/stats` | counts for the UI footer | 200 |

Query parameters for `GET /tasks` (all optional):
`status`, `completed`, `priority`, `category`, `search` (case-insensitive
title/description), `sort` (`dueDate:asc` — field and direction),
`page` (1-based), `limit` (1–100).

### Example

```bash
curl -X POST http://localhost:5001/api/v1/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Buy groceries","priority":"high","dueDate":"2026-10-25T18:30:00.000Z"}'

curl 'http://localhost:5001/api/v1/tasks?status=pending&sort=dueDate:asc&limit=5'
```

## Testing

### Postman (as required by the assignment)

1. Open Postman → **Import** → choose `backend/postman_collection.json`.
2. The collection's `baseUrl` variable defaults to `http://localhost:5001`
   (change it if you run elsewhere).
3. Run **POST — Create a task** first: its test script stores the new
   task's id in the `taskId` variable, which the GET/PUT/PATCH/DELETE
   requests use automatically.

The collection covers every endpoint plus the failure cases: missing title,
unparseable `dueDate`, malformed JSON, invalid id (400), missing id (404),
unknown PATCH field, `limit` over cap, wrong verb (405), unknown route (404).

### Automated smoke test

```bash
npm start            # in one terminal
zsh tests/smoke-test.sh   # in another — expects the API on port 5001
```

**22/22 checks pass**, including the security checks: malformed JSON → 400,
NoSQL operator injection in the query string (`?status[$ne]=…`) → 400,
and a PATCH carrying only unknown fields → 400.

## Challenges faced (and how they were addressed)

1. **Port 5000 already in use.** On macOS the AirPlay Receiver binds port
   5000, so `listen` failed with `EADDRINUSE`. The local default became
   5001 (`PORT` remains overridable), and the conflict is documented here.
2. **`completed` vs `status` (plan C3).** The schema stores both a boolean
   and an enum, which can contradict each other. A `pre-save` hook (and the
   service layer) always derives one from the other — when both are sent,
   `status` wins — so a single write path can never desynchronise them.
3. **Async errors hanging requests (plan C6).** Express 4 swallows rejected
   promises in async handlers. Every handler is wrapped in `asyncHandler`,
   so any thrown `ApiError` reaches the central error middleware instead of
   leaving the client waiting forever.
4. **Route ordering (plan C10).** `DELETE /completed` and `GET /stats` are
   registered **before** `/:id`, otherwise Express would capture
   `completed`/`stats` as an `:id` and answer "invalid ObjectId". A comment
   in `task.routes.js` guards this for future edits.
5. **Validation & injection (plan C4).** Express validates nothing by
   default. Every field has an express-validator chain, the service picks
   only whitelisted fields, `express.json({ limit: '100kb' })` caps bodies,
   the search regex is escaped, and the malformed-JSON `SyntaxError` is
   translated to a clean 400 by the error middleware.
6. **Consistent errors (plan C7).** Instead of each handler inventing its
   own error shape, a single `ApiError` class + `errorHandler` middleware
   renders every failure (validation, cast, duplicate key, 500) in the same
   envelope, so the React app needs just one error parser.
7. **No Atlas cluster during development.** `config/db.js` falls back to an
   in-memory MongoDB when `MONGODB_URI` is empty (non-production only), so
   the API — and the whole Part 2 integration — can be developed and tested
   without any external account, while production still requires a real URI.

## Deploying the backend (Render)

1. Push this repository to GitHub.
2. On [Render](https://render.com): **New → Web Service** → pick the repo,
   set **Root Directory** to `backend`.
3. Build command: `npm install` · Start command: `npm start`.
4. Add the environment variables: `MONGODB_URI` (your Atlas string) and
   `CORS_ORIGINS=https://your-frontend.netlify.app`.
5. Render assigns `PORT` automatically — the app uses it. Health check
   path: `/health`.
6. Add your Atlas network access: allow `0.0.0.0/0` (or Render's IPs) under
   Atlas → Database Access → Network Access.
