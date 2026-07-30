<template>
  <section class="store-page" v-if="product">
    <div class="store-crumb">首页 / {{ product.category_name }} / {{ product.name }}</div>
    <div class="product-detail-card">
      <div class="product-detail-gallery">
        <img class="detail-image" :src="resolveImageUrl(product.cover_url)" :alt="product.name" />
      </div>
      <div class="product-detail-summary">
        <div class="product-detail-head">
          <h1>{{ product.name }}</h1>
          <p>{{ product.subtitle || product.category_name }}</p>
        </div>
        <div class="product-price-box">
          <span>到手价</span>
          <strong>￥{{ Number(product.price).toFixed(2) }}</strong>
        </div>
        <div class="product-detail-meta">
          <div>
            <span>分类</span><strong>{{ product.category_name }}</strong>
          </div>
          <div>
            <span>库存</span><strong>{{ product.stock }}</strong>
          </div>
          <div><span>状态</span><strong>销售中</strong></div>
        </div>
        <div class="product-buy-row">
          <label class="buy-qty">
            <span>数量</span>
            <el-input-number v-model="quantity" :min="1" :max="99" />
          </label>
          <div class="store-action-group">
            <el-button type="primary" @click="addToCart">加入购物车</el-button>
            <RouterLink to="/cart">
              <el-button>查看购物车</el-button>
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
    <div class="store-section">
      <div class="store-section-head">
        <div>
          <h2>商品介绍</h2>
          <p>商品基础信息</p>
        </div>
      </div>
      <div class="product-detail-description">
        {{ product.description }}
      </div>
    </div>
    <div v-if="message" class="notice">{{ message }}</div>
  </section>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import http from "../api/http";
import { resolveImageUrl } from "../utils/display";

const route = useRoute();
const product = ref(null);
const quantity = ref(1);
const message = ref("");

async function loadDetail() {
  try {
    const response = await http.get(`/products/${route.params.id}`);
    product.value = response.data;
  } catch (error) {
    message.value = error.message;
  }
}

async function addToCart() {
  try {
    const response = await http.post("/cart/items", {
      productId: Number(route.params.id),
      quantity: quantity.value,
    });
    message.value = response.message;
  } catch (error) {
    message.value = error.message;
  }
}

onMounted(loadDetail);
</script>
