<template>
  <div ref="containerRef" class="echart-panel" :style="{ height }"></div>
</template>

<script setup>
import * as echarts from 'echarts';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
  option: {
    type: Object,
    required: true
  },
  height: {
    type: String,
    default: '320px'
  }
});

const containerRef = ref(null);
let chartInstance = null;
let resizeObserver = null;

function renderChart() {
  if (!containerRef.value) {
    return;
  }
  if (!chartInstance) {
    chartInstance = echarts.init(containerRef.value);
  }
  chartInstance.setOption(props.option, true);
  chartInstance.resize();
}

onMounted(() => {
  renderChart();
  resizeObserver = new ResizeObserver(() => {
    chartInstance?.resize();
  });
  resizeObserver.observe(containerRef.value);
  window.addEventListener('resize', renderChart);
});

watch(
  () => props.option,
  () => {
    renderChart();
  },
  { deep: true }
);

onBeforeUnmount(() => {
  window.removeEventListener('resize', renderChart);
  resizeObserver?.disconnect();
  chartInstance?.dispose();
  chartInstance = null;
});
</script>
