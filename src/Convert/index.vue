<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { convertAll } from '../utils/radix.js'
import InterpretView from './InterpretView.vue'
import CapacityView from './CapacityView.vue'
import ResultRow from './ResultRow.vue'

const props = defineProps({
  enterAction: { type: Object, required: true },
})

const input = ref('')
const forcedRadix = ref(0) // 0 = 自动识别
const activeIndex = ref(0) // 默认高亮「输入所属的进制行」，见 syncActiveRow
const toast = ref('')
const rootRef = ref(null)

let toastTimer = null

const result = computed(() => convertAll(input.value, forcedRadix.value || undefined))

/** 从匹配指令进入时，用匹配到的内容预填输入框 */
watch(
  () => props.enterAction,
  (action) => {
    if (!action) return
    if (action.type === 'regex' || action.type === 'over') {
      if (action.payload) input.value = String(action.payload)
    }
  },
  { immediate: true, deep: true }
)

/** 输入变化后，高亮回到当前输入所属的进制行（如输入 0xffff → 高亮 HEX） */
function syncActiveRow() {
  const r = result.value
  if (!r.ok) return
  const index = r.rows.findIndex((row) => row.isSource)
  if (index >= 0) activeIndex.value = index
}

/** 让 uTools 主窗口高度跟随内容（不用 ResizeObserver：显式同步更可预测） */
async function syncHeight() {
  await nextTick()
  const height = Math.ceil(rootRef.value?.getBoundingClientRect().height || 0)
  if (!height) return
  window.utools?.setExpendHeight(Math.max(140, Math.min(height, 620)))
}

function showToast(message) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1400)
}

function handleCopy(raw, name) {
  window.utools?.copyText(raw)
  showToast(`已复制${name}：${raw.length > 42 ? raw.slice(0, 42) + '…' : raw}`)
}

function handlePaste(raw) {
  // 隐藏主窗口并把内容粘贴到上一个活动窗口（IDE / 编辑器）
  window.utools?.hideMainWindowPasteText(raw)
}

function onKeydown(event) {
  if (!result.value.ok) return
  const rows = result.value.rows
  if (event.key === 'ArrowDown') {
    activeIndex.value = (activeIndex.value + 1) % rows.length
    event.preventDefault()
  } else if (event.key === 'ArrowUp') {
    activeIndex.value = (activeIndex.value - 1 + rows.length) % rows.length
    event.preventDefault()
  } else if (event.key === 'Enter') {
    const row = rows[activeIndex.value]
    if (event.metaKey || event.ctrlKey) handlePaste(row.raw)
    else handleCopy(row.raw, row.name)
    event.preventDefault()
  }
}

watch(result, () => {
  syncActiveRow()
  syncHeight()
})
watch(toast, syncHeight)

onMounted(syncHeight)
onUnmounted(() => clearTimeout(toastTimer))
</script>

<template>
  <div ref="rootRef" class="convert">
    <div class="convert__head">
      <input
        v-model="input"
        class="input"
        placeholder="输入数值，如 0x7FFFFFFF / 0b1010 / 255"
        spellcheck="false"
        @keydown="onKeydown"
      />
      <select v-model.number="forcedRadix" class="select">
        <option :value="0">自动识别</option>
        <option :value="16">按 16 进制</option>
        <option :value="10">按 10 进制</option>
        <option :value="2">按 2 进制</option>
        <option :value="8">按 8 进制</option>
      </select>
    </div>

    <p v-if="result.ok" class="convert__hint">
      <span class="tag">按 {{ result.radix }} 进制解析</span>
      <span class="convert__tip">点击行复制 · ↑↓ 选行 · Enter 复制 · ⌘/Ctrl+Enter 粘贴回原窗口</span>
    </p>
    <p v-else-if="input.trim()" class="convert__error">{{ result.message }}</p>
    <p v-else class="convert__empty">输入数值开始转换，支持 0x / 0b / 0o 前缀</p>

    <div v-if="result.ok" class="convert__rows">
      <ResultRow
        v-for="(row, index) in result.rows"
        :key="row.radix"
        :label="row.label"
        :name="row.name"
        :display="row.display"
        :raw="row.raw"
        :is-source="row.isSource"
        :active="index === activeIndex"
        @copy="handleCopy"
        @paste="handlePaste"
      />
    </div>

    <CapacityView v-if="result.ok && result.value >= 0n" :value="result.value" @copy="handleCopy" />

    <InterpretView v-if="result.ok" :value="result.value" @copy="handleCopy" />

    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<style scoped>
.convert {
  padding: 14px 16px 16px;
  box-sizing: border-box;
  color: var(--rdx-fg);
}

.convert__head {
  display: flex;
  gap: 8px;
}

.input {
  flex: 1;
  min-width: 0;
  height: 36px;
  padding: 0 10px;
  box-sizing: border-box;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 14px;
  color: var(--rdx-fg);
  background-color: transparent;
  border: 1px solid var(--rdx-input);
  border-radius: var(--rdx-radius);
  outline: none;
}

.input:focus {
  border-color: var(--rdx-ring);
  box-shadow: 0 0 0 1px var(--rdx-ring);
}

/* 去掉系统箭头，改用自绘 chevron：距右边缘 8px，右侧预留 28px 内边距 */
.select {
  flex: none;
  min-width: 104px;
  height: 36px;
  padding: 0 28px 0 10px;
  appearance: none;
  -webkit-appearance: none;
  font-size: 13px;
  color: var(--rdx-fg);
  background-color: transparent;
  background-image: var(--rdx-chevron);
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 14px 14px;
  border: 1px solid var(--rdx-input);
  border-radius: var(--rdx-radius);
  outline: none;
}

.select:focus {
  border-color: var(--rdx-ring);
  box-shadow: 0 0 0 1px var(--rdx-ring);
}

.convert__hint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 0;
  font-size: 12px;
  color: var(--rdx-muted);
}

.convert__tip {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.tag {
  flex: none;
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--rdx-radius);
  background: var(--rdx-primary);
  color: var(--rdx-primary-fg);
  font-size: 12px;
}

.convert__error {
  margin: 10px 0;
  font-size: 13px;
  color: var(--rdx-error);
}

.convert__empty {
  margin: 10px 0;
  font-size: 12px;
  color: var(--rdx-muted);
}

.convert__rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  max-width: 90%;
  padding: 6px 14px;
  border-radius: var(--rdx-radius);
  background: var(--rdx-primary);
  color: var(--rdx-primary-fg);
  font-size: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
  pointer-events: none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
