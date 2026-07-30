<template>
  <header class="site-header">
    <div class="page-container header-inner">
      <RouterLink class="brand" to="/">Mall System</RouterLink>
      <nav class="main-nav">
        <RouterLink to="/">商品</RouterLink>
        <RouterLink to="/cart">购物车</RouterLink>
        <RouterLink to="/orders">订单</RouterLink>
        <RouterLink to="/admin">管理入口</RouterLink>
      </nav>
      <div class="user-bar">
        <template v-if="authStore.user">
          <span class="user-name">{{ authStore.user.username }} / {{ formatUserRole(authStore.user.role) }}</span>
          <button class="btn btn-light" type="button" @click="logout">退出</button>
        </template>
        <template v-else>
          <RouterLink class="text-link" to="/login">登录</RouterLink>
          <RouterLink class="btn btn-primary" to="/register">注册</RouterLink>
        </template>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { formatUserRole } from '../utils/display';

const authStore = useAuthStore();
const router = useRouter();

function logout() {
  authStore.logout();
  router.push('/login');
}
</script>
