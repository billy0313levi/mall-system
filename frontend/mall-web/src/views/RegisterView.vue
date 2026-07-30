<template>
  <section class="auth-layout">
    <div class="auth-visual">
      <span class="section-kicker">注册账号</span>
      <h1>创建你的商城账户</h1>
    </div>
    <div class="auth-form-card">
      <div class="store-section-head compact-head">
        <div>
          <h1>用户注册</h1>
        </div>
      </div>
      <form class="stack-form" @submit.prevent="submitRegister">
        <label>
          <span>用户名</span>
          <el-input v-model="form.username" placeholder="至少 3 位" />
        </label>
        <label>
          <span>密码</span>
          <el-input v-model="form.password" type="password" show-password placeholder="至少 6 位" />
        </label>
        <label>
          <span>手机号</span>
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </label>
        <label>
          <span>邮箱</span>
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </label>
        <el-button class="auth-submit-btn" type="primary" native-type="submit" :loading="submitting">{{
          submitting ? "提交中..." : "立即注册"
        }}</el-button>
      </form>
      <div class="auth-links">
        <RouterLink to="/login">已有账号？去登录</RouterLink>
      </div>
      <div v-if="message" class="notice">{{ message }}</div>
    </div>
  </section>
</template>

<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import http from "../api/http";

const router = useRouter();
const submitting = ref(false);
const message = ref("");
const form = reactive({
  username: "",
  password: "",
  phone: "",
  email: "",
});

async function submitRegister() {
  submitting.value = true;
  message.value = "";
  try {
    const response = await http.post("/users/register", form);
    message.value = response.message;
    setTimeout(() => router.push("/login"), 800);
  } catch (error) {
    message.value = error.message;
  } finally {
    submitting.value = false;
  }
}
</script>
