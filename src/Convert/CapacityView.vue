<script setup>
import { computed } from 'vue'
import { formatCapacity } from '../utils/capacity.js'

const props = defineProps({
  value: { type: null, required: true }, // bigint
})

const display = computed(() => {
  if (props.value == null || props.value < 0n) return ''
  return formatCapacity(props.value)
})

const emit = defineEmits(['copy'])
</script>

<template>
  <section v-if="display" class="capacity">
    <header class="capacity__head">
      <span class="capacity__title">容量换算</span>
    </header>

    <div class="line">
      <span class="line__k">Bytes</span>
      <span class="line__v">{{ String(props.value) }}</span>
      <button class="mini" @click="emit('copy', String(props.value), 'Bytes')">复制</button>
    </div>

    <div class="line">
      <span class="line__k">容量</span>
      <span class="line__v">{{ display }}</span>
      <button class="mini" @click="emit('copy', display, '容量')">复制</button>
    </div>
  </section>
</template>

<style scoped>
.capacity {
  margin-top: 12px;
  border: 1px solid var(--rdx-border);
  border-radius: var(--rdx-radius);
  overflow: hidden;
}

.capacity__head {
  padding: 6px 12px;
  background: var(--rdx-muted);
  border-bottom: 1px solid var(--rdx-border);
}

.capacity__title {
  font-size: 12px;
  font-weight: 500;
  color: var(--rdx-muted-fg);
}

.line {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--rdx-border);
  font-size: 13px;
}

.line:last-child {
  border-bottom: none;
}

.line__k {
  flex: none;
  width: 60px;
  color: var(--rdx-muted);
  font-size: 12px;
}

.line__v {
  flex: 1;
  min-width: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--rdx-fg);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  user-select: text;
  -webkit-user-select: text;
}

.mini {
  flex: none;
  padding: 2px 8px;
  font-size: 11px;
  border: 1px solid var(--rdx-border);
  border-radius: 4px;
  background: transparent;
  color: var(--rdx-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.mini:hover {
  background: var(--rdx-primary);
  color: var(--rdx-primary-fg);
  border-color: var(--rdx-primary);
}
</style>
