import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    // uTools 内置 Chromium 91 + Node.js 14（官方 FAQ），按此目标降级输出，
    // 避免默认 target（Vite 6 已改为 baseline-widely-available）产出较新的语法。
    target: 'chrome91'
  }
})
