<template>
  <section class="admin-panel">
    <div class="section-head">
      <div>
        <h1>分类管理</h1>
      </div>
      <el-button type="primary" @click="openCreateModal">新增分类</el-button>
    </div>

    <el-table :data="categories" class="admin-table" empty-text="暂无分类数据">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="分类名称" min-width="160" />
      <el-table-column label="父级" min-width="140">
        <template #default="{ row }">{{ Number(row.parent_id) === 0 ? '顶级分类' : `上级 #${row.parent_id}` }}</template>
      </el-table-column>
      <el-table-column prop="sort_order" label="排序" width="90" />
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="Number(row.status) === 1 ? 'success' : 'info'" effect="plain">
            {{ formatCategoryStatus(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <div class="table-actions">
            <el-button link type="primary" @click="openEditModal(row)">编辑</el-button>
            <el-button link type="danger" @click="removeCategory(row.id)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>
    <el-alert v-if="message" :title="message" type="error" :closable="false" class="admin-alert" />

    <el-dialog
      v-model="modalVisible"
      :title="form.id ? '编辑分类' : '新增分类'"
      width="460px"
      destroy-on-close
      @closed="resetForm"
    >
      <el-form label-position="top" class="stack-form">
        <el-form-item label="分类名称">
          <el-input v-model.trim="form.name" placeholder="请输入分类名称" clearable />
        </el-form-item>
        <el-form-item label="父级分类ID">
          <el-input-number v-model="form.parentId" :min="0" :controls-position="'right'" />
        </el-form-item>
        <el-form-item label="排序值">
          <el-input-number v-model="form.sortOrder" :min="0" :controls-position="'right'" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status">
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="form-actions">
          <el-button @click="closeModal">取消</el-button>
          <el-button type="primary" @click="submitCategory">{{ form.id ? '保存修改' : '新增分类' }}</el-button>
        </div>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import http from '../api/http';
import { formatCategoryStatus } from '../utils/display';

const categories = ref([]);
const message = ref('');
const modalVisible = ref(false);
const form = reactive({
  id: '',
  name: '',
  parentId: 0,
  sortOrder: 0,
  status: 1
});

function resetForm() {
  form.id = '';
  form.name = '';
  form.parentId = 0;
  form.sortOrder = 0;
  form.status = 1;
}

function closeModal() {
  resetForm();
  modalVisible.value = false;
}

function openCreateModal() {
  resetForm();
  modalVisible.value = true;
}

function openEditModal(category) {
  form.id = category.id;
  form.name = category.name;
  form.parentId = category.parent_id;
  form.sortOrder = category.sort_order;
  form.status = category.status;
  modalVisible.value = true;
}

async function loadCategories() {
  try {
    message.value = '';
    const response = await http.get('/products/admin/categories');
    categories.value = response.data;
  } catch (error) {
    message.value = error.message;
  }
}

async function submitCategory() {
  try {
    const payload = {
      name: form.name,
      parentId: form.parentId,
      sortOrder: form.sortOrder,
      status: form.status
    };
    const response = form.id
      ? await http.put(`/products/admin/categories/${form.id}`, payload)
      : await http.post('/products/admin/categories', payload);
    message.value = '';
    ElMessage.success(response.message);
    closeModal();
    await loadCategories();
  } catch (error) {
    message.value = error.message;
    ElMessage.error(error.message);
  }
}

async function removeCategory(categoryId) {
  try {
    await ElMessageBox.confirm('删除后该分类将不再出现在前台列表中，确认继续吗？', '删除分类', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消'
    });
    const response = await http.delete(`/products/admin/categories/${categoryId}`);
    message.value = '';
    ElMessage.success(response.message);
    await loadCategories();
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return;
    }
    message.value = error.message;
    ElMessage.error(error.message);
  }
}

onMounted(loadCategories);
</script>
