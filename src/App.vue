<script setup>
import { onMounted, ref } from 'vue'
import Convert from './Convert/index.vue'

const route = ref('')
const enterAction = ref({})

onMounted(() => {
  // 在纯浏览器里（npm run dev 直接开）没有 utools 对象，此处静默跳过
  window.utools?.onPluginEnter((action) => {
    route.value = action.code
    enterAction.value = action
  })
  window.utools?.onPluginOut(() => {
    route.value = ''
  })
})
</script>

<template>
  <Convert v-if="route" :enter-action="enterAction" />
</template>
