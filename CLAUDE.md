# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

基于 Vue3 + Node.js (Express) 的微服务商城系统，围绕 **网关、用户、商品、购物车、订单、支付** 六个服务展开。基础设施依赖 MySQL、Redis、RabbitMQ，通过 Docker Compose 编排。

## 常用命令

```bash
# 安装全部依赖（首次运行）
npm run bootstrap

# Docker 方式启动全部服务（含 MySQL/Redis/RabbitMQ）
npm run docker:up

# 本地开发 - 逐个启动微服务（需先手动启动 MySQL/Redis/RabbitMQ）
npm run dev:user        # 用户服务    :3101
npm run dev:product     # 商品服务    :3102
npm run dev:cart        # 购物车服务  :3103
npm run dev:order       # 订单服务    :3104
npm run dev:payment     # 支付服务    :3105
npm run dev:gateway     # API 网关    :3000
npm run dev:frontend    # 前端        :5173

# 前端单独操作（在 frontend/mall-web 目录下）
npm run dev             # Vite 开发服务器
npm run build           # 生产构建
npm run preview         # 预览构建产物
```

**首次本地启动前**，需要手动执行 `backend/common/sql/init.sql` 初始化数据库（Docker 方式会自动执行）。

## 架构总览

### 请求链路

```
浏览器 :5173 → API 网关 :3000 → 下游微服务 :3101-:3105
                      ↓
           认证/鉴权/限流（网关中间件层）
```

- **网关** 是唯一对外暴露的入口，通过 `http-proxy-middleware` 反向代理到各微服务，转发时注入 `x-user-id`、`x-user-role`、`x-user-name` 请求头
- 各微服务之间通过 **HTTP 直连**（携带 `x-internal-token` 内部鉴权）和 **RabbitMQ 消息队列** 两种方式通信

### 公共模块 `backend/common`（`@mall/common`）

所有后端服务共享的基础库，通过 npm workspace 引用：
- `config/env.js` — 统一读取 `.env` 环境变量（MySQL/Redis/RabbitMQ/JWT/各服务端口）
- `db/mysql.js` — MySQL 连接池 + `execute(sql, params)` 便捷查询 + `withTransaction` 事务封装
- `db/redis.js` — ioredis 单例
- `db/rabbitmq.js` — RabbitMQ 连接管理、`publishMessage`/`consumeMessage`，启动时自动声明 exchange（topic 模式）和四个队列
- `middlewares/auth.js` — `requireAuth`（JWT 必验）、`optionalAuth`、`requireRole`、`requireInternalToken`
- `utils/response.js` — 统一响应格式 `success(res, data, msg)` / `fail(res, msg, code)` + `wrapAsync` + `errorHandler`
- `utils/jwt.js` — JWT 签发/验证/解码
- `errors/AppError.js` — 自定义异常类（message, statusCode, code, details）

### 微服务职责与端口

| 服务 | 端口 | 职责 |
|------|------|------|
| gateway-service | 3000 | 统一入口、认证鉴权、限流、反向代理 |
| user-service | 3101 | 注册/登录/登出（JWT 黑名单）、个人信息、收货地址 CRUD、管理员用户管理、启动时写入默认账号 |
| product-service | 3102 | 商品/分类 CRUD、库存管理、图片上传（multer）、Redis 缓存商品列表/详情、消费库存扣减/回滚消息 |
| cart-service | 3103 | 购物车 CRUD（Redis Hash 存储，key=`cart:user:{userId}`）、内部接口供订单服务调用 |
| order-service | 3104 | 创建订单（分布式锁防重）、订单列表/详情、取消订单、状态机流转、消费 order.created/order.paid 消息 |
| payment-service | 3105 | 模拟支付、支付回调、发布 order.paid 消息 |

### 事件驱动流程

订单状态流转通过 RabbitMQ 异步解耦：

```
用户下单 → order-service 创建订单(pending) → 发布 order.created
  → order-service 自身消费 → 转发 stock.deduct
    → product-service 消费 → 扣减库存 → 写入 order_logs
用户支付 → payment-service → 发布 order.paid
  → product-service 消费（确认库存扣减完成）
  → order-service 消费 → 更新订单状态为 paid
取消订单 → order-service → 若库存已扣减 → 发布 stock.rollback
  → product-service 消费 → 回滚库存
```

关键设计要点：
- `message_logs` 表记录每条消息的处理状态，消费者处理前先查重，保证**幂等性**
- 订单提交使用 Redis 分布式锁（`order:submit:user:{userId}`，5 秒过期），防止重复提交
- 库存扣减使用 `SELECT ... FOR UPDATE` 行锁
- 取消已扣减库存的订单时自动发布库存回滚消息

### 前端架构

- **技术栈**: Vue3 + Vite + Pinia（持久化插件）+ Vue Router + Element Plus（中文 locale）+ ECharts + Axios
- **布局**: 前台 `SiteLayout`（含 SiteHeader 导航）、后台 `AdminLayout`（含 AdminSidebar 侧边栏）
- **路由**: 前台路由 `/`（home/products/cart/checkout/orders/profile/addresses），后台路由 `/admin`（dashboard/products/categories/orders/users/stock），独立 `/admin/login`
- **鉴权**: JWT 存 Pinia → `pinia-plugin-persistedstate` 持久化到 localStorage → Axios 请求拦截器自动附加 `Authorization: Bearer` → 401 时清空登录态并跳转
- **路由守卫** (`router/index.js`): `requiresAuth` 未登录跳登录页；`requiresAdmin` 非管理员跳首页；`guestOnly` 已登录跳回首页
- **API 封装** (`api/http.js`): Axios 实例，响应拦截器自动解包 `response.data`，错误统一 message 提取
- **路径别名**: `@` → `src/`

### 数据库表结构

单库 `mall_system`，核心表：`users`、`categories`、`products`、`product_stock`、`orders`、`order_items`、`order_logs`、`payments`、`message_logs`、`addresses`。

- 商品状态: `on_sale` / `off_sale` / `deleted`（软删除）
- 订单状态: `pending → paid → shipped → finished`，可从 `pending` 直接到 `cancelled`/`failed`
- 用户角色: `user` / `admin`

## 环境变量

全部配置集中在项目根目录 `.env` 文件，`backend/common/src/config/env.js` 统一解析。关键变量：

- `NODE_ENV` — 运行环境（development/production）
- `MYSQL_*` / `REDIS_*` / `RABBITMQ_*` — 中间件连接信息
- `JWT_SECRET` / `JWT_EXPIRES_IN` — JWT 配置
- `INTERNAL_SERVICE_TOKEN` — 微服务内部调用鉴权令牌
- `*_SERVICE_PORT` / `*_SERVICE_URL` — 各服务端口与地址
- `RATE_LIMIT_*` — 网关限流参数
- `VITE_API_BASE_URL` — 前端请求网关的基地址

## 开发注意事项

- 本地开发时各服务**独立进程**运行，修改代码后需重启对应服务（无热重载）。前端 Vite 支持 HMR
- `user-service` 启动时会自动执行 `seedUsers()` 写入三个默认账号（admin/demo/operator），密码用 bcrypt 哈希后入库，重复启动不会重复插入（`ON DUPLICATE KEY UPDATE`）
- `product-service` 启动时会自动创建 `uploads/` 目录存放商品图片，图片通过 `/api/products/uploads/` 静态托管
- Docker Compose 中各服务的 `depends_on` 已配置启动顺序，MySQL 有 healthcheck
- 前端 `pinia-plugin-persistedstate` 默认将整个 auth store 序列化到 localStorage，登出时调用 `clearLocalAuth()` 清除
