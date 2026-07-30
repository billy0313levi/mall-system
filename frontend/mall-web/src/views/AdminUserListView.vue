<template>
  <section class="admin-panel">
    <div class="section-head">
      <div>
        <h1>用户管理</h1>
      </div>
    </div>

    <el-form class="toolbar admin-toolbar" :inline="true" @submit.prevent="search">
      <el-form-item>
        <el-input v-model.trim="filters.keyword" placeholder="用户名/手机号/邮箱" clearable @keyup.enter="search" />
      </el-form-item>
      <el-form-item>
        <el-select v-model="filters.status" placeholder="全部状态" clearable>
          <el-option label="正常" value="1" />
          <el-option label="禁用" value="0" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-select v-model="filters.role" placeholder="全部角色" clearable>
          <el-option v-for="option in USER_ROLE_OPTIONS" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="search">查询</el-button>
      </el-form-item>
    </el-form>

    <el-alert v-if="message" :title="message" type="error" :closable="false" class="admin-alert" />

    <el-table :data="users" class="admin-table" empty-text="暂无用户数据">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="用户名" min-width="140" />
      <el-table-column prop="phone" label="手机号" min-width="140" />
      <el-table-column prop="email" label="邮箱" min-width="220" />
      <el-table-column label="角色" width="120">
        <template #default="{ row }">{{ formatUserRole(row.role) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="Number(row.status) === 1 ? 'success' : 'danger'" effect="plain">
            {{ formatUserStatus(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button plain @click="toggleStatus(row)">
            {{ Number(row.status) === 1 ? '禁用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <PaginationBar
      :page="pagination.page"
      :page-size="pagination.pageSize"
      :total="pagination.total"
      @change="changePage"
    />
  </section>
</template>

<script setup>
import { reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import http from '../api/http';
import PaginationBar from '../components/PaginationBar.vue';
import { USER_ROLE_OPTIONS, formatUserRole, formatUserStatus } from '../utils/display';

const route = useRoute();
const router = useRouter();
const users = ref([]);
const message = ref('');
const filters = reactive({
  keyword: route.query.keyword || '',
  status: route.query.status || '',
  role: route.query.role || ''
});
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
});

async function loadUsers() {
  try {
    message.value = '';
    const response = await http.get('/users/admin/list', {
      params: {
        page: Number(route.query.page || 1),
        pageSize: 10,
        keyword: route.query.keyword || undefined,
        status: route.query.status || undefined,
        role: route.query.role || undefined
      }
    });
    users.value = response.data.list;
    Object.assign(pagination, response.data.pagination);
  } catch (error) {
    message.value = error.message;
  }
}

function search() {
  router.push({
    name: 'admin-users',
    query: {
      page: 1,
      keyword: filters.keyword || undefined,
      status: filters.status || undefined,
      role: filters.role || undefined
    }
  });
}

function changePage(page) {
  router.push({ name: 'admin-users', query: { ...route.query, page } });
}

async function toggleStatus(user) {
  try {
    const response = await http.patch(`/users/admin/${user.id}/status`, {
      status: Number(user.status) === 1 ? 0 : 1
    });
    message.value = '';
    ElMessage.success(response.message);
    await loadUsers();
  } catch (error) {
    message.value = error.message;
    ElMessage.error(error.message);
  }
}

watch(
  () => route.query,
  () => {
    filters.keyword = route.query.keyword || '';
    filters.status = route.query.status || '';
    filters.role = route.query.role || '';
    loadUsers();
  },
  { immediate: true }
);
</script>
