const mongoose = require('mongoose');
const { body, param, query } = require('express-validator');

const STATUSES = ['pending', 'in-progress', 'completed'];
const PRIORITIES = ['low', 'medium', 'high'];
const SORTABLE_FIELDS = ['title', 'dueDate', 'createdAt', 'updatedAt', 'priority', 'status'];

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error('Must be true or false');
};

/** title — required, 1–200 chars after trimming (§3). */
const titleRule = body('title')
  .trim()
  .notEmpty()
  .withMessage('Title is required')
  .bail()
  .isLength({ max: 200 })
  .withMessage('Title must be at most 200 characters');

const descriptionRule = body('description')
  .optional({ values: 'null' })
  .trim()
  .isLength({ max: 2000 })
  .withMessage('Description must be at most 2000 characters');

const statusRule = body('status')
  .optional({ values: 'null' })
  .isIn(STATUSES)
  .withMessage('Status must be pending, in-progress or completed');

const priorityRule = body('priority')
  .optional({ values: 'null' })
  .isIn(PRIORITIES)
  .withMessage('Priority must be low, medium or high');

const completedRule = body('completed')
  .optional({ values: 'null' })
  .isBoolean()
  .withMessage('completed must be a boolean')
  .toBoolean();

const dueDateRule = body('dueDate')
  .optional({ values: 'null' })
  .custom((value) => {
    if (value === null || value === '') return true;
    if (Number.isNaN(new Date(value).getTime())) {
      throw new Error('dueDate must be a valid ISO 8601 date');
    }
    return true;
  });

const categoryRule = body('category')
  .optional({ values: 'null' })
  .trim()
  .isLength({ max: 100 })
  .withMessage('Category must be at most 100 characters');

/** POST /tasks and PUT /tasks/:id — full representation, title required. */
const createTask = [titleRule, descriptionRule, completedRule, statusRule, priorityRule, dueDateRule, categoryRule];

/** PUT /tasks/:id — same as create: PUT replaces the whole resource (§4.4). */
const replaceTask = createTask;

/** PATCH /tasks/:id — every field optional, but at least one known field (§4.5). */
const patchTask = [
  body()
    .custom((value) => {
      const allowed = ['title', 'description', 'completed', 'status', 'priority', 'dueDate', 'category'];
      const provided = Object.keys(value && typeof value === 'object' ? value : {});
      if (provided.length === 0) {
        throw new Error('Request body must contain at least one field to update');
      }
      if (!provided.some((key) => allowed.includes(key))) {
        throw new Error(`None of the provided fields are updatable. Allowed: ${allowed.join(', ')}`);
      }
      return true;
    }),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .bail()
    .isLength({ max: 200 })
    .withMessage('Title must be at most 200 characters'),
  descriptionRule,
  completedRule,
  statusRule,
  priorityRule,
  dueDateRule,
  categoryRule,
];

/** :id path parameter — rejected as 400 *before* the query runs (§4.3). */
const taskId = [
  param('id')
    .custom((value) => mongoose.isValidObjectId(value))
    .withMessage('Invalid task id format'),
];

/** GET /tasks — filtering, sorting and pagination as query params (§4.2). */
const listTasks = [
  query('status').optional().isIn(STATUSES).withMessage('Status must be pending, in-progress or completed'),
  query('completed').optional().custom(parseBoolean).withMessage('completed must be true or false'),
  query('priority').optional().isIn(PRIORITIES).withMessage('Priority must be low, medium or high'),
  query('category').optional().trim().isLength({ max: 100 }).withMessage('Category must be at most 100 characters'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search must be at most 100 characters'),
  query('sort')
    .optional()
    .custom((value) => {
      const [field, direction] = String(value).split(':');
      if (!SORTABLE_FIELDS.includes(field)) {
        throw new Error(`Cannot sort by "${field}". Allowed: ${SORTABLE_FIELDS.join(', ')}`);
      }
      if (direction && !['asc', 'desc'].includes(direction)) {
        throw new Error('Sort direction must be asc or desc');
      }
      return true;
    }),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),
];

module.exports = {
  STATUSES,
  PRIORITIES,
  SORTABLE_FIELDS,
  createTask,
  replaceTask,
  patchTask,
  taskId,
  listTasks,
};
