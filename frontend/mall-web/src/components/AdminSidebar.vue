<template>
  <aside class="admin-sidebar">
    <RouterLink class="admin-brand" to="/admin">
      <span>山河商城</span>
      <small class="admin-brand-note">运营后台</small>
    </RouterLink>
    <el-menu
      class="admin-menu"
      :default-active="activePath"
      router
      background-color="transparent"
      text-color="rgba(246, 242, 234, 0.84)"
      active-text-color="#ffffff"
    >
      <el-menu-item index="/admin">后台首页</el-menu-item>
      <el-menu-item index="/admin/products">商品管理</el-menu-item>
      <el-menu-item index="/admin/categories">分类管理</el-menu-item>
      <el-menu-item index="/admin/orders">订单管理</el-menu-item>
      <el-menu-item index="/admin/users">用户管理</el-menu-item>
      <el-menu-item index="/admin/stock">库存管理</el-menu-item>
    </el-menu>
  </aside>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const activePath = computed(() => {
  if (route.path.startsWith('/admin/products')) {
    return '/admin/products';
  }
  return route.path;
});
</script>
