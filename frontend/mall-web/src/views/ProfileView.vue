<template>
  <section class="store-page">
    <div class="store-crumb">首页 / 个人中心</div>
    <div class="member-layout">
      <aside class="member-sidebar">
        <div class="member-card">
          <strong>{{ authStore.user?.username }}</strong>
          <span>{{ formatUserRole(authStore.user?.role) }}</span>
          <span>{{ formatUserStatus(authStore.user?.status) }}</span>
        </div>
        <RouterLink class="member-link" to="/addresses">地址管理</RouterLink>
        <RouterLink class="member-link" to="/orders">我的订单</RouterLink>
      </aside>

      <div class="member-main-card">
        <div class="store-section-head">
          <div>
            <h1>个人资料</h1>
          </div>
        </div>
        <form class="stack-form member-form" @submit.prevent="submitProfile">
          <label>
            <span>手机号</span>
            <el-input v-model="form.phone" />
          </label>
          <label>
            <span>邮箱</span>
            <el-input v-model="form.email" />
          </label>
          <el-button class="auth-submit-btn" type="primary" native-type="submit" :loading="submitting">{{
            submitting ? "保存中..." : "保存修改"
          }}</el-button>
        </form>
        <div v-if="message" class="notice">{{ message }}</div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import http from "../api/http";
import { useAuthStore } from "../stores/auth";
import { formatUserRole, formatUserStatus } from "../utils/display";

const authStore = useAuthStore();
const form = reactive({
  phone: "",
  email: "",
});
const message = ref("");
const submitting = ref(false);

async function loadProfile() {
  await authStore.fetchProfile();
  form.phone = authStore.user?.phone || "";
  form.email = authStore.user?.email || "";
}

async function submitProfile() {
  submitting.value = true;
  message.value = "";
  try {
    const response = await http.put("/users/profile", form);
    authStore.user = response.data;
    message.value = response.message;
  } catch (error) {
    message.value = error.message;
  } finally {
    submitting.value = false;
  }
}

onMounted(loadProfile);
</script>
