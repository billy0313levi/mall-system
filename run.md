# 运行说明

## 环境要求

- Node.js 20+
- npm 10+
- MySQL 8+
- Redis 7+
- RabbitMQ 3.x
- Docker Desktop / Docker Compose

## 启动步骤

### 方式一：Docker Compose

1. 在项目根目录复制环境变量：
   - `copy .env.example .env`
2. 执行依赖安装：
   - `npm run bootstrap`
3. 启动容器：
   - `npm run docker:up`
4. 访问地址：
   - 前端：`http://localhost:5173`
   - 网关：`http://localhost:3000/health`
   - RabbitMQ 管理台：`http://localhost:15672`

### 方式二：本地开发启动

1. 启动中间件：
   - MySQL
   - Redis
   - RabbitMQ
3. 安装依赖：
   - `npm run bootstrap`
4. 依次启动服务：
   - `npm run dev:user`
   - `npm run dev:product`
   - `npm run dev:cart`
   - `npm run dev:order`
   - `npm run dev:payment`
   - `npm run dev:gateway`
   - `npm run dev:frontend`

## 初始化数据库说明

- SQL 脚本路径：`backend/common/sql/init.sql`
- Docker Compose 启动 MySQL 时会自动执行该脚本
- 本地手动启动 MySQL 时，请先执行该脚本再启动各微服务
- `user-service` 会自动补齐默认管理员和测试用户账号

## 常用测试账号

- 普通用户：`demo / User123!`
- 管理员：`admin / Admin123!`
- 备用管理员：`operator / Admin123!`

## RabbitMQ 管理后台访问方式

- 地址：`http://localhost:15672`
- 用户名：`.env` 中的 `RABBITMQ_USER`
- 密码：`.env` 中的 `RABBITMQ_PASSWORD`
