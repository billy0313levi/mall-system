<template>
  <section class="admin-panel">
    <div class="section-head">
      <div>
        <h1>后台首页</h1>
      </div>
      <el-button plain @click="loadData">刷新数据</el-button>
    </div>

    <div class="metric-row">
      <div class="metric-box">
        <span>商品总数</span>
        <strong>{{ metrics.products }}</strong>
      </div>
      <div class="metric-box">
        <span>订单总数</span>
        <strong>{{ metrics.orders }}</strong>
      </div>
      <div class="metric-box">
        <span>用户总数</span>
        <strong>{{ metrics.users }}</strong>
      </div>
      <div class="metric-box">
        <span>库存记录数</span>
        <strong>{{ metrics.stockItems }}</strong>
      </div>
    </div>

    <div class="admin-chart-grid">
      <div class="admin-chart-card">
        <div class="store-subhead compact-head">
          <div>
            <h3>订单状态分布</h3>
          </div>
        </div>
        <EChartPanel :option="orderChartOption" height="320px" />
      </div>
      <div class="admin-chart-card">
        <div class="store-subhead compact-head">
          <div>
            <h3>库存商品 TOP8</h3>
          </div>
        </div>
        <EChartPanel :option="stockChartOption" height="320px" />
      </div>
    </div>
    <el-alert v-if="message" :title="message" type="error" :closable="false" class="admin-alert" />
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import EChartPanel from "../components/EChartPanel.vue";
import http from "../api/http";
import { formatOrderStatus } from "../utils/display";

const metrics = reactive({
  products: 0,
  orders: 0,
  users: 0,
  stockItems: 0,
});
const message = ref("");
const orderChartOption = ref({});
const stockChartOption = ref({});

function buildOrderChart(orders) {
  const labels = ["pending", "paid", "shipped", "finished", "cancelled", "failed"];
  const counts = labels.map((status) => ({
    name: formatOrderStatus(status),
    value: orders.filter((item) => item.status === status).length,
  }));

  orderChartOption.value = {
    color: ["#d84a38", "#e58b3c", "#4b8b7f", "#2f6f5f", "#9a3f2d", "#7a8793"],
    tooltip: {
      trigger: "item",
    },
    legend: {
      bottom: 0,
      icon: "circle",
    },
    series: [
      {
        name: "订单状态",
        type: "pie",
        radius: ["46%", "72%"],
        center: ["50%", "44%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: "#ffffff",
          borderWidth: 2,
        },
        label: {
          formatter: "{b}\n{c}",
        },
        data: counts,
      },
    ],
  };
}

function buildStockChart(stocks) {
  const topStocks = [...stocks].sort((first, second) => Number(second.stock) - Number(first.stock)).slice(0, 8);

  stockChartOption.value = {
    color: ["#315d49"],
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
    },
    grid: {
      left: 88,
      right: 18,
      top: 20,
      bottom: 20,
    },
    xAxis: {
      type: "value",
      axisLine: {
        show: false,
      },
      splitLine: {
        lineStyle: {
          color: "#edf0f2",
        },
      },
    },
    yAxis: {
      type: "category",
      data: topStocks.map((item) => item.name),
      axisTick: {
        show: false,
      },
    },
    series: [
      {
        type: "bar",
        barWidth: 16,
        data: topStocks.map((item) => Number(item.stock)),
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
        },
      },
    ],
  };
}

async function loadData() {
  try {
    message.value = "";
    const [productRes, orderRes, userRes, stockRes] = await Promise.all([
      http.get("/products/admin/list", { params: { page: 1, pageSize: 200 } }),
      http.get("/orders/admin/list", { params: { page: 1, pageSize: 200 } }),
      http.get("/users/admin/list", { params: { page: 1, pageSize: 1 } }),
      http.get("/products/admin/stocks"),
    ]);
    metrics.products = productRes.data.pagination.total;
    metrics.orders = orderRes.data.pagination.total;
    metrics.users = userRes.data.pagination.total;
    metrics.stockItems = stockRes.data.length;
    buildOrderChart(orderRes.data.list || []);
    buildStockChart(stockRes.data || []);
  } catch (error) {
    message.value = error.message;
  }
}

onMounted(loadData);
</script>
