const mongoose = require('mongoose');
const Task = require('../models/task.model');
const ApiError = require('../utils/ApiError');

/**
 * Task service — all business logic lives here.
 *
 * The controller only translates HTTP ↔ this layer, and the routes only
 * declare paths and validation (controller / service / routes structure).
 */

const TASK_FIELDS = ['title', 'description', 'completed', 'status', 'priority', 'dueDate', 'category'];

/** Copies only known, client-writable fields — the whitelist of C4. */
function pickFields(body) {
  return TASK_FIELDS.reduce((acc, field) => {
    if (Object.prototype.hasOwnProperty.call(body, field) && body[field] !== undefined) {
      acc[field] = body[field];
    }
    return acc;
  }, {});
}

/**
 * Keeps `completed` and `status` in step (C3). `status` is authoritative
 * when both are sent; when only `completed` is sent, status follows it.
 */
function syncCompletion(data) {
  if (data.status !== undefined && data.status !== null) {
    data.completed = data.status === 'completed';
  } else if (data.completed !== undefined && data.completed !== null) {
    data.completed = Boolean(data.completed);
    if (data.completed) data.status = 'completed';
    else if (data.status === undefined) data.status = 'pending';
  }
  if (data.status === undefined) delete data.status;
  if (data.dueDate === '') data.dueDate = null;
  if (data.description === undefined || data.description === null) delete data.description;
  if (data.category === undefined || data.category === null) delete data.category;
  return data;
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseSort(sort) {
  const [field, direction = 'asc'] = String(sort || 'createdAt:desc').split(':');
  return { [field]: direction === 'desc' ? -1 : 1 };
}

async function findTaskOrThrow(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw ApiError.badRequest('Invalid task id format', [{ field: 'id', msg: 'Invalid task id format' }]);
  }
  const task = await Task.findById(id);
  if (!task) throw ApiError.notFound(`Task with id ${id} not found`);
  return task;
}

/* ------------------------------------------------------------------ */
/* C — create                                                          */
/* ------------------------------------------------------------------ */

async function createTask(body) {
  const data = syncCompletion(pickFields(body));
  return Task.create(data); // create() runs validation + pre-save hook
}

/* ------------------------------------------------------------------ */
/* R — read                                                            */
/* ------------------------------------------------------------------ */

async function listTasks(query) {
  const { status, completed, priority, category, search, sort, page = 1, limit = 10 } = query;

  const filter = {};
  if (status) filter.status = status;
  if (completed !== undefined) filter.completed = completed;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;
  if (search) {
    // Anchored-to-nothing but escaped: literal, case-insensitive match (C4/C5)
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: regex }, { description: regex }];
  }

  const skip = (page - 1) * limit;

  const [tasks, totalTasks] = await Promise.all([
    Task.find(filter).sort(parseSort(sort)).skip(skip).limit(limit),
    Task.countDocuments(filter),
  ]);

  return {
    tasks,
    pagination: {
      page,
      limit,
      totalTasks,
      totalPages: Math.ceil(totalTasks / limit),
    },
  };
}

async function getTaskById(id) {
  return findTaskOrThrow(id);
}

async function getStats() {
  const [total, completed, pending, inProgress, byPriorityAgg] = await Promise.all([
    Task.countDocuments(),
    Task.countDocuments({ status: 'completed' }),
    Task.countDocuments({ status: 'pending' }),
    Task.countDocuments({ status: 'in-progress' }),
    Task.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
  ]);

  const byPriority = { high: 0, medium: 0, low: 0 };
  byPriorityAgg.forEach((row) => {
    if (Object.prototype.hasOwnProperty.call(byPriority, row._id)) byPriority[row._id] = row.count;
  });

  return { total, completed, pending, inProgress, byPriority };
}

/* ------------------------------------------------------------------ */
/* U — update                                                          */
/* ------------------------------------------------------------------ */

async function replaceTask(id, body) {
  const task = await findTaskOrThrow(id);

  // PUT replaces the whole representation: anything absent reverts to
  // its default (C2). Server-owned fields (id/createdAt/updatedAt) are
  // never accepted from the client.
  const data = {
    title: body.title,
    description: body.description ?? '',
    priority: body.priority ?? 'medium',
    dueDate: body.dueDate ?? null,
    category: body.category ?? '',
  };

  if (body.status !== undefined && body.status !== null) {
    data.status = body.status;
    data.completed = data.status === 'completed';
  } else if (body.completed !== undefined && body.completed !== null) {
    data.completed = Boolean(body.completed);
    data.status = data.completed ? 'completed' : 'pending';
  } else {
    data.status = 'pending';
    data.completed = false;
  }
  if (data.dueDate === '') data.dueDate = null;

  task.set(data);
  await task.save();
  return task;
}

async function patchTask(id, body) {
  const task = await findTaskOrThrow(id);
  const data = pickFields(body);

  if ('title' in data && (data.title === undefined || data.title === null)) delete data.title;
  if ('description' in data && data.description === null) data.description = '';
  if ('category' in data && data.category === null) data.category = '';
  if ('dueDate' in data && (data.dueDate === '' || data.dueDate === null)) data.dueDate = null;
  if ('priority' in data && data.priority === null) delete data.priority;

  // C3: one fact, two fields — derive whichever wasn't sent explicitly.
  if ('status' in data && data.status !== undefined && data.status !== null) {
    data.completed = data.status === 'completed';
  } else {
    delete data.status;
    if ('completed' in data) {
      data.completed = Boolean(data.completed);
      if (data.completed) data.status = 'completed';
      else if (task.status === 'completed') data.status = 'pending';
    }
  }

  task.set(data);
  await task.save();
  return task;
}

async function toggleTask(id) {
  const task = await findTaskOrThrow(id);
  // The flip happens on the server against the stored value, so two
  // clients can never disagree about the current state (§4.6).
  task.completed = !task.completed;
  task.status = task.completed ? 'completed' : 'pending';
  await task.save();
  return task;
}

/* ------------------------------------------------------------------ */
/* D — delete                                                          */
/* ------------------------------------------------------------------ */

async function deleteTask(id) {
  const task = await findTaskOrThrow(id);
  await task.deleteOne();
}

async function deleteCompletedTasks() {
  const result = await Task.deleteMany({ $or: [{ status: 'completed' }, { completed: true }] });
  return result.deletedCount; // 0 is a success, not a 404 (§4.8)
}

module.exports = {
  createTask,
  listTasks,
  getTaskById,
  getStats,
  replaceTask,
  patchTask,
  toggleTask,
  deleteTask,
  deleteCompletedTasks,
};
