const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log full error
  logger.error(`${req.method} ${req.originalUrl} ${status} - ${message}`, { error: err.stack });

  res.status(status).json({
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};
