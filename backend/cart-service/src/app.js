const axios = require('axios');
const cors = require('cors');
const express = require('express');
const {
  env,
  getRedisClient,
  requireAuth,
  requireInternalToken,
  logger,
  success,
  wrapAsync,
  notFoundHandler,
  errorHandler,
  AppError
} = require('@mall/common');

const app = express();
const redis = getRedisClient();

app.use(cors());
app.use(express.json());

function cartKey(userId) {
  return `cart:user:${userId}`;
}

function normalizeQuantity(quantity) {
  const parsed = Number(quantity);
  if (Number.isNaN(parsed) || parsed <= 0 || parsed > 99) {
    throw new AppError('商品数量必须在 1 到 99 之间', 400, 'INVALID_QUANTITY');
  }
  return parsed;
}

async function fetchProduct(productId) {
  const response = await axios.get(`${env.services.product.url}/api/products/${productId}`);
  return response.data.data;
}

async function fetchProducts(productIds) {
  if (!productIds.length) {
    return [];
  }
  const response = await axios.post(
    `${env.services.product.url}/internal/products/batch`,
    { productIds },
    {
      headers: {
        'x-internal-token': env.internalServiceToken
      }
    }
  );
  return response.data.data;
}

async function getRawCartItems(userId) {
  const data = await redis.hgetall(cartKey(userId));
  return Object.values(data)
    .map((item) => JSON.parse(item))
    .sort((a, b) => Number(a.productId) - Number(b.productId));
}

async function getCartItems(userId) {
  const rawItems = await getRawCartItems(userId);
  const products = await fetchProducts(rawItems.map((item) => item.productId));
  const productMap = new Map(products.map((item) => [Number(item.id), item]));

  return rawItems.map((item) => {
    const product = productMap.get(Number(item.productId));
    const currentPrice = product ? Number(product.price) : Number(item.price);
    const status = product?.status || 'deleted';
    return {
      ...item,
      currentPrice,
      status,
      stock: Number(product?.stock || 0),
      coverUrl: product?.cover_url || item.coverUrl,
      name: product?.name || item.name,
      available: status === 'on_sale',
      priceChanged: Number(item.price) !== currentPrice
    };
  });
}

app.get('/health', (_req, res) => success(res, { service: 'cart-service' }, 'cart ok'));

app.get(
  '/api/cart',
  requireAuth,
  wrapAsync(async (req, res) => {
    const items = await getCartItems(req.user.id);
    const summary = {
      totalQuantity: items.reduce((sum, item) => sum + Number(item.quantity), 0),
      totalAmount: items
        .filter((item) => item.available)
        .reduce((sum, item) => sum + Number(item.currentPrice) * Number(item.quantity), 0),
      invalidCount: items.filter((item) => !item.available).length
    };
    return success(res, { items, summary }, '获取购物车成功');
  })
);

app.post(
  '/api/cart/items',
  requireAuth,
  wrapAsync(async (req, res) => {
    const productId = Number(req.body.productId);
    const quantity = normalizeQuantity(req.body.quantity);
    if (!productId) {
      throw new AppError('商品ID不能为空', 400, 'INVALID_PRODUCT_ID');
    }

    const product = await fetchProduct(productId);
    const key = cartKey(req.user.id);
    const existing = await redis.hget(key, String(productId));
    const oldQuantity = existing ? JSON.parse(existing).quantity : 0;
    const nextQuantity = oldQuantity + quantity;
    if (nextQuantity > 99) {
      throw new AppError('购物车商品数量不能超过 99', 400, 'INVALID_QUANTITY');
    }

    const item = {
      productId,
      quantity: nextQuantity,
      name: product.name,
      price: Number(product.price),
      coverUrl: product.cover_url,
      addedAt: new Date().toISOString()
    };

    await redis.hset(key, String(productId), JSON.stringify(item));
    return success(res, item, '加入购物车成功');
  })
);

app.put(
  '/api/cart/items/:productId',
  requireAuth,
  wrapAsync(async (req, res) => {
    const productId = Number(req.params.productId);
    const quantity = normalizeQuantity(req.body.quantity);
    const key = cartKey(req.user.id);
    const existing = await redis.hget(key, String(productId));
    if (!existing) {
      throw new AppError('购物车商品不存在', 404, 'CART_ITEM_NOT_FOUND');
    }

    const current = JSON.parse(existing);
    current.quantity = quantity;
    await redis.hset(key, String(productId), JSON.stringify(current));
    return success(res, current, '修改购物车成功');
  })
);

app.delete(
  '/api/cart/items/:productId',
  requireAuth,
  wrapAsync(async (req, res) => {
    await redis.hdel(cartKey(req.user.id), String(Number(req.params.productId)));
    return success(res, null, '删除购物车商品成功');
  })
);

app.delete(
  '/api/cart/clear',
  requireAuth,
  wrapAsync(async (req, res) => {
    await redis.del(cartKey(req.user.id));
    return success(res, null, '清空购物车成功');
  })
);

app.get(
  '/internal/cart/users/:userId',
  requireInternalToken,
  wrapAsync(async (req, res) => {
    const items = await getCartItems(Number(req.params.userId));
    return success(res, { items }, '内部获取购物车成功');
  })
);

app.post(
  '/internal/cart/users/:userId/remove-items',
  requireInternalToken,
  wrapAsync(async (req, res) => {
    const productIds = Array.isArray(req.body.productIds) ? req.body.productIds.map((item) => String(Number(item))) : [];
    if (productIds.length > 0) {
      await redis.hdel(cartKey(Number(req.params.userId)), ...productIds);
    }
    return success(res, null, '内部移除购物车商品成功');
  })
);

app.delete(
  '/internal/cart/users/:userId/clear',
  requireInternalToken,
  wrapAsync(async (req, res) => {
    await redis.del(cartKey(Number(req.params.userId)));
    return success(res, null, '内部清空购物车成功');
  })
);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.services.cart.port, () => {
  logger.info(`cart-service running on port ${env.services.cart.port}`);
});
