import client from './client';

/**
 * Task API functions — one function per endpoint from the API plan.
 * Components never touch Axios directly; they call these.
 */

/** Drops empty values so they never become query parameters. */
const cleanParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null)
  );

/** GET /api/v1/tasks — list, filter, sort, paginate (§4.2). */
export async function listTasks(params = {}) {
  const res = await client.get('/tasks', { params: cleanParams(params) });
  return res.data.data; // { tasks, pagination }
}

/** POST /api/v1/tasks — create (§4.1). */
export async function createTask(body) {
  const res = await client.post('/tasks', body);
  return res.data.data;
}

/** GET /api/v1/tasks/:id — one task (§4.3). */
export async function getTask(id) {
  const res = await client.get(`/tasks/${id}`);
  return res.data.data;
}

/** PUT /api/v1/tasks/:id — full replace (§4.4). */
export async function replaceTask(id, body) {
  const res = await client.put(`/tasks/${id}`, body);
  return res.data.data;
}

/** PATCH /api/v1/tasks/:id — partial update (§4.5). */
export async function patchTask(id, body) {
  const res = await client.patch(`/tasks/${id}`, body);
  return res.data.data;
}

/** PATCH /api/v1/tasks/:id/toggle — server-side flip (§4.6). */
export async function toggleTask(id) {
  const res = await client.patch(`/tasks/${id}/toggle`);
  return res.data.data;
}

/** DELETE /api/v1/tasks/:id — 204 No Content (§4.7). */
export async function deleteTask(id) {
  await client.delete(`/tasks/${id}`);
}

/** DELETE /api/v1/tasks/completed — clear completed (§4.8). */
export async function clearCompletedTasks() {
  const res = await client.delete('/tasks/completed');
  return res.data.data; // { deletedCount }
}

/** GET /api/v1/tasks/stats — footer counts (§4.9). */
export async function getStats() {
  const res = await client.get('/tasks/stats');
  return res.data.data;
}
