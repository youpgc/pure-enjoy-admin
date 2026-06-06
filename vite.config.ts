import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/pure-enjoy-admin/',
  esbuild: {
    keepNames: true,
  },
  build: {
    minify: false, // 禁用压缩
    sourcemap: true, // 生成 source map 方便调试
    rollupOptions: {
      treeshake: false, // 禁用 tree-shaking
    },
  },
})
