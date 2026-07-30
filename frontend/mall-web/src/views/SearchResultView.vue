<template>
  <section class="store-page">
    <div class="store-crumb">首页 / 搜索结果</div>
    <div class="store-section-head">
      <div>
        <h1>搜索结果</h1>
        <p>关键词“{{ route.query.keyword || '未输入' }}”共找到 {{ pagination.total }} 件商品</p>
      </div>
      <RouterLink class="store-link-arrow" to="/products">查看全部商品</RouterLink>
    </div>

    <div v-if="message" class="notice">{{ message }}</div>

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
import { resolveImageUrl } from '../utils/display';

const route = useRoute();
const router = useRouter();
const products = ref([]);
const message = ref('');
const pagination = reactive({
  page: 1,
  pageSize: 8,
  total: 0
});

async function loadProducts() {
  try {
    const response = await http.get('/products', {
      params: {
        page: Number(route.query.page || 1),
        pageSize: Number(route.query.pageSize || 8),
        keyword: route.query.keyword || ''
      }
    });
    products.value = response.data.list;
    Object.assign(pagination, response.data.pagination);
  } catch (error) {
    message.value = error.message;
  }
}

function changePage(page) {
  router.push({
    name: 'search',
    query: {
      ...route.query,
      page
    }
  });
}

watch(
  () => route.query,
  () => {
    loadProducts();
  },
  { immediate: true }
);
</script>
