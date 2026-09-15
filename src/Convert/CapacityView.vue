<script setup>
import { computed } from 'vue'
import { formatCapacity } from '../utils/capacity.js'

const props = defineProps({
  value: { type: null, required: true }, // bigint
})

const emit = defineEmits(['copy'])

const display = computed(() => {
  if (props.value == null || props.value < 0n) return ''
  return formatCapacity(props.value)
})
</script>

<template>
  <section v-if="display" class="capacity">
    <header class="capacity__head">
      <span class="capacity__title">容量换算</span>
    </header>

    <div class="line">
      <span class="line__k">容量</span>
      <span class="line__v">{{ display }}</span>
      <button class="mini" @click="emit('copy', display, '容量')">复制</button>
    </div>
    <div class="line">
      <span class="line__k">字节数</span>
      <span class="line__v">{{ String(props.value) }}</span>
      <button class="mini" @click="emit('copy', String(props.value), '字节数')">复制</button>
    </div>
  </section>
</template>

<style scoped>
.capacity {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--rdx-border);
}

.capacity__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.capacity__title {
  font-size: 12px;
  color: var(--rdx-muted);
}

.line {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 24px;
  font-size: 13px;
}

.line__k {
  width: 64px;
  flex: none;
  font-size: 12px;
  color: var(--rdx-muted);
}

.line__v {
  flex: 1;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-all;
  user-select: text;
}

.mini {
  flex: none;
  border: 1px solid var(--rdx-input);
  border-radius: var(--rdx-radius);
  padding: 1px 8px;
  font-size: 12px;
  line-height: 1.8;
  background: var(--rdx-surface);
  color: var(--rdx-fg);
  cursor: pointer;
}
</style>
