const AppError = require('../errors/AppError');
const logger = require('./logger');

function success(res, data = null, message = 'ok') {
  return res.json({
    success: true,
    message,
    data
  });
}

function fail(res, message = 'error', code = 'ERROR', details = null, statusCode = 400) {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
    details
  });
}

function wrapAsync(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function notFoundHandler(_req, _res, next) {
  next(new AppError('接口不存在', 404, 'NOT_FOUND'));
}

function errorHandler(error, req, res, _next) {
  if (!(error instanceof AppError)) {
    logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, error);
  }

  const appError =
    error instanceof AppError
      ? error
      : new AppError(error.message || '服务器内部错误', error.statusCode || 500, error.code || 'INTERNAL_ERROR');

  return fail(res, appError.message, appError.code, appError.details, appError.statusCode);
}

module.exports = {
  success,
  fail,
  wrapAsync,
  notFoundHandler,
  errorHandler
};

