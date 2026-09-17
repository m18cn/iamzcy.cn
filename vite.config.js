import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vite 构建配置
 * base 路径设为当前仓库名，用于 GitHub Pages 子路径部署
 * （部署时若仓库名不同，需要同步修改此处）
 */
export default defineConfig({
  base: '/iamzcy.cn/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0
  }
})
