<template>
  <section class="page-panel">
    <div class="section-head">
      <div>
        <h1>模拟支付</h1>
        <p>确认支付结果后更新订单状态并生成支付记录。</p>
      </div>
      <RouterLink class="btn btn-light" :to="`/orders/${route.params.orderNo}`">返回订单详情</RouterLink>
    </div>

    <div class="summary-box" v-if="order">
      <div>订单号：{{ order.order_no }}</div>
      <div>当前状态：{{ formatOrderStatus(order.status) }}</div>
      <div>支付金额：￥{{ Number(order.total_amount).toFixed(2) }}</div>
    </div>

    <form class="stack-form" @submit.prevent="submitPayment">
      <label>
        <span>支付结果</span>
        <select v-model="simulateSuccess">
          <option :value="true">成功</option>
          <option :value="false">失败</option>
        </select>
      </label>
      <label v-if="!simulateSuccess">
        <span>失败原因</span>
        <input v-model.trim="failReason" type="text" placeholder="请输入失败原因" />
      </label>
      <div class="form-actions">
        <button class="btn btn-primary" type="submit" :disabled="submitting">{{ submitting ? '提交中...' : '发起支付' }}</button>
        <button class="btn btn-light" type="button" @click="loadData">刷新订单与支付记录</button>
      </div>
    </form>

    <div v-if="message" class="notice">{{ message }}</div>

    <div class="page-panel">
      <h3>支付记录</h3>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>流水号</th>
              <th>状态</th>
              <th>失败原因</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="payment in payments" :key="payment.id">
              <td>{{ payment.transaction_no }}</td>
              <td>{{ formatPaymentStatus(payment.status) }}</td>
              <td>{{ payment.fail_reason || '-' }}</td>
              <td>{{ payment.created_at }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import http from '../api/http';
import { formatOrderStatus, formatPaymentStatus } from '../utils/display';

const route = useRoute();
const order = ref(null);
const payments = ref([]);
const simulateSuccess = ref(true);
const failReason = ref('余额不足');
const submitting = ref(false);
const message = ref('');

async function loadData() {
  try {
    const [orderResponse, paymentResponse] = await Promise.all([
      http.get(`/orders/${route.params.orderNo}`),
      http.get(`/payments/${route.params.orderNo}`)
    ]);
    order.value = orderResponse.data;
    payments.value = paymentResponse.data;
  } catch (error) {
    message.value = error.message;
  }
}

async function submitPayment() {
  submitting.value = true;
  message.value = '';
  try {
    const response = await http.post('/payments/pay', {
      orderNo: route.params.orderNo,
      simulateSuccess: simulateSuccess.value,
      failReason: failReason.value
    });
    message.value = response.message;
    setTimeout(loadData, 800);
  } catch (error) {
    message.value = error.message;
  } finally {
    submitting.value = false;
  }
}

onMounted(loadData);
</script>
