<template>
  <section class="store-page">
    <div class="store-crumb">首页 / 全部商品</div>
    <div class="store-filter-bar">
      <form class="store-filter-form" @submit.prevent="search">
        <el-input v-model="filters.keyword" placeholder="搜索商品名称" clearable />
        <el-select v-model="filters.categoryId" placeholder="全部分类" clearable>
          <el-option value="" label="全部分类" />
          <el-option v-for="category in categories" :key="category.id" :value="category.id" :label="category.name" />
        </el-select>
        <el-select v-model="filters.pageSize" placeholder="每页数量">
          <el-option :value="8" label="每页 8 条" />
          <el-option :value="12" label="每页 12 条" />
          <el-option :value="16" label="每页 16 条" />
        </el-select>
        <el-button type="primary" native-type="submit">筛选商品</el-button>
      </form>
    </div>

    <div class="store-section-head">
      <div>
        <h1>全部商品</h1>
        <p>共 {{ pagination.total }} 件商品</p>
      </div>
      <div class="section-tip">当前第 {{ pagination.page }} 页</div>
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
              <div class="store-action-group">
                <RouterLink :to="`/products/${product.id}`">
                  <el-button>查看</el-button>
                </RouterLink>
                <el-button type="primary" @click="addToCart(product.id)">加入购物车</el-button>
              </div>
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
import { onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import http from '../api/http';
import PaginationBar from '../components/PaginationBar.vue';
import { resolveImageUrl } from '../utils/display';

const route = useRoute();
const router = useRouter();
const categories = ref([]);
const products = ref([]);
const message = ref('');
const filters = reactive({
  page: Number(route.query.page || 1),
  pageSize: Number(route.query.pageSize || 8),
  keyword: route.query.keyword || '',
  categoryId: route.query.categoryId || ''
});
const pagination = reactive({
  page: 1,
  pageSize: 8,
  total: 0
});

async function loadCategories() {
  const response = await http.get('/products/categories');
  categories.value = response.data;
}

async function loadProducts() {
  try {
    const response = await http.get('/products', {
      params: {
        page: filters.page,
        pageSize: filters.pageSize,
        keyword: filters.keyword || undefined,
        categoryId: filters.categoryId || undefined
      }
    });
    products.value = response.data.list;
    Object.assign(pagination, response.data.pagination);
  } catch (error) {
    message.value = error.message;
  }
}

function search() {
  router.push({
    name: 'products',
    query: {
      page: 1,
      pageSize: filters.pageSize,
      keyword: filters.keyword || undefined,
      categoryId: filters.categoryId || undefined
    }
  });
}

function changePage(page) {
  router.push({
    name: 'products',
    query: {
      ...route.query,
      page,
      pageSize: filters.pageSize
    }
  });
}

async function addToCart(productId) {
  try {
    const response = await http.post('/cart/items', { productId, quantity: 1 });
    message.value = response.message;
  } catch (error) {
    message.value = error.message;
  }
}

watch(
  () => route.query,
  async (query) => {
    filters.page = Number(query.page || 1);
    filters.pageSize = Number(query.pageSize || 8);
    filters.keyword = query.keyword || '';
    filters.categoryId = query.categoryId || '';
    await loadProducts();
  },
  { immediate: true }
);

onMounted(loadCategories);
</script>
