<template>
  <section class="store-page" v-if="order">
    <div class="store-crumb">首页 / 我的订单 / 订单详情</div>
    <div class="store-section-head">
      <div>
        <h1>订单详情</h1>
        <p>订单号：{{ order.order_no }}</p>
      </div>
      <div class="store-action-group">
        <RouterLink class="btn btn-light" to="/orders">返回订单列表</RouterLink>
        <RouterLink v-if="order.status === 'pending'" class="btn btn-primary" :to="`/pay/${order.order_no}`">去支付</RouterLink>
      </div>
    </div>

    <div class="order-detail-grid">
      <div class="order-detail-main">
        <section class="store-section">
          <div class="store-subhead">
            <h3>订单商品</h3>
          </div>
          <div class="checkout-item-list">
            <div v-for="item in order.items" :key="item.id" class="checkout-item-row">
              <div>
                <strong>{{ item.product_name }}</strong>
                <p class="muted-text">数量 {{ item.quantity }}</p>
              </div>
              <div>￥{{ Number(item.product_price).toFixed(2) }}</div>
              <div>￥{{ Number(item.subtotal_amount).toFixed(2) }}</div>
            </div>
          </div>
        </section>

        <section class="store-section">
          <div class="store-subhead">
            <h3>订单跟踪</h3>
          </div>
          <div class="order-log-list">
            <div v-for="log in order.logs" :key="log.id" class="order-log-item">
              <strong>{{ formatOrderLogAction(log.action) }}</strong>
              <span>{{ log.created_at }}</span>
              <p>{{ log.content }}</p>
            </div>
          </div>
        </section>
      </div>

      <aside class="order-detail-side">
        <section class="store-section">
          <div class="summary-kv">
            <span>订单状态</span>
            <span :class="['status-chip', order.status === 'paid' || order.status === 'finished' ? 'status-chip-success' : order.status === 'pending' ? 'status-chip-warn' : order.status === 'failed' || order.status === 'cancelled' ? 'status-chip-danger' : 'status-chip-neutral']">
              {{ formatOrderStatus(order.status) }}
            </span>
          </div>
          <div class="summary-kv">
            <span>订单金额</span>
            <strong class="price-text">￥{{ Number(order.total_amount).toFixed(2) }}</strong>
          </div>
          <div class="summary-kv">
            <span>收货人</span>
            <strong>{{ order.receiver_name }} {{ order.receiver_phone }}</strong>
          </div>
          <div class="summary-kv">
            <span>收货地址</span>
            <strong>{{ order.receiver_address }}</strong>
          </div>
        </section>
      </aside>
    </div>
    <div v-if="message" class="notice">{{ message }}</div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import http from '../api/http';
import { formatOrderLogAction, formatOrderStatus } from '../utils/display';

const route = useRoute();
const order = ref(null);
const message = ref('');

async function loadOrder() {
  try {
    const response = await http.get(`/orders/${route.params.orderNo}`);
    order.value = response.data;
  } catch (error) {
    message.value = error.message;
  }
}

onMounted(loadOrder);
</script>
