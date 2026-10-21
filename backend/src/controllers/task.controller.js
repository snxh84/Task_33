const service = require('../services/task.service');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * Task controller — thin HTTP layer.
 *
 * It picks status codes and headers and shapes the standard envelope
 * (§2.1); every bit of business logic lives in the service.
 */

const ok = (res, message, data, status = 200) =>
  res.status(status).json({ success: true, message, data });

exports.create = asyncHandler(async (req, res) => {
  const task = await service.createTask(req.body);
  res.location(`/api/v1/tasks/${task.id}`);
  return ok(res, 'Task created successfully', task, 201);
});

exports.list = asyncHandler(async (req, res) => {
  const data = await service.listTasks(req.query);
  return ok(res, 'Tasks fetched successfully', data);
});

exports.getOne = asyncHandler(async (req, res) => {
  const task = await service.getTaskById(req.params.id);
  return ok(res, 'Task fetched successfully', task);
});

exports.replace = asyncHandler(async (req, res) => {
  const task = await service.replaceTask(req.params.id, req.body);
  return ok(res, 'Task updated successfully', task);
});

exports.patch = asyncHandler(async (req, res) => {
  const task = await service.patchTask(req.params.id, req.body);
  return ok(res, 'Task updated successfully', task);
});

exports.toggle = asyncHandler(async (req, res) => {
  const task = await service.toggleTask(req.params.id);
  return ok(res, 'Task updated successfully', task);
});

exports.remove = asyncHandler(async (req, res) => {
  await service.deleteTask(req.params.id);
  return res.status(204).send(); // 204 No Content — nothing left to represent (§4.7)
});

exports.removeCompleted = asyncHandler(async (req, res) => {
  const deletedCount = await service.deleteCompletedTasks();
  return ok(res, `${deletedCount} completed task${deletedCount === 1 ? '' : 's'} deleted`, {
    deletedCount,
  });
});

exports.stats = asyncHandler(async (req, res) => {
  const data = await service.getStats();
  return ok(res, 'Statistics fetched successfully', data);
});
