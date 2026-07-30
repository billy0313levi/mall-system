const axios = require('axios');
const cors = require('cors');
const express = require('express');
const {
  env,
  execute,
  requireAuth,
  publishMessage,
  logger,
  success,
  wrapAsync,
  notFoundHandler,
  errorHandler,
  AppError
} = require('@mall/common');

const app = express();

app.use(cors());
app.use(express.json());

function buildTransactionNo() {
  return `PAY${Date.now()}${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0')}`;
}

async function appendOrderLog(orderNo, action, content) {
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

async function ensureStockReady(orderNo) {
  const rows = await execute(
    `SELECT id FROM order_logs
     WHERE order_no = ? AND action = 'stock_deducted'
     ORDER BY id DESC
     LIMIT 1`,
    [orderNo]
  );

  if (!rows[0]) {
    throw new AppError('订单库存仍在异步处理中，请稍后再支付', 400, 'ORDER_STOCK_PENDING');
  }
}

async function createPayment(order, userId, status, failReason = '') {
  const transactionNo = buildTransactionNo();
  const result = await execute(
    `INSERT INTO payments (order_no, user_id, amount, pay_channel, status, transaction_no, fail_reason)
     VALUES (?, ?, ?, 'mock', ?, ?, ?)`,
    [order.order_no, userId, order.total_amount, status, transactionNo, failReason]
  );
  return { paymentId: result.insertId, transactionNo };
}

app.get('/health', (_req, res) => success(res, { service: 'payment-service' }, 'payment ok'));

app.post(
  '/api/payments/pay',
  requireAuth,
  wrapAsync(async (req, res) => {
    const { orderNo, simulateSuccess = true, failReason = '模拟支付失败' } = req.body;
    if (!orderNo) {
      throw new AppError('订单号不能为空', 400, 'INVALID_ORDER_NO');
    }

    const orders = await execute('SELECT * FROM orders WHERE order_no = ? AND user_id = ? LIMIT 1', [orderNo, req.user.id]);
    const order = orders[0];
    if (!order) {
      throw new AppError('订单不存在', 404, 'ORDER_NOT_FOUND');
    }
    if (order.status === 'paid') {
      return success(res, { orderNo, status: 'paid' }, '订单已支付');
    }
    if (order.status !== 'pending') {
      throw new AppError('当前订单状态不允许支付', 400, 'ORDER_STATUS_INVALID');
    }

    await ensureStockReady(orderNo);

    const successPayments = await execute(
      `SELECT id FROM payments
       WHERE order_no = ? AND user_id = ? AND status = 'success'
       ORDER BY id DESC
       LIMIT 1`,
      [orderNo, req.user.id]
    );
    if (successPayments[0]) {
      return success(res, { orderNo, status: 'success' }, '订单支付结果已存在');
    }

    const paymentStatus = simulateSuccess ? 'success' : 'failed';
    const { paymentId, transactionNo } = await createPayment(order, req.user.id, paymentStatus, simulateSuccess ? '' : failReason);

    if (simulateSuccess) {
      await publishMessage(env.rabbitmq.routingKeys.orderPaid, {
        orderNo,
        userId: req.user.id,
        amount: order.total_amount,
        paymentId
      });
    } else {
      await appendOrderLog(orderNo, 'payment_failed', `支付失败: ${failReason}`);
    }

    return success(
      res,
      { orderNo, transactionNo, status: paymentStatus },
      simulateSuccess ? '支付成功' : '支付失败，订单保持待支付'
    );
  })
);

app.post(
  '/api/payments/callback',
  wrapAsync(async (req, res) => {
    const { orderNo, status, failReason = '回调通知支付失败' } = req.body;
    if (!orderNo || !['success', 'failed'].includes(status)) {
      throw new AppError('回调参数不合法', 400, 'INVALID_CALLBACK_PAYLOAD');
    }

    const payments = await execute('SELECT * FROM payments WHERE order_no = ? ORDER BY id DESC LIMIT 1', [orderNo]);
    const payment = payments[0];
    if (!payment) {
      throw new AppError('支付记录不存在', 404, 'PAYMENT_NOT_FOUND');
    }
    if (status === 'success') {
      await ensureStockReady(orderNo);
    }
    if (payment.status === 'success' && status === 'success') {
      return success(res, { orderNo, status }, '支付回调已处理');
    }

    await execute('UPDATE payments SET status = ?, fail_reason = ? WHERE id = ?', [status, status === 'failed' ? failReason : '', payment.id]);

    if (status === 'success') {
      await publishMessage(env.rabbitmq.routingKeys.orderPaid, {
        orderNo,
        userId: payment.user_id,
        amount: payment.amount,
        paymentId: payment.id
      });
    } else {
      await appendOrderLog(orderNo, 'payment_failed', `支付回调失败: ${failReason}`);
    }

    return success(res, { orderNo, status }, '支付回调处理成功');
  })
);

app.get(
  '/api/payments/:orderNo',
  requireAuth,
  wrapAsync(async (req, res) => {
    const rows = await execute('SELECT * FROM payments WHERE order_no = ? AND user_id = ? ORDER BY id DESC', [
      req.params.orderNo,
      req.user.id
    ]);
    return success(res, rows, '获取支付记录成功');
  })
);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.services.payment.port, () => {
  logger.info(`payment-service running on port ${env.services.payment.port}`);
});
