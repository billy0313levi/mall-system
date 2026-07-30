const cors = require('cors');
const express = require('express');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const {
  env,
  logger,
  requireAuth,
  requireRole,
  success,
  errorHandler,
  notFoundHandler,
  AppError
} = require('@mall/common');
const rateLimiter = require('./middlewares/rateLimiter');

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startedAt}ms)`);
  });
  next();
});

app.use(rateLimiter);

app.get('/health', (_req, res) => success(res, { service: 'gateway-service' }, 'gateway ok'));

function attachUserHeaders(proxyReq, req) {
  const hasBody =
    req.body &&
    typeof req.body === 'object' &&
    !['GET', 'HEAD'].includes(req.method) &&
    Object.keys(req.body).length > 0;

  if (hasBody) {
    fixRequestBody(proxyReq, req);
  }

  if (!proxyReq.headersSent && req.user) {
    proxyReq.setHeader('x-user-id', String(req.user.id));
    proxyReq.setHeader('x-user-role', req.user.role);
    proxyReq.setHeader('x-user-name', req.user.username || '');
  }
}

function createServiceProxy(target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    proxyTimeout: 5000,
    pathRewrite: (_path, req) => req.originalUrl,
    on: {
      proxyReq: attachUserHeaders,
      error(error, _req, res) {
        res.status(502).json({
          success: false,
          message: '下游服务暂时不可用',
          code: 'BAD_GATEWAY',
          details: error.message
        });
      }
    }
  });
}

function userAuthPolicy(req, _res, next) {
  const requestPath = req.originalUrl.split('?')[0];
  const publicPaths = ['/api/users/login', '/api/users/register', '/api/users/admin/login'];
  if (publicPaths.includes(requestPath)) {
    return next();
  }
  if (requestPath.startsWith('/api/users/admin')) {
    return requireAuth(req, _res, (authError) => {
      if (authError) {
        return next(authError);
      }
      return requireRole('admin')(req, _res, next);
    });
  }
  return requireAuth(req, _res, next);
}

function productAuthPolicy(req, res, next) {
  const requestPath = req.originalUrl.split('?')[0];
  if (requestPath.startsWith('/api/products/admin')) {
    return requireAuth(req, res, (authError) => {
      if (authError) {
        return next(authError);
      }
      return requireRole('admin')(req, res, next);
    });
  }

  if (req.method === 'GET') {
    return next();
  }

  return next(new AppError('网关不允许访问该商品接口', 403, 'FORBIDDEN'));
}

function orderAuthPolicy(req, res, next) {
  const requestPath = req.originalUrl.split('?')[0];
  if (requestPath.startsWith('/api/orders/admin')) {
    return requireAuth(req, res, (authError) => {
      if (authError) {
        return next(authError);
      }
      return requireRole('admin')(req, res, next);
    });
  }

  return requireAuth(req, res, next);
}

function paymentAuthPolicy(req, res, next) {
  const requestPath = req.originalUrl.split('?')[0];
  if (requestPath === '/api/payments/callback') {
    return next();
  }
  return requireAuth(req, res, next);
}

app.use('/api/users', userAuthPolicy, createServiceProxy(env.services.user.url));
app.use('/api/products', productAuthPolicy, createServiceProxy(env.services.product.url));
app.use('/api/cart', requireAuth, createServiceProxy(env.services.cart.url));
app.use('/api/orders', orderAuthPolicy, createServiceProxy(env.services.order.url));
app.use('/api/payments', paymentAuthPolicy, createServiceProxy(env.services.payment.url));

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.services.gateway.port, () => {
  logger.info(`gateway-service running on port ${env.services.gateway.port}`);
});
