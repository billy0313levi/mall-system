<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-mask" @click.self="close">
      <div class="modal-panel" :class="sizeClass">
        <div class="modal-head">
          <div>
            <h3>{{ title }}</h3>
            <p v-if="description" class="muted-text">{{ description }}</p>
          </div>
          <button class="modal-close" type="button" @click="close">关闭</button>
        </div>
        <div class="modal-body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'medium'
  }
});

const emit = defineEmits(['update:modelValue']);

const sizeClass = computed(() => `modal-${props.size}`);

function close() {
  emit('update:modelValue', false);
}

watch(
  () => props.modelValue,
  (visible) => {
    document.body.style.overflow = visible ? 'hidden' : '';
  }
);

onBeforeUnmount(() => {
  document.body.style.overflow = '';
});
</script>
