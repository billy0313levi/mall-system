<template>
  <section class="store-page">
    <div class="store-crumb">首页 / 购物车</div>
    <div class="store-section-head">
      <div>
        <h1>我的购物车</h1>
        <p>共 {{ summary.totalQuantity }} 件商品</p>
      </div>
      <div class="store-action-group">
        <el-button @click="loadCart">刷新购物车</el-button>
        <el-button @click="clearCart">清空购物车</el-button>
      </div>
    </div>

    <div v-if="message" class="notice">{{ message }}</div>

    <div class="cart-layout">
      <div class="cart-list-card">
        <el-empty v-if="items.length === 0" description="购物车为空" />
        <article v-for="item in items" :key="item.productId" class="cart-item-row">
          <div class="cart-item-cover">
            <div class="cart-item-image-surface"></div>
          </div>
          <div class="cart-item-main">
            <h3>{{ item.name }}</h3>
            <p class="muted-text">{{ item.available ? '可正常下单' : '商品暂不可下单' }}</p>
            <div class="product-meta">
              <span>现价 ￥{{ Number(item.currentPrice).toFixed(2) }}</span>
              <span v-if="item.priceChanged">原价 ￥{{ Number(item.price).toFixed(2) }}</span>
            </div>
          </div>
          <div class="cart-item-qty">
            <span>数量</span>
            <el-input-number v-model="item.quantity" :min="1" :max="99" @change="updateItem(item)" />
          </div>
          <div class="cart-item-status">
            <el-tag :type="item.available ? 'success' : 'danger'" effect="light">
              {{ item.available ? '可下单' : '不可下单' }}
            </el-tag>
          </div>
          <div class="cart-item-price">￥{{ (Number(item.currentPrice) * Number(item.quantity)).toFixed(2) }}</div>
          <div class="cart-item-actions">
            <button class="text-button" type="button" @click="removeItem(item.productId)">删除</button>
          </div>
        </article>
      </div>

      <aside class="cart-summary-card">
        <h3>结算信息</h3>
        <div class="summary-kv">
          <span>商品数量</span>
          <strong>{{ summary.totalQuantity }}</strong>
        </div>
        <div class="summary-kv">
          <span>可结算金额</span>
          <strong class="price-text">￥{{ Number(summary.totalAmount || 0).toFixed(2) }}</strong>
        </div>
        <div class="summary-kv">
          <span>不可下单商品</span>
          <strong>{{ summary.invalidCount || 0 }}</strong>
        </div>
        <RouterLink to="/checkout">
          <el-button class="cart-submit-btn" type="primary" :disabled="items.length === 0">去结算</el-button>
        </RouterLink>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import http from '../api/http';

const items = ref([]);
const message = ref('');
const summary = reactive({
  totalQuantity: 0,
  totalAmount: 0,
  invalidCount: 0
});

async function loadCart() {
  try {
    const response = await http.get('/cart');
    items.value = response.data.items;
    Object.assign(summary, response.data.summary);
  } catch (error) {
    message.value = error.message;
  }
}

async function updateItem(item) {
  try {
    const response = await http.put(`/cart/items/${item.productId}`, { quantity: item.quantity });
    message.value = response.message;
    await loadCart();
  } catch (error) {
    message.value = error.message;
  }
}

async function removeItem(productId) {
  try {
    const response = await http.delete(`/cart/items/${productId}`);
    message.value = response.message;
    await loadCart();
  } catch (error) {
    message.value = error.message;
  }
}

async function clearCart() {
  try {
    const response = await http.delete('/cart/clear');
    message.value = response.message;
    await loadCart();
  } catch (error) {
    message.value = error.message;
  }
}

onMounted(loadCart);
</script>
