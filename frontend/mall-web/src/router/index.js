import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

// 布局组件懒加载
const SiteLayout = () => import('../layouts/SiteLayout.vue');
const AdminLayout = () => import('../layouts/AdminLayout.vue');

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: SiteLayout,
      redirect: '/home',
      children: [
        { path: 'home', name: 'home', component: () => import('../views/HomeView.vue') },
        { path: 'login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { guestOnly: true } },
        { path: 'register', name: 'register', component: () => import('../views/RegisterView.vue'), meta: { guestOnly: true } },
        { path: 'products', name: 'products', component: () => import('../views/ProductListView.vue') },
        { path: 'search', name: 'search', component: () => import('../views/SearchResultView.vue') },
        { path: 'products/:id', name: 'product-detail', component: () => import('../views/ProductDetailView.vue') },
        { path: 'cart', name: 'cart', component: () => import('../views/CartView.vue'), meta: { requiresAuth: true } },
        { path: 'checkout', name: 'checkout', component: () => import('../views/CheckoutView.vue'), meta: { requiresAuth: true } },
        { path: 'orders', name: 'orders', component: () => import('../views/OrderListView.vue'), meta: { requiresAuth: true } },
        { path: 'orders/:orderNo', name: 'order-detail', component: () => import('../views/OrderDetailView.vue'), meta: { requiresAuth: true } },
        { path: 'pay/:orderNo', name: 'payment', component: () => import('../views/PaymentView.vue'), meta: { requiresAuth: true } },
        { path: 'profile', name: 'profile', component: () => import('../views/ProfileView.vue'), meta: { requiresAuth: true } },
        { path: 'addresses', name: 'addresses', component: () => import('../views/AddressManagementView.vue'), meta: { requiresAuth: true } }
      ]
    },
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('../views/AdminLoginView.vue'),
      meta: { guestOnly: true }
    },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        { path: '', name: 'admin-dashboard', component: () => import('../views/AdminDashboardView.vue') },
        { path: 'products', name: 'admin-products', component: () => import('../views/AdminProductListView.vue') },
        { path: 'products/new', name: 'admin-product-new', component: () => import('../views/AdminProductFormView.vue') },
        { path: 'products/:id/edit', name: 'admin-product-edit', component: () => import('../views/AdminProductFormView.vue') },
        { path: 'categories', name: 'admin-categories', component: () => import('../views/AdminCategoryView.vue') },
        { path: 'orders', name: 'admin-orders', component: () => import('../views/AdminOrderListView.vue') },
        { path: 'users', name: 'admin-users', component: () => import('../views/AdminUserListView.vue') },
        { path: 'stock', name: 'admin-stock', component: () => import('../views/AdminStockView.vue') }
      ]
    }
  ]
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  if (authStore.token && !authStore.user) {
    try {
      await authStore.fetchProfile();
    } catch (_error) {
      authStore.clearLocalAuth();
    }
  }

  if (to.meta.guestOnly && authStore.isLoggedIn) {
    return authStore.isAdmin ? { name: 'admin-dashboard' } : { name: 'home' };
  }

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return authStore.isLoggedIn ? { name: 'home' } : { name: 'admin-login' };
  }

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return to.path.startsWith('/admin')
      ? { name: 'admin-login', query: { redirect: to.fullPath } }
      : { name: 'login', query: { redirect: to.fullPath } };
  }

  return true;
});

export default router;