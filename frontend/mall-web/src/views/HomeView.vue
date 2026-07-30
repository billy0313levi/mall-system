<template>
  <section class="mall-home">
    <div class="mall-home-grid">
      <aside class="home-category-menu">
        <div class="home-category-title">全部商品分类</div>
        <button
          v-for="category in categories"
          :key="category.id"
          class="home-category-link"
          type="button"
          @click="goCategory(category.id)"
        >
          <span>{{ category.name }}</span>
          <small>选购</small>
        </button>
      </aside>

      <div class="home-hero-stack">
        <section class="home-hero-banner">
          <div class="home-hero-copy">
            <span class="home-hero-tag">精选会场</span>
            <h1>日常所需 一站购齐</h1>
            <p>热门数码配件、家用清洁和高频百货集中上新，搜索、下单和支付流程一步完成。</p>
            <div class="hero-actions">
              <RouterLink class="btn btn-primary" to="/products">立即选购</RouterLink>
              <RouterLink class="btn btn-light" to="/orders">查看订单</RouterLink>
            </div>
          </div>
          <div class="home-hero-notes">
            <div class="home-note-box">
              <span>今日推荐</span>
              <strong>{{ products[0]?.name || '热销商品' }}</strong>
            </div>
            <div class="home-note-box">
              <span>活动提示</span>
              <strong>满 99 元包邮</strong>
            </div>
            <div class="home-note-box">
              <span>快捷入口</span>
              <strong>购物车 / 订单 / 地址</strong>
            </div>
          </div>
        </section>

        <section class="home-service-row">
          <div class="service-pill">正品保障</div>
          <div class="service-pill">品类齐全</div>
          <div class="service-pill">快速发货</div>
          <div class="service-pill">价格透明</div>
        </section>
      </div>
    </div>

    <section class="store-section">
      <div class="store-section-head">
        <div>
          <h2>推荐商品</h2>
          <p>近期上架商品</p>
        </div>
        <RouterLink class="store-link-arrow" to="/products">查看全部</RouterLink>
      </div>
      <div class="store-product-grid">
        <article v-for="product in products" :key="product.id" class="store-product-card">
          <RouterLink :to="`/products/${product.id}`" class="store-product-cover">
            <img class="cover-image" :src="resolveImageUrl(product.cover_url)" :alt="product.name" />
          </RouterLink>
          <div class="store-product-info">
            <div class="product-meta">
              <span>{{ product.category_name }}</span>
              <span>库存 {{ product.stock }}</span>
            </div>
            <RouterLink :to="`/products/${product.id}`" class="store-product-title">{{ product.name }}</RouterLink>
            <p class="store-product-subtitle">{{ product.subtitle || product.category_name }}</p>
            <div class="store-product-foot">
              <span class="price-text">￥{{ Number(product.price).toFixed(2) }}</span>
              <RouterLink class="store-link-arrow" :to="`/products/${product.id}`">查看详情</RouterLink>
            </div>
          </div>
        </article>
      </div>
    </section>
    <div v-if="message" class="notice">{{ message }}</div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import http from '../api/http';
import { resolveImageUrl } from '../utils/display';

const router = useRouter();
const categories = ref([]);
const products = ref([]);
const message = ref('');

function goCategory(categoryId) {
  router.push({ name: 'products', query: { categoryId } });
}

async function loadData() {
  try {
    const [categoryResponse, productResponse] = await Promise.all([
      http.get('/products/categories'),
      http.get('/products', { params: { page: 1, pageSize: 8 } })
    ]);
    categories.value = categoryResponse.data;
    products.value = productResponse.data.list;
  } catch (error) {
    message.value = error.message;
  }
}

onMounted(loadData);
</script>
