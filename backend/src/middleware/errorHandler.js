const ApiError = require('../utils/ApiError');

/**
 * Central error-handling middleware (plan challenge C7).
 *
 * Every failure that reaches here is rendered in the same envelope:
 *   { "success": false, "message": "...", "errors": [{ field, msg }] }
 *
 * It understands four kinds of error:
 *   1. ApiError            — thrown deliberately in services/controllers
 *   2. body-parser SyntaxError — malformed JSON body (400)
 *   3. Mongoose ValidationError / CastError — 400 with field details
 *   4. Mongo duplicate key (11000) — 409
 * Anything else is an unexpected fault and becomes a 500 without
 * leaking internals to the client.
 */
// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  // 1. Malformed JSON — Express raises a SyntaxError with status 400
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Malformed JSON in request body',
    });
  }

  // 2. Deliberate operational error
  if (err instanceof ApiError) {
    const body = {
      success: false,
      message: err.message,
    };
    if (err.errors) body.errors = err.errors;
    return res.status(err.statusCode).json(body);
  }

  // 3. Mongoose schema validation (e.g. enum mismatch caught at save time)
  if (err.name === 'ValidationError' && err.errors) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: Object.values(err.errors).map((e) => ({
        field: e.path,
        msg: e.message,
      })),
    });
  }

  // 4. Mongoose cast error (bad ObjectId that slipped past validation)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid value for "${err.path}"`,
      errors: [{ field: err.path, msg: 'Invalid format' }],
    });
  }

  // 5. MongoDB duplicate key
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: `Duplicate value for "${Object.keys(err.keyValue || {}).join(', ')}"`,
    });
  }

  // 6. Unexpected fault — log it, never leak it
  console.error('[500]', err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
