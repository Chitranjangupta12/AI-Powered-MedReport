/**
 * Centralized Error Handling Middleware
 */

const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error(`API Error on ${req.method} ${req.url}: ${err.message}`, err.stack);

  // Multer file size limit
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: true,
      code: 'FILE_TOO_LARGE',
      message: 'The uploaded file exceeds the 15 MB size limit. Please upload a smaller file.'
    });
  }

  // Multer invalid file type
  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      error: true,
      code: 'INVALID_FILE_TYPE',
      message: err.message
    });
  }

  // SyntaxError from invalid JSON body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: true,
      code: 'INVALID_JSON',
      message: 'Malformed JSON payload in request body.'
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: true,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected error occurred while processing your request.',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}

module.exports = errorHandler;
