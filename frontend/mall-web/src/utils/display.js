const productStatusLabels = {
  on_sale: '销售中',
  off_sale: '已下架',
  deleted: '已删除'
};

const orderStatusLabels = {
  pending: '待支付',
  paid: '已支付',
  cancelled: '已取消',
  shipped: '已发货',
  finished: '已完成',
  failed: '已失败'
};

const paymentStatusLabels = {
  success: '支付成功',
  failed: '支付失败'
};

const userRoleLabels = {
  user: '普通用户',
  admin: '管理员'
};

const userStatusLabels = {
  1: '正常',
  0: '已禁用'
};

const categoryStatusLabels = {
  1: '启用',
  0: '停用'
};

const stockAdjustTypeLabels = {
  set: '直接设置',
  increase: '增加库存',
  decrease: '减少库存'
};

const orderLogActionLabels = {
  created: '订单创建',
  order_created_skipped: '库存消息跳过',
  stock_deduct_dispatch: '发送扣减消息',
  stock_deducted: '库存扣减完成',
  stock_rollback_completed: '库存补偿完成',
  paid: '支付完成',
  payment_failed: '支付失败',
  cancelled: '订单取消',
  admin_status_update: '后台修改状态',
  internal_status_update: '内部状态更新',
  internal_log: '内部日志',
  order_paid_skipped: '支付消息跳过'
};

const imagePlaceholder = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="720" height="540" viewBox="0 0 720 540">
    <rect width="720" height="540" fill="#f4f1ea"/>
    <rect x="44" y="44" width="632" height="452" rx="20" fill="#fffdf9" stroke="#d8d1c6" stroke-width="2"/>
    <circle cx="230" cy="210" r="46" fill="#d9cfbe"/>
    <path d="M132 402l118-118 88 74 80-102 170 146H132z" fill="#b96545"/>
    <path d="M132 420h456" stroke="#e2dbd0" stroke-width="10" stroke-linecap="round"/>
    <text x="360" y="470" text-anchor="middle" fill="#796f62" font-size="30" font-family="Microsoft YaHei, sans-serif">
      暂无商品图片
    </text>
  </svg>
`)}`;

function getApiOrigin() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  try {
    return new URL(baseUrl, window.location.origin).origin;
  } catch (_error) {
    return window.location.origin;
  }
}

function labelFromMap(map, value, fallback = '-') {
  const key = String(value);
  return map[key] || fallback;
}

export const PRODUCT_STATUS_OPTIONS = Object.entries(productStatusLabels).map(([value, label]) => ({ value, label }));
export const ORDER_STATUS_OPTIONS = Object.entries(orderStatusLabels).map(([value, label]) => ({ value, label }));
export const USER_ROLE_OPTIONS = Object.entries(userRoleLabels).map(([value, label]) => ({ value, label }));
export const STOCK_ADJUST_OPTIONS = Object.entries(stockAdjustTypeLabels).map(([value, label]) => ({ value, label }));

export function formatProductStatus(value) {
  return labelFromMap(productStatusLabels, value, '未知状态');
}

export function formatOrderStatus(value) {
  return labelFromMap(orderStatusLabels, value, '未知状态');
}

export function formatPaymentStatus(value) {
  return labelFromMap(paymentStatusLabels, value, '未知状态');
}

export function formatUserRole(value) {
  return labelFromMap(userRoleLabels, value, '未知角色');
}

export function formatUserStatus(value) {
  return labelFromMap(userStatusLabels, value, '未知状态');
}

export function formatCategoryStatus(value) {
  return labelFromMap(categoryStatusLabels, value, '未知状态');
}

export function formatStockAdjustType(value) {
  return labelFromMap(stockAdjustTypeLabels, value, '未知方式');
}

export function formatOrderLogAction(value) {
  return labelFromMap(orderLogActionLabels, value, value || '未知日志');
}

export function resolveImageUrl(url) {
  if (!url) {
    return imagePlaceholder;
  }
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${getApiOrigin()}${url.startsWith('/') ? url : `/${url}`}`;
}
