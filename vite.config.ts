import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/pure-enjoy-admin/',
  server: {
    port: 8080, // 管理后台固定端口（2026-10-09 定版）
    strictPort: true, // 被占用时报错退出，不漂移到 8081
    host: true, // 监听局域网，便于其他设备访问
  },
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
