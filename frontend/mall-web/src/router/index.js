import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import SiteLayout from '../layouts/SiteLayout.vue';
import AdminLayout from '../layouts/AdminLayout.vue';
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import ProductListView from '../views/ProductListView.vue';
import SearchResultView from '../views/SearchResultView.vue';
import ProductDetailView from '../views/ProductDetailView.vue';
import CartView from '../views/CartView.vue';
import CheckoutView from '../views/CheckoutView.vue';
import OrderListView from '../views/OrderListView.vue';
import OrderDetailView from '../views/OrderDetailView.vue';
import PaymentView from '../views/PaymentView.vue';
import ProfileView from '../views/ProfileView.vue';
import AddressManagementView from '../views/AddressManagementView.vue';
import AdminLoginView from '../views/AdminLoginView.vue';
import AdminDashboardView from '../views/AdminDashboardView.vue';
import AdminProductListView from '../views/AdminProductListView.vue';
import AdminProductFormView from '../views/AdminProductFormView.vue';
import AdminCategoryView from '../views/AdminCategoryView.vue';
import AdminOrderListView from '../views/AdminOrderListView.vue';
import AdminUserListView from '../views/AdminUserListView.vue';
import AdminStockView from '../views/AdminStockView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: SiteLayout,
      children: [
        { path: '', name: 'home', component: HomeView },
        { path: 'login', name: 'login', component: LoginView, meta: { guestOnly: true } },
        { path: 'register', name: 'register', component: RegisterView, meta: { guestOnly: true } },
        { path: 'products', name: 'products', component: ProductListView },
        { path: 'search', name: 'search', component: SearchResultView },
        { path: 'products/:id', name: 'product-detail', component: ProductDetailView },
        { path: 'cart', name: 'cart', component: CartView, meta: { requiresAuth: true } },
        { path: 'checkout', name: 'checkout', component: CheckoutView, meta: { requiresAuth: true } },
        { path: 'orders', name: 'orders', component: OrderListView, meta: { requiresAuth: true } },
        { path: 'orders/:orderNo', name: 'order-detail', component: OrderDetailView, meta: { requiresAuth: true } },
        { path: 'pay/:orderNo', name: 'payment', component: PaymentView, meta: { requiresAuth: true } },
        { path: 'profile', name: 'profile', component: ProfileView, meta: { requiresAuth: true } },
        { path: 'addresses', name: 'addresses', component: AddressManagementView, meta: { requiresAuth: true } }
      ]
    },
    {
      path: '/admin/login',
      name: 'admin-login',
      component: AdminLoginView,
      meta: { guestOnly: true }
    },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        { path: '', name: 'admin-dashboard', component: AdminDashboardView },
        { path: 'products', name: 'admin-products', component: AdminProductListView },
        { path: 'products/new', name: 'admin-product-new', component: AdminProductFormView },
        { path: 'products/:id/edit', name: 'admin-product-edit', component: AdminProductFormView },
        { path: 'categories', name: 'admin-categories', component: AdminCategoryView },
        { path: 'orders', name: 'admin-orders', component: AdminOrderListView },
        { path: 'users', name: 'admin-users', component: AdminUserListView },
        { path: 'stock', name: 'admin-stock', component: AdminStockView }
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
