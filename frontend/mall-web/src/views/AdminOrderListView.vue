<template>
  <section class="admin-panel">
    <div class="section-head">
      <div>
        <h1>订单管理</h1>
      </div>
    </div>

    <el-form class="toolbar admin-toolbar" :inline="true" @submit.prevent="search">
      <el-form-item>
        <el-input v-model.trim="filters.keyword" placeholder="订单号或收货人" clearable @keyup.enter="search" />
      </el-form-item>
      <el-form-item>
        <el-select v-model="filters.status" placeholder="全部状态" clearable>
          <el-option
            v-for="option in ORDER_STATUS_OPTIONS"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="search">查询</el-button>
      </el-form-item>
    </el-form>

    <el-alert v-if="message" :title="message" type="error" :closable="false" class="admin-alert" />

    <el-table :data="orders" class="admin-table" empty-text="暂无订单数据">
      <el-table-column prop="order_no" label="订单号" min-width="220" />
      <el-table-column label="金额" width="120">
        <template #default="{ row }">￥{{ Number(row.total_amount).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="orderTagType(row.status)" effect="plain">
            {{ formatOrderStatus(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="receiver_name" label="收货人" min-width="120" />
      <el-table-column prop="created_at" label="创建时间" min-width="180" />
      <el-table-column label="更新状态" min-width="220" fixed="right">
        <template #default="{ row }">
          <div class="table-actions nowrap-actions">
            <el-select v-model="statusMap[row.order_no]" class="inline-select">
              <el-option
                v-for="option in ORDER_STATUS_OPTIONS"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
            <el-button plain @click="updateStatus(row.order_no)">保存</el-button>
          </div>
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
import { reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import http from "../api/http";
import PaginationBar from "../components/PaginationBar.vue";
import { ORDER_STATUS_OPTIONS, formatOrderStatus } from "../utils/display";

const route = useRoute();
const router = useRouter();
const orders = ref([]);
const message = ref("");
const statusMap = reactive({});
const filters = reactive({
  keyword: route.query.keyword || "",
  status: route.query.status || "",
});
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});

function orderTagType(status) {
  if (status === "paid" || status === "finished") {
    return "success";
  }
  if (status === "pending") {
    return "warning";
  }
  if (status === "failed" || status === "cancelled") {
    return "danger";
  }
  return "info";
}

async function loadOrders() {
  try {
    message.value = "";
    const response = await http.get("/orders/admin/list", {
      params: {
        page: Number(route.query.page || 1),
        pageSize: 10,
        keyword: route.query.keyword || undefined,
        status: route.query.status || undefined,
      },
    });
    orders.value = response.data.list;
    Object.assign(pagination, response.data.pagination);
    orders.value.forEach((item) => {
      statusMap[item.order_no] = item.status;
    });
  } catch (error) {
    message.value = error.message;
  }
}

function search() {
  router.push({
    name: "admin-orders",
    query: { page: 1, keyword: filters.keyword || undefined, status: filters.status || undefined },
  });
}

function changePage(page) {
  router.push({ name: "admin-orders", query: { ...route.query, page } });
}

async function updateStatus(orderNo) {
  try {
    const response = await http.patch(`/orders/admin/${orderNo}/status`, { status: statusMap[orderNo] });
    message.value = "";
    ElMessage.success(response.message);
    await loadOrders();
  } catch (error) {
    message.value = error.message;
    ElMessage.error(error.message);
  }
}

watch(
  () => route.query,
  () => {
    filters.keyword = route.query.keyword || "";
    filters.status = route.query.status || "";
    loadOrders();
  },
  { immediate: true },
);
</script>
