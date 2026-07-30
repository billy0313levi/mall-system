<template>
  <section class="store-page">
    <div class="store-crumb">首页 / 我的订单</div>
    <div class="store-section-head">
      <div>
        <h1>我的订单</h1>
      </div>
    </div>

    <form class="store-filter-form order-filter-form" @submit.prevent="search">
      <el-select v-model="filters.status" placeholder="全部状态" clearable>
        <el-option value="" label="全部状态" />
        <el-option v-for="option in ORDER_STATUS_OPTIONS" :key="option.value" :value="option.value" :label="option.label" />
      </el-select>
      <el-button type="primary" native-type="submit">筛选订单</el-button>
    </form>

    <div v-if="message" class="notice">{{ message }}</div>

    <div class="order-card-list">
      <article v-for="order in orders" :key="order.order_no" class="order-card">
        <div class="order-card-head">
          <div>
            <strong>{{ order.order_no }}</strong>
            <span class="muted-text">{{ order.created_at }}</span>
          </div>
          <span :class="['status-chip', order.status === 'paid' || order.status === 'finished' ? 'status-chip-success' : order.status === 'pending' ? 'status-chip-warn' : order.status === 'failed' || order.status === 'cancelled' ? 'status-chip-danger' : 'status-chip-neutral']">
            {{ formatOrderStatus(order.status) }}
          </span>
        </div>
        <div class="order-card-body">
          <div class="summary-kv">
            <span>收货人</span>
            <strong>{{ order.receiver_name }}</strong>
          </div>
          <div class="summary-kv">
            <span>订单金额</span>
            <strong class="price-text">￥{{ Number(order.total_amount).toFixed(2) }}</strong>
          </div>
        </div>
        <div class="order-card-actions">
          <RouterLink :to="`/orders/${order.order_no}`">
            <el-button>查看详情</el-button>
          </RouterLink>
          <RouterLink v-if="order.status === 'pending'" :to="`/pay/${order.order_no}`">
            <el-button type="primary">立即支付</el-button>
          </RouterLink>
          <el-button v-if="order.status === 'pending'" link type="danger" @click="cancelOrder(order.order_no)">取消订单</el-button>
        </div>
      </article>
    </div>

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
import http from '../api/http';
import PaginationBar from '../components/PaginationBar.vue';
import { ORDER_STATUS_OPTIONS, formatOrderStatus } from '../utils/display';

const route = useRoute();
const router = useRouter();
const orders = ref([]);
const message = ref('');
const filters = reactive({
  status: route.query.status || ''
});
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
});

async function loadOrders() {
  try {
    const response = await http.get('/orders', {
      params: {
        page: Number(route.query.page || 1),
        pageSize: Number(route.query.pageSize || 10),
        status: route.query.status || undefined
      }
    });
    orders.value = response.data.list;
    Object.assign(pagination, response.data.pagination);
  } catch (error) {
    message.value = error.message;
  }
}

function search() {
  router.push({ name: 'orders', query: { page: 1, pageSize: 10, status: filters.status || undefined } });
}

function changePage(page) {
  router.push({ name: 'orders', query: { ...route.query, page } });
}

async function cancelOrder(orderNo) {
  try {
    const response = await http.post(`/orders/${orderNo}/cancel`);
    message.value = response.message;
    await loadOrders();
  } catch (error) {
    message.value = error.message;
  }
}

watch(
  () => route.query,
  () => {
    filters.status = route.query.status || '';
    loadOrders();
  },
  { immediate: true }
);
</script>
