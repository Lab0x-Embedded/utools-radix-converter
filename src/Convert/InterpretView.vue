<script setup>
import { computed, ref } from 'vue'
import { WIDTHS, byteOrder, interpret } from '../utils/radix.js'

const props = defineProps({
  value: { type: null, required: true },
})

const emit = defineEmits(['copy'])

const width = ref(32)
const info = computed(() => interpret(props.value, width.value))
const order = computed(() => byteOrder(props.value, width.value))
</script>

<template>
  <section class="interp">
    <header class="interp__head">
      <span class="interp__title">按位宽解释</span>
      <span class="interp__widths">
        <button
          v-for="w in WIDTHS"
          :key="w"
          class="chip"
          :class="{ 'chip--on': w === width }"
          @click="width = w"
        >
          {{ w }} 位
        </button>
      </span>
    </header>

    <div class="line">
      <span class="line__k">无符号</span>
      <span class="line__v">{{ info.unsigned }}</span>
      <button class="mini" @click="emit('copy', info.unsigned, '无符号值')">复制</button>
    </div>
    <div class="line">
      <span class="line__k">有符号</span>
      <span class="line__v">{{ info.signed }}</span>
      <button class="mini" @click="emit('copy', info.signed, '有符号值')">复制</button>
    </div>
    <div class="line">
      <span class="line__k">补码 HEX</span>
      <span class="line__v">{{ info.hex }}</span>
    </div>
    <div class="line">
      <span class="line__k">补码 BIN</span>
      <span class="line__v">{{ info.bin }}</span>
    </div>
    <div class="line">
      <span class="line__k">大端字节</span>
      <span class="line__v">{{ order.bigEndian }}</span>
      <button class="mini" @click="emit('copy', order.bigEndian, '大端字节')">复制</button>
    </div>
    <div class="line">
      <span class="line__k">小端字节</span>
      <span class="line__v">{{ order.littleEndian }}</span>
      <button class="mini" @click="emit('copy', order.littleEndian, '小端字节')">复制</button>
    </div>
  </section>
</template>

<style scoped>
.interp {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--rdx-border);
}

.interp__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.interp__title {
  font-size: 12px;
  color: var(--rdx-muted);
}

.interp__widths {
  display: flex;
  gap: 4px;
}

.chip {
  border: 1px solid var(--rdx-border);
  border-radius: 10px;
  padding: 2px 8px;
  font-size: 12px;
  line-height: 1.8;
  background: transparent;
  color: var(--rdx-muted);
  cursor: pointer;
}

.chip--on {
  border-color: var(--rdx-accent);
  background: var(--rdx-accent);
  color: #fff;
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
  border: 1px solid var(--rdx-border);
  border-radius: 6px;
  padding: 1px 8px;
  font-size: 12px;
  line-height: 1.8;
  background: var(--rdx-surface-alt);
  color: var(--rdx-fg);
  cursor: pointer;
}
</style>
