CREATE DATABASE IF NOT EXISTS mall_system DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mall_system;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
  username VARCHAR(64) NOT NULL UNIQUE COMMENT '用户名',
  password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
  phone VARCHAR(20) DEFAULT NULL COMMENT '手机号',
  email VARCHAR(128) DEFAULT NULL COMMENT '邮箱',
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user' COMMENT '角色',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态 1正常 0禁用',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  KEY idx_role_status (role, status),
  KEY idx_created_at (created_at)
) ENGINE=InnoDB COMMENT='用户表';

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '分类ID',
  name VARCHAR(64) NOT NULL COMMENT '分类名称',
  parent_id BIGINT NOT NULL DEFAULT 0 COMMENT '父级分类ID',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '排序值',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态 1启用 0停用',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_name_parent (name, parent_id),
  KEY idx_parent_status (parent_id, status)
) ENGINE=InnoDB COMMENT='商品分类表';

CREATE TABLE IF NOT EXISTS products (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '商品ID',
  category_id BIGINT NOT NULL COMMENT '分类ID',
  name VARCHAR(128) NOT NULL COMMENT '商品名称',
  subtitle VARCHAR(255) DEFAULT NULL COMMENT '商品副标题',
  description TEXT COMMENT '商品描述',
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT '销售价格',
  status ENUM('on_sale', 'off_sale', 'deleted') NOT NULL DEFAULT 'on_sale' COMMENT '商品状态',
  cover_url VARCHAR(255) DEFAULT NULL COMMENT '封面图片地址',
  sales_count INT NOT NULL DEFAULT 0 COMMENT '销量',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  KEY idx_category_status (category_id, status),
  KEY idx_name_status (name, status),
  KEY idx_status_created (status, created_at)
) ENGINE=InnoDB COMMENT='商品表';

CREATE TABLE IF NOT EXISTS product_stock (
  product_id BIGINT PRIMARY KEY COMMENT '商品ID',
  stock INT NOT NULL DEFAULT 0 COMMENT '可用库存',
  locked_stock INT NOT NULL DEFAULT 0 COMMENT '锁定库存',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB COMMENT='商品库存表';

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '订单ID',
  order_no VARCHAR(40) NOT NULL UNIQUE COMMENT '订单号',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT '订单总金额',
  status ENUM('pending', 'paid', 'cancelled', 'shipped', 'finished', 'failed') NOT NULL DEFAULT 'pending' COMMENT '订单状态',
  receiver_name VARCHAR(64) DEFAULT NULL COMMENT '收货人姓名',
  receiver_phone VARCHAR(20) DEFAULT NULL COMMENT '收货人手机号',
  receiver_address VARCHAR(255) DEFAULT NULL COMMENT '收货详细地址',
  address_snapshot TEXT COMMENT '地址快照JSON',
  remark VARCHAR(255) DEFAULT NULL COMMENT '订单备注',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  KEY idx_user_id (user_id),
  KEY idx_order_status (status),
  KEY idx_created_at (created_at)
) ENGINE=InnoDB COMMENT='订单表';

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '明细ID',
  order_id BIGINT NOT NULL COMMENT '订单ID',
  order_no VARCHAR(40) NOT NULL COMMENT '订单号',
  product_id BIGINT NOT NULL COMMENT '商品ID',
  product_name VARCHAR(128) NOT NULL COMMENT '商品名称',
  product_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT '下单单价',
  quantity INT NOT NULL DEFAULT 1 COMMENT '购买数量',
  subtotal_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT '小计金额',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  KEY idx_order_id (order_id),
  KEY idx_order_no (order_no),
  KEY idx_product_id (product_id)
) ENGINE=InnoDB COMMENT='订单明细表';

CREATE TABLE IF NOT EXISTS order_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '日志ID',
  order_no VARCHAR(40) NOT NULL COMMENT '订单号',
  action VARCHAR(64) NOT NULL COMMENT '操作类型',
  content VARCHAR(512) NOT NULL COMMENT '日志内容',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  KEY idx_order_no_created (order_no, created_at)
) ENGINE=InnoDB COMMENT='订单日志表';

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '支付ID',
  order_no VARCHAR(40) NOT NULL COMMENT '订单号',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT '支付金额',
  pay_channel VARCHAR(32) NOT NULL DEFAULT 'mock' COMMENT '支付渠道',
  status ENUM('pending', 'success', 'failed') NOT NULL DEFAULT 'pending' COMMENT '支付状态',
  transaction_no VARCHAR(64) DEFAULT NULL COMMENT '交易流水号',
  fail_reason VARCHAR(255) DEFAULT NULL COMMENT '失败原因',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  KEY idx_order_no (order_no),
  KEY idx_user_id (user_id),
  KEY idx_status_created (status, created_at)
) ENGINE=InnoDB COMMENT='支付记录表';

CREATE TABLE IF NOT EXISTS addresses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '地址ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  receiver_name VARCHAR(64) NOT NULL COMMENT '收货人姓名',
  receiver_phone VARCHAR(20) NOT NULL COMMENT '收货手机号',
  province VARCHAR(32) NOT NULL COMMENT '省份',
  city VARCHAR(32) NOT NULL COMMENT '城市',
  district VARCHAR(32) NOT NULL COMMENT '区县',
  detail_address VARCHAR(255) NOT NULL COMMENT '详细地址',
  postal_code VARCHAR(16) DEFAULT NULL COMMENT '邮编',
  is_default TINYINT NOT NULL DEFAULT 0 COMMENT '是否默认地址',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态 1正常 0停用',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  KEY idx_user_default (user_id, is_default),
  KEY idx_user_status (user_id, status)
) ENGINE=InnoDB COMMENT='用户地址表';

CREATE TABLE IF NOT EXISTS message_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '消息日志ID',
  message_id VARCHAR(64) NOT NULL COMMENT '消息ID',
  consumer_name VARCHAR(64) NOT NULL COMMENT '消费者名称',
  event_type VARCHAR(64) NOT NULL COMMENT '事件类型',
  business_key VARCHAR(64) DEFAULT NULL COMMENT '业务主键',
  status ENUM('processing', 'success', 'failed') NOT NULL DEFAULT 'processing' COMMENT '处理状态',
  error_message VARCHAR(255) DEFAULT NULL COMMENT '错误信息',
  processed_at DATETIME DEFAULT NULL COMMENT '处理完成时间',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_message_consumer (message_id, consumer_name),
  KEY idx_business_key (business_key),
  KEY idx_status_created (status, created_at)
) ENGINE=InnoDB COMMENT='异步消息处理日志表';

INSERT INTO categories (id, name, parent_id, sort_order, status)
VALUES
  (1, '手机数码', 0, 10, 1),
  (2, '电脑办公', 0, 20, 1),
  (3, '家用电器', 0, 30, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status);

INSERT INTO products (id, category_id, name, subtitle, description, price, status, cover_url)
VALUES
  (1, 1, 'Nova X1 手机', '轻薄 5G 手机', '适合毕业设计演示的示例手机商品。', 2999.00, 'on_sale', '/api/products/uploads/seed/nova-x1.jpg'),
  (2, 2, 'AirBook 14 笔记本', '14 英寸轻办公', '适合商品列表和详情页演示的示例笔记本。', 4599.00, 'on_sale', '/api/products/uploads/seed/airbook-14.jpg'),
  (3, 3, 'PureWind 空气净化器', '家用净化器', '适合购物车与订单流程联调的示例家电。', 899.00, 'on_sale', '/api/products/uploads/seed/purewind.jpg'),
  (4, 1, 'Stone S12 平板', '11 英寸高刷屏', '适合首页和搜索结果页展示的示例平板。', 2199.00, 'on_sale', '/api/products/uploads/seed/stone-s12.jpg'),
  (5, 2, 'DeskPro 显示器', '27 英寸办公显示器', '适合后台管理商品编辑演示的示例显示器。', 1299.00, 'on_sale', '/api/products/uploads/seed/deskpro.jpg'),
  (6, 3, 'HeatOne 电饭煲', '4L 家用电饭煲', '适合订单与库存调整演示的示例厨房电器。', 399.00, 'off_sale', '/api/products/uploads/seed/heatone.jpg')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  subtitle = VALUES(subtitle),
  description = VALUES(description),
  price = VALUES(price),
  status = VALUES(status),
  cover_url = VALUES(cover_url);

INSERT INTO product_stock (product_id, stock, locked_stock)
VALUES
  (1, 50, 0),
  (2, 30, 0),
  (3, 100, 0),
  (4, 60, 0),
  (5, 25, 0),
  (6, 12, 0)
ON DUPLICATE KEY UPDATE stock = VALUES(stock), locked_stock = VALUES(locked_stock);
