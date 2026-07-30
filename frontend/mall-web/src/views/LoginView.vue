<template>
  <section class="auth-layout">
    <div class="auth-visual">
      <span class="section-kicker">会员登录</span>
      <h1>欢迎回到山河商城</h1>
    </div>
    <div class="auth-form-card">
      <div class="store-section-head compact-head">
        <div>
          <h1>用户登录</h1>
          <p>请输入账号信息</p>
        </div>
      </div>
      <form class="stack-form" @submit.prevent="submitLogin">
        <label>
          <span>用户名</span>
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </label>
        <label>
          <span>密码</span>
          <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" />
        </label>
        <el-button class="auth-submit-btn" type="primary" native-type="submit" :loading="submitting">{{
          submitting ? "登录中..." : "登录"
        }}</el-button>
      </form>
      <div class="auth-links">
        <RouterLink to="/register">注册新账号</RouterLink>
        <RouterLink to="/admin/login">管理员登录</RouterLink>
      </div>
      <div v-if="message" class="notice">{{ message }}</div>
    </div>
  </section>
</template>

<script setup>
import { reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import http from "../api/http";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const submitting = ref(false);
const message = ref("");
const form = reactive({
  username: "demo",
  password: "User123!",
});

async function submitLogin() {
  submitting.value = true;
  message.value = "";
  try {
    const response = await http.post("/users/login", form);
    authStore.setAuth(response.data);
    router.push(route.query.redirect || "/");
  } catch (error) {
    message.value = error.message;
  } finally {
    submitting.value = false;
  }
}
</script>
