/**
 * Standardized API Response helper function
 * Ensures consistency across all module routes in accordance with Production API design
 */

const sendSuccess = (res, statusCode = 200, message = 'Success', data = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const sendError = (res, statusCode = 500, message = 'Server Error', error = {}) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: typeof error === 'string' ? { details: error } : error
  });
};

module.exports = {
  sendSuccess,
  sendError
};
