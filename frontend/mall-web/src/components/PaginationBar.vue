<template>
  <div class="pagination-bar">
    <el-pagination
      background
      layout="total, prev, pager, next"
      :total="total"
      :page-size="pageSize"
      :current-page="page"
      @current-change="$emit('change', $event)"
    />
  </div>
</template>

<script setup>
const props = defineProps({
  page: {
    type: Number,
    default: 1
  },
  pageSize: {
    type: Number,
    default: 10
  },
  total: {
    type: Number,
    default: 0
  }
});

defineEmits(['change']);
</script>
