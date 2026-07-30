<template>
  <section class="admin-panel">
    <div class="section-head">
      <div>
        <h1>{{ isEdit ? "编辑商品" : "新增商品" }}</h1>
      </div>
      <RouterLink to="/admin/products">
        <el-button plain>返回列表</el-button>
      </RouterLink>
    </div>

    <el-alert v-if="message" :title="message" type="error" :closable="false" class="admin-alert" />

    <el-form class="form-grid admin-product-form" label-position="top" @submit.prevent="submitForm">
      <el-form-item label="商品分类">
        <el-select v-model="form.categoryId" placeholder="请选择分类">
          <el-option
            v-for="category in categories"
            :key="category.id"
            :label="category.name"
            :value="String(category.id)"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="商品名称">
        <el-input v-model.trim="form.name" placeholder="请输入商品名称" clearable />
      </el-form-item>
      <el-form-item label="副标题">
        <el-input v-model.trim="form.subtitle" placeholder="请输入副标题" clearable />
      </el-form-item>
      <el-form-item label="价格">
        <el-input-number v-model="form.price" :min="0" :step="0.01" :precision="2" :controls-position="'right'" />
      </el-form-item>
      <el-form-item label="库存">
        <el-input-number v-model="form.stock" :min="0" :controls-position="'right'" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="form.status">
          <el-option
            v-for="option in PRODUCT_STATUS_OPTIONS"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item class="full-line" label="商品图片">
        <div class="upload-box admin-upload-box">
          <div class="preview-frame">
            <img class="detail-image" :src="resolveImageUrl(form.coverUrl)" alt="商品图片预览" />
          </div>
          <div class="upload-actions">
            <el-upload class="admin-upload" :show-file-list="false" :http-request="uploadImage" accept="image/*">
              <el-button type="primary" plain :loading="uploading">本地上传图片</el-button>
            </el-upload>
            <div class="field-hint">支持 jpg、png、webp，单张不超过 2MB。</div>
            <div class="page-actions">
              <el-button plain :disabled="uploading" @click="clearImage">清除图片</el-button>
              <span class="muted-text">{{
                uploading ? "上传中..." : uploadMessage || "上传后会自动写入图片地址"
              }}</span>
            </div>
          </div>
        </div>
      </el-form-item>
      <el-form-item class="full-line" label="商品描述">
        <el-input v-model.trim="form.description" type="textarea" :rows="6" placeholder="请输入商品描述" />
      </el-form-item>
      <div class="form-actions full-line">
        <el-button type="primary" :loading="submitting" :disabled="uploading" @click="submitForm">
          {{ submitting ? "提交中..." : uploading ? "图片上传中..." : "保存商品" }}
        </el-button>
      </div>
    </el-form>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import http from "../api/http";
import { PRODUCT_STATUS_OPTIONS, resolveImageUrl } from "../utils/display";
import { ElMessage } from "element-plus";

const route = useRoute();
const router = useRouter();
const isEdit = computed(() => Boolean(route.params.id));
const categories = ref([]);
const submitting = ref(false);
const uploading = ref(false);
const message = ref("");
const uploadMessage = ref("");
const form = reactive({
  categoryId: "",
  name: "",
  subtitle: "",
  description: "",
  price: 0,
  stock: 0,
  coverUrl: "",
  status: "on_sale",
});

async function loadCategories() {
  message.value = "";
  const response = await http.get("/products/admin/categories");
  categories.value = response.data;
}

async function loadProduct() {
  if (!isEdit.value) {
    return;
  }
  try {
    const response = await http.get(`/products/admin/${route.params.id}`);
    const data = response.data;
    form.categoryId = data.category_id;
    form.name = data.name;
    form.subtitle = data.subtitle;
    form.description = data.description;
    form.price = data.price;
    form.stock = data.stock;
    form.coverUrl = data.cover_url;
    form.status = data.status;
  } catch (error) {
    message.value = error.message;
  }
}

function clearImage() {
  form.coverUrl = "";
  uploadMessage.value = "已清除当前图片";
}

async function uploadImage(options) {
  const { file, onSuccess, onError } = options;
  uploading.value = true;
  uploadMessage.value = "";
  message.value = "";

  try {
    if (!file.type.startsWith("image/")) {
      ElMessage.error("请选择图片文件");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    const response = await http.post("/products/admin/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    form.coverUrl = response.data.url;
    uploadMessage.value = response.message;
    message.value = "";
    ElMessage.success(response.message);
    onSuccess?.(response.data);
  } catch (error) {
    message.value = error.message;
    ElMessage.error(error.message);
    onError?.(error);
  } finally {
    uploading.value = false;
  }
}

async function submitForm() {
  submitting.value = true;
  message.value = "";
  try {
    const payload = {
      categoryId: Number(form.categoryId),
      name: form.name,
      subtitle: form.subtitle,
      description: form.description,
      price: Number(form.price),
      stock: Number(form.stock),
      coverUrl: form.coverUrl,
      status: form.status,
    };
    const response = isEdit.value
      ? await http.put(`/products/admin/${route.params.id}`, payload)
      : await http.post("/products/admin", payload);
    message.value = "";
    ElMessage.success(response.message);
    setTimeout(() => router.push("/admin/products"), 600);
  } catch (error) {
    message.value = error.message;
    ElMessage.error(error.message);
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  await loadCategories();
  await loadProduct();
});
</script>
