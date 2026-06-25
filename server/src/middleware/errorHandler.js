const { logger } = require('../utils/logger');

/**
 * 404 handler for undefined routes.
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    error_code: 'NOT_FOUND'
  });
}

/**
 * Global error handler.
 * Catches all errors thrown in route handlers and middleware.
 */
function globalErrorHandler(err, req, res, next) {
  // Log the error
  logger.error(`${err.statusCode || 500} - ${err.message}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Handle validation errors from express-validator
  if (err.errors && err.statusCode === 400) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: err.errors,
      error_code: 'VALIDATION_ERROR'
    });
  }

  // Handle known operational errors
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error_code: err.errorCode,
      ...(err.errors && { errors: err.errors })
    });
  }

  // Handle MySQL duplicate entry errors
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'A record with this information already exists.',
      error_code: 'CONFLICT'
    });
  }

  // Unknown errors — don't leak details in production
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred.',
    error_code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = { notFoundHandler, globalErrorHandler };
