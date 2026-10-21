const router = require('express').Router();

const controller = require('../controllers/task.controller');
const v = require('../validators/task.validators');
const validate = require('../middleware/validate');
const methodNotAllowed = require('../utils/methodNotAllowed');

/**
 * Task routes — mounted at /api/v1/tasks in app.js.
 *
 * Route-ordering (challenge C10): every static segment (/completed,
 * /stats, /:id/toggle) is registered BEFORE the parameterised /:id
 * routes, because Express matches in registration order. Otherwise
 * "completed" would be captured as an :id and rejected as an invalid
 * ObjectId.
 */

// Collection — GET list / POST create; anything else is 405.
router
  .route('/')
  .get(v.listTasks, validate, controller.list)
  .post(v.createTask, validate, controller.create)
  .all((req, res, next) =>
    req.method === 'OPTIONS' ? next() : methodNotAllowed(req, res, ['GET', 'POST'])
  );

// Static members — must come before /:id.
router.delete('/completed', controller.removeCompleted);
router.get('/stats', controller.stats);

// Action sub-resource.
router.patch('/:id/toggle', v.taskId, validate, controller.toggle);

// Single task — GET / PUT / PATCH / DELETE; anything else is 405.
router
  .route('/:id')
  .get(v.taskId, validate, controller.getOne)
  .put(v.taskId, v.replaceTask, validate, controller.replace)
  .patch(v.taskId, v.patchTask, validate, controller.patch)
  .delete(v.taskId, validate, controller.remove)
  .all((req, res, next) =>
    req.method === 'OPTIONS' ? next() : methodNotAllowed(req, res, ['GET', 'PUT', 'PATCH', 'DELETE'])
  );

module.exports = router;
