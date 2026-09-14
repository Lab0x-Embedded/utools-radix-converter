<script setup>
const props = defineProps({
  label: { type: String, required: true },
  name: { type: String, required: true },
  display: { type: String, required: true },
  raw: { type: String, required: true },
  isSource: { type: Boolean, default: false },
  active: { type: Boolean, default: false },
})

const emit = defineEmits(['copy', 'paste'])
</script>

<template>
  <div
    class="row"
    :class="{ 'row--source': isSource, 'row--active': active }"
    @click="emit('copy', raw, name)"
  >
    <span class="row__label">{{ label }}</span>
    <span class="row__name">{{ name }}</span>
    <span class="row__value">{{ display }}</span>
    <span class="row__actions">
      <button class="btn" @click.stop="emit('copy', raw, name)">复制</button>
      <button class="btn btn--ghost" @click.stop="emit('paste', raw, name)">粘贴</button>
    </span>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid var(--rdx-border);
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}

.row:hover {
  border-color: var(--rdx-accent);
}

.row--active {
  border-color: var(--rdx-accent);
  background: var(--rdx-surface-alt);
}

.row--source .row__label {
  color: var(--rdx-accent);
}

.row__label {
  width: 36px;
  flex: none;
  font-size: 12px;
  font-weight: 600;
  color: var(--rdx-muted);
}

.row__name {
  width: 56px;
  flex: none;
  font-size: 12px;
  color: var(--rdx-muted);
}

.row__value {
  flex: 1;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 14px;
  word-break: break-all;
  user-select: text;
}

.row__actions {
  flex: none;
  display: flex;
  gap: 6px;
}

.btn {
  border: none;
  border-radius: 6px;
  padding: 2px 10px;
  font-size: 12px;
  line-height: 1.8;
  color: #fff;
  background: var(--rdx-accent);
  cursor: pointer;
}

.btn--ghost {
  color: var(--rdx-fg);
  background: var(--rdx-surface-alt);
  border: 1px solid var(--rdx-border);
}
</style>
