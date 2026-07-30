const bcrypt = require('bcryptjs');
const cors = require('cors');
const express = require('express');
const {
  env,
  execute,
  getRedisClient,
  requireAuth,
  requireRole,
  logger,
  success,
  wrapAsync,
  notFoundHandler,
  errorHandler,
  AppError,
  jwt
} = require('@mall/common');

const app = express();
const redis = getRedisClient();

app.use(cors());
app.use(express.json());

function normalizePage(value, fallback) {
  const parsed = Number(value || fallback);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

function validateRegisterPayload(body) {
  const { username, password } = body;
  if (!username || username.length < 3) {
    throw new AppError('用户名至少 3 位', 400, 'INVALID_USERNAME');
  }
  if (!password || password.length < 6) {
    throw new AppError('密码至少 6 位', 400, 'INVALID_PASSWORD');
  }
}

function validateProfilePayload(body) {
  if (body.phone && !/^1\d{10}$/.test(body.phone)) {
    throw new AppError('手机号格式不正确', 400, 'INVALID_PHONE');
  }
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    throw new AppError('邮箱格式不正确', 400, 'INVALID_EMAIL');
  }
}

function validateAddressPayload(body) {
  const requiredFields = ['receiverName', 'receiverPhone', 'province', 'city', 'district', 'detailAddress'];
  for (const field of requiredFields) {
    if (!body[field]) {
      throw new AppError(`地址字段缺失: ${field}`, 400, 'INVALID_ADDRESS_PAYLOAD');
    }
  }
  if (!/^1\d{10}$/.test(body.receiverPhone)) {
    throw new AppError('收货手机号格式不正确', 400, 'INVALID_PHONE');
  }
}

function buildTokenPayload(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role
  };
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    phone: user.phone,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

function sanitizeAddress(address) {
  return {
    id: address.id,
    userId: address.user_id,
    receiverName: address.receiver_name,
    receiverPhone: address.receiver_phone,
    province: address.province,
    city: address.city,
    district: address.district,
    detailAddress: address.detail_address,
    postalCode: address.postal_code,
    isDefault: Number(address.is_default) === 1,
    status: address.status,
    createdAt: address.created_at,
    updatedAt: address.updated_at
  };
}

async function findUserByUsername(username) {
  const rows = await execute('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
  return rows[0] || null;
}

async function getUserById(userId) {
  const rows = await execute(
    'SELECT id, username, phone, email, role, status, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  return rows[0] || null;
}

async function seedUsers() {
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const userPassword = await bcrypt.hash('User123!', 10);

  await execute(
    `INSERT INTO users (username, password_hash, phone, email, role, status)
     VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       phone = VALUES(phone),
       email = VALUES(email),
       role = VALUES(role),
       status = VALUES(status)`,
    [
      'admin',
      adminPassword,
      '13800000000',
      'admin@mall.local',
      'admin',
      1,
      'demo',
      userPassword,
      '13900000000',
      'demo@mall.local',
      'user',
      1,
      'operator',
      adminPassword,
      '13700000000',
      'operator@mall.local',
      'admin',
      1
    ]
  );
}

app.get('/health', (_req, res) => success(res, { service: 'user-service' }, 'user ok'));

app.post(
  '/api/users/register',
  wrapAsync(async (req, res) => {
    validateRegisterPayload(req.body);
    validateProfilePayload(req.body);
    const { username, password, phone = '', email = '' } = req.body;

    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      throw new AppError('用户名已存在', 409, 'USERNAME_EXISTS');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await execute(
      `INSERT INTO users (username, password_hash, phone, email, role, status)
       VALUES (?, ?, ?, ?, 'user', 1)`,
      [username, passwordHash, phone, email]
    );

    return success(res, { id: result.insertId, username }, '注册成功');
  })
);

app.post(
  '/api/users/login',
  wrapAsync(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      throw new AppError('用户名和密码不能为空', 400, 'INVALID_CREDENTIALS');
    }

    const user = await findUserByUsername(username);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new AppError('用户名或密码错误', 401, 'LOGIN_FAILED');
    }
    if (Number(user.status) !== 1) {
      throw new AppError('账号已被禁用', 403, 'ACCOUNT_DISABLED');
    }

    const token = jwt.signToken(buildTokenPayload(user));
    return success(res, { token, user: sanitizeUser(user) }, '登录成功');
  })
);

app.post(
  '/api/users/admin/login',
  wrapAsync(async (req, res) => {
    const { username, password } = req.body;
    const user = await findUserByUsername(username);

    if (!user || !(await bcrypt.compare(password, user.password_hash)) || user.role !== 'admin') {
      throw new AppError('管理员账号或密码错误', 401, 'ADMIN_LOGIN_FAILED');
    }
    if (Number(user.status) !== 1) {
      throw new AppError('管理员账号已被禁用', 403, 'ACCOUNT_DISABLED');
    }

    const token = jwt.signToken(buildTokenPayload(user));
    return success(res, { token, user: sanitizeUser(user) }, '管理员登录成功');
  })
);

app.post(
  '/api/users/logout',
  requireAuth,
  wrapAsync(async (req, res) => {
    if (!req.token) {
      throw new AppError('缺少登录令牌', 400, 'TOKEN_REQUIRED');
    }
    const decoded = jwt.decodeToken(req.token);
    const expiresAt = Number(decoded?.exp || 0);
    const ttl = Math.max(expiresAt - Math.floor(Date.now() / 1000), 1);
    await redis.set(`token:blacklist:${req.token}`, '1', 'EX', ttl);
    return success(res, null, '退出登录成功');
  })
);

app.get(
  '/api/users/me',
  requireAuth,
  wrapAsync(async (req, res) => {
    const user = await getUserById(req.user.id);
    if (!user) {
      throw new AppError('用户不存在', 404, 'USER_NOT_FOUND');
    }
    return success(res, sanitizeUser(user), '获取成功');
  })
);

app.put(
  '/api/users/profile',
  requireAuth,
  wrapAsync(async (req, res) => {
    validateProfilePayload(req.body);
    const { phone = '', email = '' } = req.body;
    await execute('UPDATE users SET phone = ?, email = ? WHERE id = ?', [phone, email, req.user.id]);
    const user = await getUserById(req.user.id);
    return success(res, sanitizeUser(user), '资料更新成功');
  })
);

app.get(
  '/api/users/addresses',
  requireAuth,
  wrapAsync(async (req, res) => {
    const rows = await execute(
      `SELECT * FROM addresses
       WHERE user_id = ? AND status = 1
       ORDER BY is_default DESC, id DESC`,
      [req.user.id]
    );
    return success(res, rows.map(sanitizeAddress), '获取地址列表成功');
  })
);

app.post(
  '/api/users/addresses',
  requireAuth,
  wrapAsync(async (req, res) => {
    validateAddressPayload(req.body);
    const { receiverName, receiverPhone, province, city, district, detailAddress, postalCode = '', isDefault = false } = req.body;

    if (isDefault) {
      await execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
    }

    const result = await execute(
      `INSERT INTO addresses
       (user_id, receiver_name, receiver_phone, province, city, district, detail_address, postal_code, is_default, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [req.user.id, receiverName, receiverPhone, province, city, district, detailAddress, postalCode, isDefault ? 1 : 0]
    );

    const rows = await execute('SELECT * FROM addresses WHERE id = ? LIMIT 1', [result.insertId]);
    return success(res, sanitizeAddress(rows[0]), '新增地址成功');
  })
);

app.put(
  '/api/users/addresses/:id',
  requireAuth,
  wrapAsync(async (req, res) => {
    validateAddressPayload(req.body);
    const addressId = Number(req.params.id);
    const rows = await execute('SELECT * FROM addresses WHERE id = ? AND user_id = ? AND status = 1 LIMIT 1', [addressId, req.user.id]);
    if (!rows[0]) {
      throw new AppError('地址不存在', 404, 'ADDRESS_NOT_FOUND');
    }

    const { receiverName, receiverPhone, province, city, district, detailAddress, postalCode = '', isDefault = false } = req.body;
    if (isDefault) {
      await execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
    }

    await execute(
      `UPDATE addresses
       SET receiver_name = ?, receiver_phone = ?, province = ?, city = ?, district = ?, detail_address = ?, postal_code = ?, is_default = ?
       WHERE id = ? AND user_id = ?`,
      [receiverName, receiverPhone, province, city, district, detailAddress, postalCode, isDefault ? 1 : 0, addressId, req.user.id]
    );

    const latestRows = await execute('SELECT * FROM addresses WHERE id = ? LIMIT 1', [addressId]);
    return success(res, sanitizeAddress(latestRows[0]), '更新地址成功');
  })
);

app.delete(
  '/api/users/addresses/:id',
  requireAuth,
  wrapAsync(async (req, res) => {
    const addressId = Number(req.params.id);
    await execute('UPDATE addresses SET status = 0, is_default = 0 WHERE id = ? AND user_id = ?', [addressId, req.user.id]);
    return success(res, null, '删除地址成功');
  })
);

app.get(
  '/api/users/admin/list',
  requireAuth,
  requireRole('admin'),
  wrapAsync(async (req, res) => {
    const page = normalizePage(req.query.page, 1);
    const pageSize = Math.min(normalizePage(req.query.pageSize, 10), 50);
    const keyword = (req.query.keyword || '').trim();
    const status = req.query.status !== undefined && req.query.status !== '' ? Number(req.query.status) : null;
    const role = (req.query.role || '').trim();

    const whereSql = ['1 = 1'];
    const params = [];
    if (keyword) {
      whereSql.push('(username LIKE ? OR phone LIKE ? OR email LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (status !== null) {
      whereSql.push('status = ?');
      params.push(status);
    }
    if (role) {
      whereSql.push('role = ?');
      params.push(role);
    }

    const whereClause = `WHERE ${whereSql.join(' AND ')}`;
    const totalRows = await execute(`SELECT COUNT(*) AS total FROM users ${whereClause}`, params);
    const rows = await execute(
      `SELECT id, username, phone, email, role, status, created_at, updated_at
       FROM users
       ${whereClause}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );

    return success(
      res,
      {
        list: rows.map(sanitizeUser),
        pagination: { page, pageSize, total: totalRows[0].total }
      },
      '获取用户列表成功'
    );
  })
);

app.patch(
  '/api/users/admin/:id/status',
  requireAuth,
  requireRole('admin'),
  wrapAsync(async (req, res) => {
    const userId = Number(req.params.id);
    const status = Number(req.body.status);
    if (![0, 1].includes(status)) {
      throw new AppError('用户状态不合法', 400, 'INVALID_USER_STATUS');
    }
    if (userId === req.user.id && status === 0) {
      throw new AppError('不能禁用当前登录管理员', 400, 'INVALID_OPERATION');
    }

    await execute('UPDATE users SET status = ? WHERE id = ?', [status, userId]);
    const user = await getUserById(userId);
    if (!user) {
      throw new AppError('用户不存在', 404, 'USER_NOT_FOUND');
    }
    return success(res, sanitizeUser(user), status === 1 ? '启用用户成功' : '禁用用户成功');
  })
);

app.use(notFoundHandler);
app.use(errorHandler);

seedUsers()
  .then(() => {
    app.listen(env.services.user.port, () => {
      logger.info(`user-service running on port ${env.services.user.port}`);
    });
  })
  .catch((error) => {
    logger.error('user-service failed to start', error);
    process.exit(1);
  });
