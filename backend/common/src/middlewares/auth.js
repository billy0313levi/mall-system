const AppError = require('../errors/AppError');
const jwt = require('../utils/jwt');
const env = require('../config/env');
const { getRedisClient } = require('../db/redis');

function extractBearerToken(req) {
  const authorization = req.headers.authorization || '';
  return authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
}

function buildUserFromHeaders(req) {
  if (!req.headers['x-user-id']) {
    return null;
  }

  return {
    id: Number(req.headers['x-user-id']),
    username: req.headers['x-user-name'],
    role: req.headers['x-user-role'] || 'user'
  };
}

async function resolveUser(req) {
  const headerUser = buildUserFromHeaders(req);
  const token = extractBearerToken(req);
  if (token) {
    req.token = token;
  }
  if (headerUser) {
    return headerUser;
  }

  if (!token) {
    return null;
  }

  const redis = getRedisClient();
  const isBlacklisted = await redis.exists(`token:blacklist:${token}`);
  if (isBlacklisted) {
    throw new AppError('登录状态已失效，请重新登录', 401, 'TOKEN_BLACKLISTED');
  }

  return jwt.verifyToken(token);
}

function optionalAuth(req, _res, next) {
  resolveUser(req)
    .then((user) => {
      req.user = user;
      next();
    })
    .catch(next);
}

function requireAuth(req, _res, next) {
  resolveUser(req)
    .then((user) => {
      if (!user) {
        throw new AppError('未登录或令牌无效', 401, 'UNAUTHORIZED');
      }
      req.user = user;
      next();
    })
    .catch(next);
}

function requireRole(roles) {
  const roleList = Array.isArray(roles) ? roles : [roles];

  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('请先登录', 401, 'UNAUTHORIZED'));
    }

    if (!roleList.includes(req.user.role)) {
      return next(new AppError('无权限访问该资源', 403, 'FORBIDDEN'));
    }

    return next();
  };
}

function requireInternalToken(req, _res, next) {
  if (req.headers['x-internal-token'] !== env.internalServiceToken) {
    return next(new AppError('内部服务调用鉴权失败', 403, 'FORBIDDEN'));
  }

  return next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole,
  requireInternalToken
};
