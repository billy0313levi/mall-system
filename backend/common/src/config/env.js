require("dotenv").config();

const getEnv = (name, fallback = undefined) => {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
};

const getNumberEnv = (name, fallback) => Number(getEnv(name, fallback));

module.exports = {
  nodeEnv: getEnv("NODE_ENV", "development"),
  logLevel: getEnv("LOG_LEVEL", "info"),
  mysql: {
    host: getEnv("MYSQL_HOST", "localhost"),
    port: getNumberEnv("MYSQL_PORT", 3306),
    user: getEnv("MYSQL_USER", "root123"),
    password: getEnv("MYSQL_PASSWORD", "123456"),
    database: getEnv("MYSQL_DATABASE", "mall_system"),
  },
  redis: {
    host: getEnv("REDIS_HOST", "localhost"),
    port: getNumberEnv("REDIS_PORT", 6379),
    password: getEnv("REDIS_PASSWORD", "1234"),
  },
  rabbitmq: {
    host: getEnv("RABBITMQ_HOST", "localhost"),
    port: getNumberEnv("RABBITMQ_PORT", 5672),
    user: getEnv("RABBITMQ_USER", "guest"),
    password: getEnv("RABBITMQ_PASSWORD", "guest"),
    vhost: getEnv("RABBITMQ_VHOST", "/"),
    exchange: getEnv("RABBITMQ_EXCHANGE", "mall.event.exchange"),
    queues: {
      orderCreated: getEnv("RABBITMQ_ORDER_CREATED_QUEUE", "mall.order.created.queue"),
      orderPaid: getEnv("RABBITMQ_ORDER_PAID_QUEUE", "mall.order.paid.queue"),
      stockDeduct: getEnv("RABBITMQ_STOCK_DEDUCT_QUEUE", "mall.stock.deduct.queue"),
      stockRollback: getEnv("RABBITMQ_STOCK_ROLLBACK_QUEUE", "mall.stock.rollback.queue"),
    },
    routingKeys: {
      orderCreated: getEnv("RABBITMQ_ORDER_CREATED_KEY", "order.created"),
      orderPaid: getEnv("RABBITMQ_ORDER_PAID_KEY", "order.paid"),
      stockDeduct: getEnv("RABBITMQ_STOCK_DEDUCT_KEY", "stock.deduct"),
      stockRollback: getEnv("RABBITMQ_STOCK_ROLLBACK_KEY", "stock.rollback"),
    },
  },
  jwt: {
    secret: getEnv("JWT_SECRET", "replace-with-a-strong-secret"),
    expiresIn: getEnv("JWT_EXPIRES_IN", "2h"),
  },
  internalServiceToken: getEnv("INTERNAL_SERVICE_TOKEN", "mall-internal-token"),
  services: {
    gateway: {
      port: getNumberEnv("GATEWAY_PORT", 3000),
      url: getEnv("GATEWAY_URL", `http://localhost:${getNumberEnv("GATEWAY_PORT", 3000)}`),
    },
    user: {
      port: getNumberEnv("USER_SERVICE_PORT", 3101),
      url: getEnv("USER_SERVICE_URL", `http://localhost:${getNumberEnv("USER_SERVICE_PORT", 3101)}`),
    },
    product: {
      port: getNumberEnv("PRODUCT_SERVICE_PORT", 3102),
      url: getEnv("PRODUCT_SERVICE_URL", `http://localhost:${getNumberEnv("PRODUCT_SERVICE_PORT", 3102)}`),
    },
    cart: {
      port: getNumberEnv("CART_SERVICE_PORT", 3103),
      url: getEnv("CART_SERVICE_URL", `http://localhost:${getNumberEnv("CART_SERVICE_PORT", 3103)}`),
    },
    order: {
      port: getNumberEnv("ORDER_SERVICE_PORT", 3104),
      url: getEnv("ORDER_SERVICE_URL", `http://localhost:${getNumberEnv("ORDER_SERVICE_PORT", 3104)}`),
    },
    payment: {
      port: getNumberEnv("PAYMENT_SERVICE_PORT", 3105),
      url: getEnv("PAYMENT_SERVICE_URL", `http://localhost:${getNumberEnv("PAYMENT_SERVICE_PORT", 3105)}`),
    },
  },
  rateLimit: {
    windowSeconds: getNumberEnv("RATE_LIMIT_WINDOW_SECONDS", 60),
    maxRequests: getNumberEnv("RATE_LIMIT_MAX_REQUESTS", 120),
    loginMax: getNumberEnv("RATE_LIMIT_LOGIN_MAX", 12),
    productQueryMax: getNumberEnv("RATE_LIMIT_PRODUCT_QUERY_MAX", 600),
    orderCreateMax: getNumberEnv("RATE_LIMIT_ORDER_CREATE_MAX", 40),
  },
  frontendPort: getNumberEnv("FRONTEND_PORT", 5173),
};
