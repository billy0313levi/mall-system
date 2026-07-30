<template>
  <section class="page-panel auth-page admin-login-page">
    <div class="section-head">
      <div>
        <h1>管理员登录</h1>
      </div>
    </div>
    <el-alert v-if="message" :title="message" type="error" :closable="false" class="admin-alert" />
    <el-form class="stack-form admin-login-form" label-position="top" @submit.prevent="submitLogin">
      <el-form-item label="用户名">
        <el-input v-model.trim="form.username" placeholder="请输入管理员用户名" clearable />
      </el-form-item>
      <el-form-item label="密码">
        <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" />
      </el-form-item>
      <div class="form-actions">
        <el-button type="primary" :loading="submitting" @click="submitLogin">登录后台</el-button>
        <RouterLink to="/login">
          <el-button plain>返回用户登录</el-button>
        </RouterLink>
      </div>
    </el-form>
  </section>
</template>

<script setup>
import { reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import http from "../api/http";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const submitting = ref(false);
const message = ref("");
const form = reactive({
  username: "admin",
  password: "Admin123!",
});

async function submitLogin() {
  submitting.value = true;
  message.value = "";
  try {
    const response = await http.post("/users/admin/login", form);
    authStore.setAuth(response.data);
    router.push(route.query.redirect || "/admin");
  } catch (error) {
    message.value = error.message;
  } finally {
    submitting.value = false;
  }
}
</script>
