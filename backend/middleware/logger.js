/**
 * Request Logging Middleware
 * Logs Request Time, Method, Route, Status Code, and Execution Time
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const statusColor = statusCode >= 500 ? '❌' : statusCode >= 400 ? '⚠️' : '✅';
    
    console.log(
      `[${timestamp}] ${statusColor} ${req.method} ${req.originalUrl} | Status: ${statusCode} | Time: ${duration}ms`
    );
  });

  next();
};

module.exports = requestLogger;
