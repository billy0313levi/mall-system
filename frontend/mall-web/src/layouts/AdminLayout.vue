<template>
  <div class="admin-shell">
    <AdminSidebar />
    <div class="admin-main">
      <header class="admin-header">
        <div class="admin-identity">
          <strong>商城运营后台</strong>
          <span class="muted-text">当前账号：{{ authStore.user?.username }}</span>
        </div>
        <div class="page-actions">
          <RouterLink to="/">
            <el-button plain>返回商城</el-button>
          </RouterLink>
          <el-button plain type="danger" @click="logout">退出登录</el-button>
        </div>
      </header>
      <section class="admin-content">
        <RouterView />
      </section>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import AdminSidebar from "../components/AdminSidebar.vue";

const authStore = useAuthStore();
const router = useRouter();

async function logout() {
  await authStore.logoutRequest();
  router.push("/admin/login");
}
</script>
