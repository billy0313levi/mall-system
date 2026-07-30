const { env, getRedisClient, AppError } = require('@mall/common');

function resolveRule(req) {
  const path = req.originalUrl.split('?')[0];
  if (path === '/api/users/login' || path === '/api/users/admin/login') {
    return { route: 'login', maxRequests: env.rateLimit.loginMax };
  }
  if (req.method === 'GET' && path.startsWith('/api/products')) {
    return { route: 'products', maxRequests: env.rateLimit.productQueryMax };
  }
  if (req.method === 'POST' && path === '/api/orders') {
    return { route: 'orders:create', maxRequests: env.rateLimit.orderCreateMax };
  }
  return { route: 'default', maxRequests: env.rateLimit.maxRequests };
}

module.exports = async function rateLimiter(req, _res, next) {
  try {
    const redis = getRedisClient();
    const identifier = req.headers.authorization || req.ip || 'anonymous';
    const rule = resolveRule(req);
    const key = `rate_limit:${rule.route}:${identifier}:${Math.floor(Date.now() / 1000 / env.rateLimit.windowSeconds)}`;
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, env.rateLimit.windowSeconds);
    }

    if (count > rule.maxRequests) {
      throw new AppError(`请求过于频繁，请在 ${env.rateLimit.windowSeconds} 秒后重试`, 429, 'RATE_LIMIT_EXCEEDED');
    }

    next();
  } catch (error) {
    next(error);
  }
};
