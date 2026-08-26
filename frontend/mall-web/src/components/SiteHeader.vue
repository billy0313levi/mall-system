<template>
  <header class="site-header">
    <div class="site-topbar">
      <div class="page-width topbar-inner">
        <div class="topbar-links">
          <span>欢迎来到山河商城</span>
          <span>满 99 元包邮</span>
          <span>正品保障</span>
        </div>
        <div class="topbar-actions">
          <RouterLink to="/profile">个人中心</RouterLink>
          <RouterLink to="/addresses">地址管理</RouterLink>
          <RouterLink to="/orders">我的订单</RouterLink>
        </div>
      </div>
    </div>

    <div class="site-head-core">
      <div class="page-width storefront-head-row">
        <RouterLink class="store-logo" to="/">
          <span class="store-logo-mark">山河</span>
          <div>
            <strong>山河商城</strong>
            <small>精选日用与数码</small>
          </div>
        </RouterLink>

        <form class="store-search" @submit.prevent="submitSearch">
          <div class="store-search-box">
            <el-input v-model="keyword" placeholder="搜索商品名称、关键词" clearable />
            <el-button class="store-search-btn" type="primary" native-type="submit">搜索</el-button>
          </div>
          <div class="store-hotwords">
            <RouterLink to="/search?keyword=手机">手机</RouterLink>
            <RouterLink to="/search?keyword=耳机">耳机</RouterLink>
            <RouterLink to="/search?keyword=家清">家清</RouterLink>
          </div>
        </form>

        <div class="store-utility-panel">
          <RouterLink class="store-cart-entry" to="/cart">
            <span class="store-utility-label">购物车</span>
            <strong>已选商品</strong>
          </RouterLink>
          <div class="store-account-panel">
            <template v-if="authStore.user">
              <div class="store-account-head">
                <span class="store-utility-label">当前账户</span>
                <strong>{{ authStore.user.username }}</strong>
              </div>
              <div class="store-account-links">
                <RouterLink v-if="authStore.isAdmin" to="/admin">进入后台</RouterLink>
                <el-button link type="danger" @click="logout">退出登录</el-button>
              </div>
            </template>
            <template v-else>
              <div class="store-account-head">
                <span class="store-utility-label">账户中心</span>
                <strong>欢迎登录</strong>
              </div>
              <div class="store-account-links">
                <RouterLink to="/login">登录</RouterLink>
                <RouterLink to="/register">注册</RouterLink>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div class="store-nav-bar">
      <div class="page-width store-nav-row">
        <nav class="store-main-nav">
          <RouterLink to="/home">首页</RouterLink>
          <RouterLink to="/products">全部商品</RouterLink>
          <RouterLink to="/orders">订单中心</RouterLink>
          <RouterLink to="/addresses">收货地址</RouterLink>
          <RouterLink v-if="authStore.isAdmin" to="/admin">后台管理</RouterLink>
        </nav>
        <div class="store-service-note">
          <span>闪电发货</span>
          <span>七天无忧</span>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const router = useRouter();
const keyword = ref('');

function submitSearch() {
  router.push({ name: 'search', query: { keyword: keyword.value } });
}

async function logout() {
  await authStore.logoutRequest();
  router.push('/');
}
</script>
