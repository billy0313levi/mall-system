<template>
  <section class="admin-panel">
    <div class="section-head">
      <div>
        <h1>商品管理</h1>
      </div>
      <RouterLink to="/admin/products/new">
        <el-button type="primary">新增商品</el-button>
      </RouterLink>
    </div>

    <el-form class="toolbar admin-toolbar" :inline="true" @submit.prevent="search">
      <el-form-item>
        <el-input v-model.trim="filters.keyword" placeholder="名称或副标题" clearable @keyup.enter="search" />
      </el-form-item>
      <el-form-item>
        <el-select v-model="filters.categoryId" placeholder="全部分类" clearable>
          <el-option
            v-for="category in categories"
            :key="category.id"
            :label="category.name"
            :value="String(category.id)"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-select v-model="filters.status" placeholder="全部状态" clearable>
          <el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="search">查询</el-button>
      </el-form-item>
    </el-form>

    <el-alert v-if="message" :title="message" type="error" :closable="false" class="admin-alert" />

    <el-table :data="products" class="admin-table" empty-text="暂无商品数据">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="商品名称" min-width="200" />
      <el-table-column prop="category_name" label="分类" min-width="140" />
      <el-table-column label="价格" width="120">
        <template #default="{ row }">￥{{ Number(row.price).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="stock" label="库存" width="100" />
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="row.status === 'on_sale' ? 'success' : 'info'" effect="plain">
            {{ formatProductStatus(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="220" fixed="right">
        <template #default="{ row }">
          <div class="table-actions">
            <RouterLink :to="`/admin/products/${row.id}/edit`">
              <el-button link type="primary">编辑</el-button>
            </RouterLink>
            <el-button link type="warning" @click="toggleStatus(row)">
              {{ row.status === "on_sale" ? "下架" : "上架" }}
            </el-button>
            <el-button link type="danger" @click="removeProduct(row.id)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <PaginationBar
      :page="pagination.page"
      :page-size="pagination.pageSize"
      :total="pagination.total"
      @change="changePage"
    />
  </section>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import http from "../api/http";
import PaginationBar from "../components/PaginationBar.vue";
import { PRODUCT_STATUS_OPTIONS, formatProductStatus } from "../utils/display";

const route = useRoute();
const router = useRouter();
const categories = ref([]);
const products = ref([]);
const message = ref("");
const filters = reactive({
  keyword: route.query.keyword || "",
  categoryId: route.query.categoryId || "",
  status: route.query.status || "",
});
const statusOptions = [...PRODUCT_STATUS_OPTIONS, { value: "deleted", label: "已删除" }];
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});

async function loadCategories() {
  const response = await http.get("/products/admin/categories");
  categories.value = response.data;
}

async function loadProducts() {
  try {
    message.value = "";
    const response = await http.get("/products/admin/list", {
      params: {
        page: Number(route.query.page || 1),
        pageSize: 10,
        keyword: route.query.keyword || undefined,
        categoryId: route.query.categoryId || undefined,
        status: route.query.status || undefined,
      },
    });
    products.value = response.data.list;
    Object.assign(pagination, response.data.pagination);
  } catch (error) {
    message.value = error.message;
  }
}

function search() {
  router.push({
    name: "admin-products",
    query: {
      page: 1,
      keyword: filters.keyword || undefined,
      categoryId: filters.categoryId || undefined,
      status: filters.status || undefined,
    },
  });
}

function changePage(page) {
  router.push({ name: "admin-products", query: { ...route.query, page } });
}

async function toggleStatus(item) {
  try {
    const nextStatus = item.status === "on_sale" ? "off_sale" : "on_sale";
    const response = await http.patch(`/products/admin/${item.id}/status`, { status: nextStatus });
    message.value = "";
    ElMessage.success(response.message);
    await loadProducts();
  } catch (error) {
    message.value = error.message;
    ElMessage.error(error.message);
  }
}

async function removeProduct(productId) {
  try {
    await ElMessageBox.confirm("删除后商品将不再展示，确认继续吗？", "删除商品", {
      type: "warning",
      confirmButtonText: "确认删除",
      cancelButtonText: "取消",
    });
    const response = await http.delete(`/products/admin/${productId}`);
    message.value = "";
    ElMessage.success(response.message);
    await loadProducts();
  } catch (error) {
    if (error === "cancel" || error === "close") {
      return;
    }
    message.value = error.message;
    ElMessage.error(error.message);
  }
}

watch(
  () => route.query,
  () => {
    filters.keyword = route.query.keyword || "";
    filters.categoryId = route.query.categoryId || "";
    filters.status = route.query.status || "";
    loadProducts();
  },
  { immediate: true },
);

onMounted(loadCategories);
</script>
