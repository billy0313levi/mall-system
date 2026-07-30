<template>
  <section class="admin-panel">
    <div class="section-head">
      <div>
        <h1>库存管理</h1>
      </div>
      <el-button plain @click="loadStocks">刷新</el-button>
    </div>

    <el-alert v-if="message" :title="message" type="error" :closable="false" class="admin-alert" />

    <el-table :data="stocks" class="admin-table" empty-text="暂无库存数据">
      <el-table-column prop="product_id" label="商品ID" width="100" />
      <el-table-column prop="name" label="商品名称" min-width="220" />
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="row.status === 'on_sale' ? 'success' : 'info'" effect="plain">
            {{ formatProductStatus(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="stock" label="当前库存" width="110" />
      <el-table-column label="调整方式" min-width="160">
        <template #default="{ row }">
          <el-select v-model="adjustments[row.product_id].adjustType">
            <el-option
              v-for="option in STOCK_ADJUST_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="数量" width="150">
        <template #default="{ row }">
          <el-input-number v-model="adjustments[row.product_id].quantity" :min="0" :controls-position="'right'" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button plain @click="submitAdjustment(row.product_id)">保存</el-button>
        </template>
      </el-table-column>
    </el-table>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import http from "../api/http";
import { STOCK_ADJUST_OPTIONS, formatProductStatus } from "../utils/display";

const stocks = ref([]);
const message = ref("");
const adjustments = reactive({});

async function loadStocks() {
  try {
    message.value = "";
    const response = await http.get("/products/admin/stocks");
    stocks.value = response.data;
    stocks.value.forEach((item) => {
      adjustments[item.product_id] = adjustments[item.product_id] || {
        adjustType: "set",
        quantity: item.stock,
      };
    });
  } catch (error) {
    message.value = error.message;
  }
}

async function submitAdjustment(productId) {
  try {
    const payload = adjustments[productId];
    const response = await http.patch(`/products/admin/${productId}/stock`, payload);
    message.value = "";
    ElMessage.success(response.message);
    await loadStocks();
  } catch (error) {
    message.value = error.message;
    ElMessage.error(error.message);
  }
}

onMounted(loadStocks);
</script>
