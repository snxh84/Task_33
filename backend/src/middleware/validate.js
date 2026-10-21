const { validationResult } = require('express-validator');

/**
 * validate — runs the express-validator chains registered on a route.
 *
 * On failure it responds 400 immediately with the standard envelope
 * and an errors array of { field, msg } (plan §2.1), so the React app
 * can attach messages to the right input.
 */
module.exports = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((e) => ({
    field: e.path || 'body',
    msg: e.msg,
  }));

  res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors,
  });
};
