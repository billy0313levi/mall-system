const env = require('./config/env');
const { getMysqlPool, execute, withTransaction } = require('./db/mysql');
const { getRedisClient } = require('./db/redis');
const { getRabbitChannel, publishMessage, consumeMessage } = require('./db/rabbitmq');
const AppError = require('./errors/AppError');
const { requireAuth, optionalAuth, requireRole, requireInternalToken } = require('./middlewares/auth');
const logger = require('./utils/logger');
const { success, fail, wrapAsync, notFoundHandler, errorHandler } = require('./utils/response');
const jwt = require('./utils/jwt');

module.exports = {
  env,
  getMysqlPool,
  execute,
  withTransaction,
  getRedisClient,
  getRabbitChannel,
  publishMessage,
  consumeMessage,
  AppError,
  requireAuth,
  optionalAuth,
  requireRole,
  requireInternalToken,
  logger,
  success,
  fail,
  wrapAsync,
  notFoundHandler,
  errorHandler,
  jwt
};

