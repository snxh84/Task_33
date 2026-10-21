/**
 * ApiError — a single class for every expected failure.
 *
 * Thrown anywhere in the service/controller layer and rendered by the
 * central error-handling middleware (see middleware/errorHandler.js),
 * so every error response has the same shape (plan §2.1).
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors; // optional [{ field, msg }] list
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', errors) {
    return new ApiError(400, message, errors);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }
}

module.exports = ApiError;
