/**
 * asyncHandler — wraps an async route handler so a rejected promise
 * is forwarded to Express (plan challenge C6).
 *
 * In Express 4 a rejected promise inside an async handler is silently
 * dropped and the request hangs forever; this one-line wrapper turns
 * it into next(err) so the central error middleware can respond.
 */
module.exports = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
