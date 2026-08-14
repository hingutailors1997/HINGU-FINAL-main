const { sendError } = require('../utils/response');

/**
 * Global API Error Handling Middleware
 * Catches unhandled exceptions and validation errors, formatting them cleanly
 * without exposing sensitive stack traces to frontend users.
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.originalUrl} - ${err.message}`);
  if (err.stack && process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  // Handle Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    const messages = {};
    Object.keys(err.errors).forEach(field => {
      messages[field] = err.errors[field].message;
    });
    return sendError(res, 400, 'Validation Error', messages);
  }

  // Handle Mongoose Duplicate Key Error (e.g. Duplicate Mobile, Email, Barcode)
  if (err.code && err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const val = err.keyValue ? err.keyValue[field] : '';
    return sendError(res, 409, `Duplicate ${field}: '${val}' already exists.`, { field, value: val });
  }

  // Handle Mongoose CastError (Invalid ObjectId)
  if (err.name === 'CastError') {
    return sendError(res, 400, `Invalid ${err.path}: ${err.value}`, { path: err.path, value: err.value });
  }

  // Handle JWT Error
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 401, 'Invalid authentication token.', { type: 'AuthError' });
  }

  // Default Fallback
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  const message = err.message || 'Internal Server Error';
  
  return sendError(res, statusCode, message, process.env.NODE_ENV === 'production' ? {} : { stack: err.stack });
};

module.exports = errorHandler;
