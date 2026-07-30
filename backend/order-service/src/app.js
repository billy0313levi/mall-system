const axios = require('axios');
const cors = require('cors');
const express = require('express');
const {
  env,
  execute,
  withTransaction,
  getRedisClient,
  requireAuth,
  requireRole,
  requireInternalToken,
  publishMessage,
  consumeMessage,
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

function buildOrderNo(userId) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  const suffix = String(userId).padStart(4, '0').slice(-4);
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `ORD${yyyy}${mm}${dd}${hh}${mi}${ss}${ms}${suffix}${random}`;
}

function normalizePage(value, fallback) {
  const parsed = Number(value || fallback);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

function validateOrderTransition(currentStatus, nextStatus) {
  const transitions = {
    pending: ['paid', 'cancelled', 'failed'],
    paid: ['shipped'],
    shipped: ['finished'],
    cancelled: [],
    finished: [],
    failed: []
  };
  return currentStatus === nextStatus || transitions[currentStatus]?.includes(nextStatus);
}

async function appendOrderLog(orderNo, action, content) {
  await execute('INSERT INTO order_logs (order_no, action, content) VALUES (?, ?, ?)', [orderNo, action, content]);
}

async function fetchCartItems(userId) {
  const response = await axios.get(`${env.services.cart.url}/internal/cart/users/${userId}`, {
    headers: {
      'x-internal-token': env.internalServiceToken
    }
  });
  return response.data.data.items;
}

async function removeCartItems(userId, productIds) {
  if (!productIds.length) {
    return;
  }
  await axios.post(
    `${env.services.cart.url}/internal/cart/users/${userId}/remove-items`,
    { productIds },
    {
      headers: {
        'x-internal-token': env.internalServiceToken
      }
    }
  );
}

async function resolveProducts(items) {
  const response = await axios.post(
    `${env.services.product.url}/internal/products/resolve-items`,
    { items },
    {
      headers: {
        'x-internal-token': env.internalServiceToken
      }
    }
  );
  return response.data.data;
}

async function getAddressById(userId, addressId) {
  const rows = await execute('SELECT * FROM addresses WHERE id = ? AND user_id = ? AND status = 1 LIMIT 1', [addressId, userId]);
  return rows[0] || null;
}

async function getOrderDetailByOrderNo(orderNo) {
  const orders = await execute('SELECT * FROM orders WHERE order_no = ? LIMIT 1', [orderNo]);
  const order = orders[0];
  if (!order) {
    return null;
  }
  const items = await execute('SELECT * FROM order_items WHERE order_no = ? ORDER BY id ASC', [orderNo]);
  const logs = await execute('SELECT * FROM order_logs WHERE order_no = ? ORDER BY id ASC', [orderNo]);
  return { ...order, items, logs };
}

async function hasStockDeducted(orderNo) {
  const rows = await execute(
    `SELECT id FROM order_logs
     WHERE order_no = ? AND action = 'stock_deducted'
     ORDER BY id DESC
     LIMIT 1`,
    [orderNo]
  );
  return Boolean(rows[0]);
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

async function handleOrderCreatedMessage(payload, meta) {
  const consumerName = 'order-created-consumer';
  const existing = await findMessageLog(meta.messageId, consumerName);
  if (existing?.status === 'success') {
    return;
  }
  await setMessageLog(meta.messageId, consumerName, meta.routingKey, payload.orderNo, 'processing');

  try {
    const orders = await execute('SELECT status FROM orders WHERE order_no = ? LIMIT 1', [payload.orderNo]);
    const currentOrder = orders[0];
    if (!currentOrder) {
      await setMessageLog(meta.messageId, consumerName, meta.routingKey, payload.orderNo, 'success');
      return;
    }
    if (currentOrder.status !== 'pending') {
      await appendOrderLog(payload.orderNo, 'order_created_skipped', `订单状态为 ${currentOrder.status}，跳过库存消息转发`);
      await setMessageLog(meta.messageId, consumerName, meta.routingKey, payload.orderNo, 'success');
      return;
    }

    await publishMessage(env.rabbitmq.routingKeys.stockDeduct, payload, {
      headers: {
        source: 'order-service'
      }
    });
    await appendOrderLog(payload.orderNo, 'stock_deduct_dispatch', '已发送库存扣减消息');
    await setMessageLog(meta.messageId, consumerName, meta.routingKey, payload.orderNo, 'success');
  } catch (error) {
    await setMessageLog(meta.messageId, consumerName, meta.routingKey, payload.orderNo, 'failed', error.message);
    throw error;
  }
}

async function handleOrderPaidMessage(payload, meta) {
  const consumerName = 'order-paid-consumer';
  const existing = await findMessageLog(meta.messageId, consumerName);
  if (existing?.status === 'success') {
    return;
  }
  await setMessageLog(meta.messageId, consumerName, meta.routingKey, payload.orderNo, 'processing');

  try {
    const orders = await execute('SELECT status FROM orders WHERE order_no = ? LIMIT 1', [payload.orderNo]);
    const currentOrder = orders[0];
    if (!currentOrder) {
      await setMessageLog(meta.messageId, consumerName, meta.routingKey, payload.orderNo, 'success');
      return;
    }
    if (currentOrder.status === 'paid') {
      await setMessageLog(meta.messageId, consumerName, meta.routingKey, payload.orderNo, 'success');
      return;
    }
    if (!validateOrderTransition(currentOrder.status, 'paid')) {
      await appendOrderLog(payload.orderNo, 'order_paid_skipped', `订单状态为 ${currentOrder.status}，忽略支付成功消息`);
      await setMessageLog(meta.messageId, consumerName, meta.routingKey, payload.orderNo, 'success');
      return;
    }

    await execute("UPDATE orders SET status = 'paid' WHERE order_no = ? AND status = 'pending'", [payload.orderNo]);
    await appendOrderLog(payload.orderNo, 'paid', '支付成功，订单已更新为已支付');
    await setMessageLog(meta.messageId, consumerName, meta.routingKey, payload.orderNo, 'success');
  } catch (error) {
    await setMessageLog(meta.messageId, consumerName, meta.routingKey, payload.orderNo, 'failed', error.message);
    throw error;
  }
}

async function startOrderConsumers() {
  await consumeMessage(env.rabbitmq.queues.orderCreated, handleOrderCreatedMessage);
  await consumeMessage(env.rabbitmq.queues.orderPaid, handleOrderPaidMessage);
}

app.get('/health', (_req, res) => success(res, { service: 'order-service' }, 'order ok'));

app.get(
  '/api/orders/preview',
  requireAuth,
  wrapAsync(async (req, res) => {
    const items = await fetchCartItems(req.user.id);
    const invalidItems = items.filter((item) => !item.available || item.stock < item.quantity);
    const validItems = items.filter((item) => item.available && item.stock >= item.quantity);

    return success(
      res,
      {
        items: validItems,
        invalidItems,
        totalAmount: validItems.reduce((sum, item) => sum + Number(item.currentPrice) * Number(item.quantity), 0)
      },
      '获取订单预览成功'
    );
  })
);

app.post(
  '/api/orders',
  requireAuth,
  wrapAsync(async (req, res) => {
    const lockKey = `order:submit:user:${req.user.id}`;
    const locked = await redis.set(lockKey, '1', 'EX', 5, 'NX');
    if (!locked) {
      throw new AppError('订单提交过于频繁，请稍后再试', 429, 'ORDER_DUPLICATE_REQUEST');
    }

    try {
      let items = Array.isArray(req.body.items) ? req.body.items : [];
      if (!items.length) {
        items = await fetchCartItems(req.user.id);
      }
      if (!items.length) {
        throw new AppError('没有可下单的商品', 400, 'EMPTY_ORDER_ITEMS');
      }

      const resolvedItems = await resolveProducts(items);
      const insufficientItem = resolvedItems.find((item) => item.stock < item.quantity);
      if (insufficientItem) {
        throw new AppError(`商品 ${insufficientItem.name} 库存不足`, 400, 'INSUFFICIENT_STOCK');
      }

      const address = await getAddressById(req.user.id, Number(req.body.addressId));
      if (!address) {
        throw new AppError('请选择有效收货地址', 400, 'ADDRESS_NOT_FOUND');
      }

      const orderNo = buildOrderNo(req.user.id);
      const normalizedItems = resolvedItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        productName: item.name,
        productPrice: Number(item.price),
        subtotalAmount: Number(item.price) * Number(item.quantity)
      }));
      const totalAmount = normalizedItems.reduce((sum, item) => sum + item.subtotalAmount, 0);
      const addressSnapshot = {
        receiverName: address.receiver_name,
        receiverPhone: address.receiver_phone,
        province: address.province,
        city: address.city,
        district: address.district,
        detailAddress: address.detail_address,
        postalCode: address.postal_code
      };

      await withTransaction(async (connection) => {
        const [orderResult] = await connection.execute(
          `INSERT INTO orders
           (order_no, user_id, total_amount, status, receiver_name, receiver_phone, receiver_address, address_snapshot, remark)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderNo,
            req.user.id,
            totalAmount,
            'pending',
            address.receiver_name,
            address.receiver_phone,
            `${address.province} ${address.city} ${address.district} ${address.detail_address}`,
            JSON.stringify(addressSnapshot),
            req.body.remark || ''
          ]
        );

        for (const item of normalizedItems) {
          await connection.execute(
            `INSERT INTO order_items (order_id, order_no, product_id, product_name, product_price, quantity, subtotal_amount)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              orderResult.insertId,
              orderNo,
              item.productId,
              item.productName,
              item.productPrice,
              item.quantity,
              item.subtotalAmount
            ]
          );
        }

        await connection.execute('INSERT INTO order_logs (order_no, action, content) VALUES (?, ?, ?)', [
          orderNo,
          'created',
          '订单已创建，等待异步库存扣减'
        ]);
      });

      await publishMessage(env.rabbitmq.routingKeys.orderCreated, {
        orderNo,
        userId: req.user.id,
        items: normalizedItems
      });
      await removeCartItems(
        req.user.id,
        normalizedItems.map((item) => item.productId)
      );

      return success(
        res,
        { orderNo, totalAmount, status: 'pending', items: normalizedItems },
        '订单创建成功，库存扣减异步处理中'
      );
    } finally {
      await redis.del(lockKey);
    }
  })
);

app.get(
  '/api/orders',
  requireAuth,
  wrapAsync(async (req, res) => {
    const page = normalizePage(req.query.page, 1);
    const pageSize = Math.min(normalizePage(req.query.pageSize, 10), 50);
    const status = (req.query.status || '').trim();
    const whereSql = ['user_id = ?'];
    const params = [req.user.id];

    if (status) {
      whereSql.push('status = ?');
      params.push(status);
    }

    const whereClause = `WHERE ${whereSql.join(' AND ')}`;
    const totalRows = await execute(`SELECT COUNT(*) AS total FROM orders ${whereClause}`, params);
    const rows = await execute(`SELECT * FROM orders ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`, [
      ...params,
      pageSize,
      (page - 1) * pageSize
    ]);

    return success(
      res,
      {
        list: rows,
        pagination: { page, pageSize, total: totalRows[0].total }
      },
      '获取订单列表成功'
    );
  })
);

app.get(
  '/api/orders/:orderNo',
  requireAuth,
  wrapAsync(async (req, res) => {
    const detail = await getOrderDetailByOrderNo(req.params.orderNo);
    if (!detail) {
      throw new AppError('订单不存在', 404, 'ORDER_NOT_FOUND');
    }
    if (detail.user_id !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('无权限查看该订单', 403, 'FORBIDDEN');
    }
    return success(res, detail, '获取订单详情成功');
  })
);

app.post(
  '/api/orders/:orderNo/cancel',
  requireAuth,
  wrapAsync(async (req, res) => {
    const detail = await getOrderDetailByOrderNo(req.params.orderNo);
    if (!detail) {
      throw new AppError('订单不存在', 404, 'ORDER_NOT_FOUND');
    }
    if (detail.user_id !== req.user.id) {
      throw new AppError('无权限取消该订单', 403, 'FORBIDDEN');
    }
    if (detail.status !== 'pending') {
      throw new AppError('只有待支付订单可以取消', 400, 'ORDER_STATUS_INVALID');
    }

    await execute("UPDATE orders SET status = 'cancelled' WHERE order_no = ?", [req.params.orderNo]);
    await appendOrderLog(req.params.orderNo, 'cancelled', '用户取消订单');

    if (await hasStockDeducted(req.params.orderNo)) {
      await publishMessage(env.rabbitmq.routingKeys.stockRollback, {
        orderNo: req.params.orderNo,
        items: detail.items.map((item) => ({
          productId: item.product_id,
          quantity: item.quantity
        }))
      });
    }

    return success(res, null, '取消订单成功');
  })
);

app.get(
  '/api/orders/admin/list',
  requireAuth,
  requireRole('admin'),
  wrapAsync(async (req, res) => {
    const page = normalizePage(req.query.page, 1);
    const pageSize = Math.min(normalizePage(req.query.pageSize, 10), 50);
    const keyword = (req.query.keyword || '').trim();
    const status = (req.query.status || '').trim();
    const whereSql = ['1 = 1'];
    const params = [];

    if (keyword) {
      whereSql.push('(order_no LIKE ? OR receiver_name LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (status) {
      whereSql.push('status = ?');
      params.push(status);
    }

    const whereClause = `WHERE ${whereSql.join(' AND ')}`;
    const totalRows = await execute(`SELECT COUNT(*) AS total FROM orders ${whereClause}`, params);
    const rows = await execute(`SELECT * FROM orders ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`, [
      ...params,
      pageSize,
      (page - 1) * pageSize
    ]);

    return success(
      res,
      {
        list: rows,
        pagination: { page, pageSize, total: totalRows[0].total }
      },
      '管理员获取订单列表成功'
    );
  })
);

app.patch(
  '/api/orders/admin/:orderNo/status',
  requireAuth,
  requireRole('admin'),
  wrapAsync(async (req, res) => {
    const { status } = req.body;
    if (!['pending', 'paid', 'cancelled', 'shipped', 'finished', 'failed'].includes(status)) {
      throw new AppError('订单状态不合法', 400, 'INVALID_ORDER_STATUS');
    }

    const detail = await getOrderDetailByOrderNo(req.params.orderNo);
    if (!detail) {
      throw new AppError('订单不存在', 404, 'ORDER_NOT_FOUND');
    }
    if (!validateOrderTransition(detail.status, status)) {
      throw new AppError(`订单状态不能从 ${detail.status} 变更为 ${status}`, 400, 'INVALID_ORDER_STATUS_TRANSITION');
    }

    await execute('UPDATE orders SET status = ? WHERE order_no = ?', [status, req.params.orderNo]);
    await appendOrderLog(req.params.orderNo, 'admin_status_update', `管理员将订单状态修改为 ${status}`);

    if (status === 'cancelled' && (await hasStockDeducted(req.params.orderNo))) {
      await publishMessage(env.rabbitmq.routingKeys.stockRollback, {
        orderNo: req.params.orderNo,
        items: detail.items.map((item) => ({
          productId: item.product_id,
          quantity: item.quantity
        }))
      });
    }

    return success(res, { orderNo: req.params.orderNo, status }, '订单状态更新成功');
  })
);

app.patch(
  '/internal/orders/:orderNo/status',
  requireInternalToken,
  wrapAsync(async (req, res) => {
    const { status, content = '' } = req.body;
    if (!['pending', 'paid', 'cancelled', 'shipped', 'finished', 'failed'].includes(status)) {
      throw new AppError('订单状态不合法', 400, 'INVALID_ORDER_STATUS');
    }

    const detail = await getOrderDetailByOrderNo(req.params.orderNo);
    if (!detail) {
      throw new AppError('订单不存在', 404, 'ORDER_NOT_FOUND');
    }
    if (!validateOrderTransition(detail.status, status)) {
      throw new AppError(`订单状态不能从 ${detail.status} 变更为 ${status}`, 400, 'INVALID_ORDER_STATUS_TRANSITION');
    }

    await execute('UPDATE orders SET status = ? WHERE order_no = ?', [status, req.params.orderNo]);
    await appendOrderLog(req.params.orderNo, 'internal_status_update', content || `内部服务将订单状态修改为 ${status}`);
    return success(res, { orderNo: req.params.orderNo, status }, '内部更新订单状态成功');
  })
);

app.post(
  '/internal/orders/:orderNo/logs',
  requireInternalToken,
  wrapAsync(async (req, res) => {
    await appendOrderLog(req.params.orderNo, req.body.action || 'internal_log', req.body.content || '内部日志');
    return success(res, null, '内部追加订单日志成功');
  })
);

app.use(notFoundHandler);
app.use(errorHandler);

startOrderConsumers()
  .then(() => {
    app.listen(env.services.order.port, () => {
      logger.info(`order-service running on port ${env.services.order.port}`);
    });
  })
  .catch((error) => {
    logger.error('order-service failed to start', error);
    process.exit(1);
  });
