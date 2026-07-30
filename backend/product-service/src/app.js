const axios = require('axios');
const cors = require('cors');
const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const {
  env,
  execute,
  withTransaction,
  getRedisClient,
  requireAuth,
  requireRole,
  requireInternalToken,
  consumeMessage,
  logger,
  success,
  wrapAsync,
  notFoundHandler,
  errorHandler,
  AppError
} = require('@mall/common');
const { productDetailKey, productListKey, randomTtl } = require('./cache/keys');

const app = express();
const redis = getRedisClient();
const EMPTY_VALUE = '__EMPTY__';
const uploadDir = path.join(__dirname, '..', 'uploads');

fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, uploadDir);
    },
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname || '').toLowerCase() || '.png';
      const fileName = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}${extension}`;
      callback(null, fileName);
    }
  }),
  limits: {
    fileSize: 2 * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      callback(new AppError('仅支持上传 jpg、png、webp 等图片文件', 400, 'INVALID_UPLOAD_FILE'));
      return;
    }
    callback(null, true);
  }
});

app.use(cors());
app.use(express.json());
app.use('/api/products/uploads', express.static(uploadDir));

async function deleteProductCache(productId) {
  await redis.del(productDetailKey(productId));

  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'product:list:*', 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== '0');
}

function normalizePage(value, fallback) {
  const parsed = Number(value || fallback);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

function validateCategoryPayload(body) {
  if (!body.name || String(body.name).trim().length < 2) {
    throw new AppError('分类名称至少 2 个字符', 400, 'INVALID_CATEGORY_NAME');
  }
}

function validateProductPayload(body) {
  if (!body.categoryId || !body.name) {
    throw new AppError('商品分类和名称不能为空', 400, 'INVALID_PRODUCT_PAYLOAD');
  }
  if (Number(body.price) < 0) {
    throw new AppError('商品价格不能小于 0', 400, 'INVALID_PRODUCT_PRICE');
  }
  if (Number(body.stock) < 0) {
    throw new AppError('商品库存不能小于 0', 400, 'INVALID_PRODUCT_STOCK');
  }
}

async function findMessageLog(messageId, consumerName) {
  if (!messageId) {
    return null;
  }
  const rows = await execute('SELECT * FROM message_logs WHERE message_id = ? AND consumer_name = ? LIMIT 1', [messageId, consumerName]);
  return rows[0] || null;
}

async function setMessageLog(messageId, consumerName, eventType, businessKey, status, errorMessage = '') {
  if (!messageId) {
    return;
  }
  const existing = await findMessageLog(messageId, consumerName);
  if (!existing) {
    await execute(
      `INSERT INTO message_logs (message_id, consumer_name, event_type, business_key, status, error_message, processed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [messageId, consumerName, eventType, businessKey, status, errorMessage, status === 'success' ? new Date() : null]
    );
    return;
  }
  await execute(
    `UPDATE message_logs
     SET event_type = ?, business_key = ?, status = ?, error_message = ?, processed_at = ?, updated_at = NOW()
     WHERE message_id = ? AND consumer_name = ?`,
    [eventType, businessKey, status, errorMessage, status === 'success' ? new Date() : existing.processed_at, messageId, consumerName]
  );
}

async function loadProductDetail(productId, includeHidden = false) {
  const cacheKey = productDetailKey(productId);
  if (!includeHidden) {
    const cached = await redis.get(cacheKey);
    if (cached === EMPTY_VALUE) {
      return null;
    }
    if (cached) {
      return JSON.parse(cached);
    }
  }

  const rows = await execute(
    `SELECT p.id, p.category_id, c.name AS category_name, p.name, p.subtitle, p.description, p.price, p.status, p.cover_url,
            p.sales_count, s.stock, s.locked_stock, p.created_at, p.updated_at
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN product_stock s ON s.product_id = p.id
     WHERE p.id = ? ${includeHidden ? '' : "AND p.status = 'on_sale'"} LIMIT 1`,
    [productId]
  );
  const product = rows[0] || null;

  if (!includeHidden) {
    if (!product) {
      await redis.set(cacheKey, EMPTY_VALUE, 'EX', 120);
      return null;
    }
    await redis.set(cacheKey, JSON.stringify(product), 'EX', randomTtl(600));
  }

  return product;
}

async function fetchProductsByIds(productIds) {
  if (!productIds.length) {
    return [];
  }
  const placeholders = productIds.map(() => '?').join(', ');
  return execute(
    `SELECT p.id, p.category_id, c.name AS category_name, p.name, p.subtitle, p.description, p.price, p.status, p.cover_url,
            p.sales_count, s.stock, s.locked_stock, p.created_at, p.updated_at
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN product_stock s ON s.product_id = p.id
     WHERE p.id IN (${placeholders})`,
    productIds
  );
}

async function postOrderLog(orderNo, action, content) {
  await axios.post(
    `${env.services.order.url}/internal/orders/${orderNo}/logs`,
    { action, content },
    {
      headers: {
        'x-internal-token': env.internalServiceToken
      }
    }
  );
}

async function patchOrderStatus(orderNo, status, content) {
  await axios.patch(
    `${env.services.order.url}/internal/orders/${orderNo}/status`,
    { status, content },
    {
      headers: {
        'x-internal-token': env.internalServiceToken
      }
    }
  );
}

async function adjustStockItems(items, factor) {
  await withTransaction(async (connection) => {
    for (const item of items) {
      const quantity = Number(item.quantity);
      const [rows] = await connection.execute('SELECT stock FROM product_stock WHERE product_id = ? FOR UPDATE', [Number(item.productId)]);
      const current = rows[0];
      if (!current) {
        throw new AppError(`库存记录不存在: ${item.productId}`, 404, 'STOCK_NOT_FOUND');
      }
      if (factor < 0 && Number(current.stock) < quantity) {
        throw new AppError(`商品 ${item.productId} 库存不足`, 400, 'INSUFFICIENT_STOCK');
      }

      if (factor < 0) {
        await connection.execute('UPDATE product_stock SET stock = stock - ? WHERE product_id = ?', [quantity, Number(item.productId)]);
      } else {
        await connection.execute('UPDATE product_stock SET stock = stock + ? WHERE product_id = ?', [quantity, Number(item.productId)]);
      }
    }
  });

  for (const item of items) {
    await deleteProductCache(Number(item.productId));
  }
}

async function handleStockDeductMessage(payload, meta) {
  const consumerName = 'product-stock-deduct-consumer';
  const existing = await findMessageLog(meta.messageId, consumerName);
  if (existing?.status === 'success') {
    return;
  }
  await setMessageLog(meta.messageId, consumerName, meta.routingKey, payload.orderNo, 'processing');

  try {
    await adjustStockItems(payload.items || [], -1);
    await postOrderLog(payload.orderNo, 'stock_deducted', '库存扣减完成，订单等待支付');
    await setMessageLog(meta.messageId, consumerName, meta.routingKey, payload.orderNo, 'success');
  } catch (error) {
    await patchOrderStatus(payload.orderNo, 'failed', `库存扣减失败: ${error.message}`);
    await setMessageLog(meta.messageId, consumerName, meta.routingKey, payload.orderNo, 'failed', error.message);
    throw error;
  }
}

async function handleStockRollbackMessage(payload, meta) {
  const consumerName = 'product-stock-rollback-consumer';
  const existing = await findMessageLog(meta.messageId, consumerName);
  if (existing?.status === 'success') {
    return;
  }
  await setMessageLog(meta.messageId, consumerName, meta.routingKey, payload.orderNo, 'processing');

  try {
    await adjustStockItems(payload.items || [], 1);
    await postOrderLog(payload.orderNo, 'stock_rollback_completed', '库存补偿完成');
    await setMessageLog(meta.messageId, consumerName, meta.routingKey, payload.orderNo, 'success');
  } catch (error) {
    await setMessageLog(meta.messageId, consumerName, meta.routingKey, payload.orderNo, 'failed', error.message);
    throw error;
  }
}

async function startProductConsumers() {
  await consumeMessage(env.rabbitmq.queues.stockDeduct, handleStockDeductMessage);
  await consumeMessage(env.rabbitmq.queues.stockRollback, handleStockRollbackMessage);
}

app.get('/health', (_req, res) => success(res, { service: 'product-service' }, 'product ok'));

app.get(
  '/api/products/categories',
  wrapAsync(async (_req, res) => {
    const rows = await execute(
      'SELECT id, name, parent_id, sort_order, status, created_at, updated_at FROM categories WHERE status = 1 ORDER BY sort_order DESC, id ASC'
    );
    return success(res, rows, '获取分类成功');
  })
);

app.get(
  '/api/products',
  wrapAsync(async (req, res) => {
    const page = normalizePage(req.query.page, 1);
    const pageSize = Math.min(normalizePage(req.query.pageSize, 10), 50);
    const keyword = (req.query.keyword || '').trim();
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
    const cacheKey = productListKey({ page, pageSize, keyword, categoryId });
    const cached = await redis.get(cacheKey);

    if (cached) {
      return success(res, JSON.parse(cached), '获取商品列表成功');
    }

    const whereSql = ["p.status = 'on_sale'"];
    const params = [];
    if (keyword) {
      whereSql.push('(p.name LIKE ? OR p.subtitle LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (categoryId) {
      whereSql.push('p.category_id = ?');
      params.push(categoryId);
    }

    const whereClause = `WHERE ${whereSql.join(' AND ')}`;
    const totalRows = await execute(`SELECT COUNT(*) AS total FROM products p ${whereClause}`, params);
    const rows = await execute(
      `SELECT p.id, p.category_id, c.name AS category_name, p.name, p.subtitle, p.description, p.price, p.status, p.cover_url,
              p.sales_count, s.stock, s.locked_stock, p.created_at, p.updated_at
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN product_stock s ON s.product_id = p.id
       ${whereClause}
       ORDER BY p.id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );

    const payload = {
      list: rows,
      pagination: { page, pageSize, total: totalRows[0].total }
    };
    await redis.set(cacheKey, JSON.stringify(payload), 'EX', randomTtl(300));
    return success(res, payload, '获取商品列表成功');
  })
);

app.get(
  '/api/products/admin/categories',
  requireAuth,
  requireRole('admin'),
  wrapAsync(async (_req, res) => {
    const rows = await execute('SELECT * FROM categories ORDER BY sort_order DESC, id DESC');
    return success(res, rows, '管理员获取分类成功');
  })
);

app.post(
  '/api/products/admin/categories',
  requireAuth,
  requireRole('admin'),
  wrapAsync(async (req, res) => {
    validateCategoryPayload(req.body);
    const { name, parentId = 0, sortOrder = 0, status = 1 } = req.body;
    const result = await execute('INSERT INTO categories (name, parent_id, sort_order, status) VALUES (?, ?, ?, ?)', [
      String(name).trim(),
      Number(parentId),
      Number(sortOrder),
      Number(status)
    ]);
    const rows = await execute('SELECT * FROM categories WHERE id = ? LIMIT 1', [result.insertId]);
    return success(res, rows[0], '新增分类成功');
  })
);

app.put(
  '/api/products/admin/categories/:id',
  requireAuth,
  requireRole('admin'),
  wrapAsync(async (req, res) => {
    validateCategoryPayload(req.body);
    const categoryId = Number(req.params.id);
    const { name, parentId = 0, sortOrder = 0, status = 1 } = req.body;
    await execute('UPDATE categories SET name = ?, parent_id = ?, sort_order = ?, status = ? WHERE id = ?', [
      String(name).trim(),
      Number(parentId),
      Number(sortOrder),
      Number(status),
      categoryId
    ]);
    const rows = await execute('SELECT * FROM categories WHERE id = ? LIMIT 1', [categoryId]);
    if (!rows[0]) {
      throw new AppError('分类不存在', 404, 'CATEGORY_NOT_FOUND');
    }
    return success(res, rows[0], '更新分类成功');
  })
);

app.delete(
  '/api/products/admin/categories/:id',
  requireAuth,
  requireRole('admin'),
  wrapAsync(async (req, res) => {
    const categoryId = Number(req.params.id);
    const rows = await execute("SELECT COUNT(*) AS total FROM products WHERE category_id = ? AND status <> 'deleted'", [categoryId]);
    if (rows[0].total > 0) {
      throw new AppError('分类下仍有商品，不能删除', 400, 'CATEGORY_HAS_PRODUCTS');
    }
    await execute('DELETE FROM categories WHERE id = ?', [categoryId]);
    return success(res, null, '删除分类成功');
  })
);

app.get(
  '/api/products/admin/list',
  requireAuth,
  requireRole('admin'),
  wrapAsync(async (req, res) => {
    const page = normalizePage(req.query.page, 1);
    const pageSize = Math.min(normalizePage(req.query.pageSize, 10), 50);
    const keyword = (req.query.keyword || '').trim();
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
    const status = (req.query.status || '').trim();
    const whereSql = ['1 = 1'];
    const params = [];

    if (keyword) {
      whereSql.push('(p.name LIKE ? OR p.subtitle LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (categoryId) {
      whereSql.push('p.category_id = ?');
      params.push(categoryId);
    }
    if (status) {
      whereSql.push('p.status = ?');
      params.push(status);
    }

    const whereClause = `WHERE ${whereSql.join(' AND ')}`;
    const totalRows = await execute(`SELECT COUNT(*) AS total FROM products p ${whereClause}`, params);
    const rows = await execute(
      `SELECT p.id, p.category_id, c.name AS category_name, p.name, p.subtitle, p.description, p.price, p.status, p.cover_url,
              p.sales_count, s.stock, s.locked_stock, p.created_at, p.updated_at
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN product_stock s ON s.product_id = p.id
       ${whereClause}
       ORDER BY p.id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );

    return success(
      res,
      {
        list: rows,
        pagination: { page, pageSize, total: totalRows[0].total }
      },
      '获取商品管理列表成功'
    );
  })
);

app.get(
  '/api/products/admin/stocks',
  requireAuth,
  requireRole('admin'),
  wrapAsync(async (_req, res) => {
    const rows = await execute(
      `SELECT p.id AS product_id, p.name, p.status, s.stock, s.locked_stock, s.updated_at
       FROM products p
       LEFT JOIN product_stock s ON s.product_id = p.id
       WHERE p.status <> 'deleted'
       ORDER BY p.id DESC`
    );
    return success(res, rows, '获取库存列表成功');
  })
);

app.get(
  '/api/products/admin/:id',
  requireAuth,
  requireRole('admin'),
  wrapAsync(async (req, res) => {
    const product = await loadProductDetail(Number(req.params.id), true);
    if (!product) {
      throw new AppError('商品不存在', 404, 'PRODUCT_NOT_FOUND');
    }
    return success(res, product, '获取商品详情成功');
  })
);

app.get(
  '/api/products/:id',
  wrapAsync(async (req, res) => {
    const product = await loadProductDetail(Number(req.params.id));
    if (!product) {
      throw new AppError('商品不存在或已下架', 404, 'PRODUCT_NOT_FOUND');
    }
    return success(res, product, '获取商品详情成功');
  })
);

app.get(
  '/api/products/:id/stock',
  wrapAsync(async (req, res) => {
    const rows = await execute('SELECT product_id, stock, locked_stock, updated_at FROM product_stock WHERE product_id = ? LIMIT 1', [
      Number(req.params.id)
    ]);
    if (!rows[0]) {
      throw new AppError('库存记录不存在', 404, 'STOCK_NOT_FOUND');
    }
    return success(res, rows[0], '获取库存成功');
  })
);

app.post(
  '/api/products/admin/upload',
  requireAuth,
  requireRole('admin'),
  (req, res, next) => {
    upload.single('image')(req, res, (error) => {
      if (error) {
        if (error instanceof AppError) {
          return next(error);
        }
        if (error.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError('图片大小不能超过 2MB', 400, 'UPLOAD_FILE_TOO_LARGE'));
        }
        return next(new AppError('图片上传失败', 400, 'UPLOAD_FAILED'));
      }

      if (!req.file) {
        return next(new AppError('请选择需要上传的图片', 400, 'EMPTY_UPLOAD_FILE'));
      }

      return success(
        res,
        {
          fileName: req.file.filename,
          url: `/api/products/uploads/${req.file.filename}`
        },
        '图片上传成功'
      );
    });
  }
);

app.post(
  '/api/products/admin',
  requireAuth,
  requireRole('admin'),
  wrapAsync(async (req, res) => {
    validateProductPayload(req.body);
    const { categoryId, name, subtitle = '', description = '', price, stock = 0, coverUrl = '', status = 'on_sale' } = req.body;

    const productId = await withTransaction(async (connection) => {
      const [productResult] = await connection.execute(
        `INSERT INTO products (category_id, name, subtitle, description, price, status, cover_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [categoryId, name, subtitle, description, price, status, coverUrl]
      );
      await connection.execute('INSERT INTO product_stock (product_id, stock, locked_stock) VALUES (?, ?, 0)', [productResult.insertId, stock]);
      return productResult.insertId;
    });

    await deleteProductCache(productId);
    return success(res, { id: productId }, '新增商品成功');
  })
);

app.put(
  '/api/products/admin/:id',
  requireAuth,
  requireRole('admin'),
  wrapAsync(async (req, res) => {
    const productId = Number(req.params.id);
    validateProductPayload(req.body);
    const { categoryId, name, subtitle = '', description = '', price, stock, coverUrl = '', status = 'on_sale' } = req.body;

    await withTransaction(async (connection) => {
      await connection.execute(
        `UPDATE products
         SET category_id = ?, name = ?, subtitle = ?, description = ?, price = ?, status = ?, cover_url = ?
         WHERE id = ?`,
        [categoryId, name, subtitle, description, price, status, coverUrl, productId]
      );
      if (stock !== undefined) {
        await connection.execute('UPDATE product_stock SET stock = ? WHERE product_id = ?', [stock, productId]);
      }
    });

    await deleteProductCache(productId);
    return success(res, { id: productId }, '更新商品成功');
  })
);

app.patch(
  '/api/products/admin/:id/status',
  requireAuth,
  requireRole('admin'),
  wrapAsync(async (req, res) => {
    const productId = Number(req.params.id);
    const { status } = req.body;
    if (!['on_sale', 'off_sale'].includes(status)) {
      throw new AppError('商品状态不合法', 400, 'INVALID_PRODUCT_STATUS');
    }
    await execute('UPDATE products SET status = ? WHERE id = ?', [status, productId]);
    await deleteProductCache(productId);
    return success(res, { id: productId, status }, '商品状态更新成功');
  })
);

app.patch(
  '/api/products/admin/:id/stock',
  requireAuth,
  requireRole('admin'),
  wrapAsync(async (req, res) => {
    const productId = Number(req.params.id);
    const { adjustType = 'set', quantity } = req.body;
    const amount = Number(quantity);

    if (!['set', 'increase', 'decrease'].includes(adjustType) || Number.isNaN(amount) || amount < 0) {
      throw new AppError('库存调整参数不合法', 400, 'INVALID_STOCK_PAYLOAD');
    }

    await withTransaction(async (connection) => {
      const [rows] = await connection.execute('SELECT stock FROM product_stock WHERE product_id = ? FOR UPDATE', [productId]);
      if (!rows[0]) {
        throw new AppError('库存记录不存在', 404, 'STOCK_NOT_FOUND');
      }
      const currentStock = Number(rows[0].stock);
      let nextStock = currentStock;
      if (adjustType === 'set') {
        nextStock = amount;
      } else if (adjustType === 'increase') {
        nextStock = currentStock + amount;
      } else if (adjustType === 'decrease') {
        nextStock = currentStock - amount;
      }
      if (nextStock < 0) {
        throw new AppError('库存不能小于 0', 400, 'INVALID_STOCK_VALUE');
      }
      await connection.execute('UPDATE product_stock SET stock = ? WHERE product_id = ?', [nextStock, productId]);
    });

    await deleteProductCache(productId);
    return success(res, { productId }, '库存调整成功');
  })
);

app.delete(
  '/api/products/admin/:id',
  requireAuth,
  requireRole('admin'),
  wrapAsync(async (req, res) => {
    const productId = Number(req.params.id);
    await execute("UPDATE products SET status = 'deleted' WHERE id = ?", [productId]);
    await deleteProductCache(productId);
    return success(res, { id: productId }, '删除商品成功');
  })
);

app.post(
  '/internal/products/resolve-items',
  requireInternalToken,
  wrapAsync(async (req, res) => {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) {
      throw new AppError('商品项不能为空', 400, 'EMPTY_ITEMS');
    }

    const productIds = items.map((item) => Number(item.productId));
    const rows = await fetchProductsByIds(productIds);
    const rowMap = new Map(rows.map((row) => [Number(row.id), row]));

    const resolved = items.map((item) => {
      const current = rowMap.get(Number(item.productId));
      if (!current || current.status !== 'on_sale') {
        throw new AppError(`商品 ${item.productId} 不存在或不可售`, 400, 'PRODUCT_UNAVAILABLE');
      }
      if (Number(item.quantity) <= 0) {
        throw new AppError('商品数量必须大于 0', 400, 'INVALID_QUANTITY');
      }
      return {
        productId: Number(current.id),
        quantity: Number(item.quantity),
        name: current.name,
        price: Number(current.price),
        stock: Number(current.stock || 0),
        status: current.status,
        coverUrl: current.cover_url
      };
    });

    return success(res, resolved, '商品校验成功');
  })
);

app.post(
  '/internal/products/batch',
  requireInternalToken,
  wrapAsync(async (req, res) => {
    const productIds = Array.isArray(req.body.productIds) ? req.body.productIds.map((item) => Number(item)) : [];
    const rows = await fetchProductsByIds(productIds);
    return success(res, rows, '内部批量获取商品成功');
  })
);

app.post(
  '/internal/products/stock/deduct',
  requireInternalToken,
  wrapAsync(async (req, res) => {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) {
      throw new AppError('扣减库存商品项不能为空', 400, 'EMPTY_ITEMS');
    }
    await adjustStockItems(items, -1);
    return success(res, { orderNo: req.body.orderNo || '' }, '库存扣减成功');
  })
);

app.use(notFoundHandler);
app.use(errorHandler);

startProductConsumers()
  .then(() => {
    app.listen(env.services.product.port, () => {
      logger.info(`product-service running on port ${env.services.product.port}`);
    });
  })
  .catch((error) => {
    logger.error('product-service failed to start', error);
    process.exit(1);
  });
