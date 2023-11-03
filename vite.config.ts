import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: 'ES2015',
    sourcemap: true,
    lib: {
      entry: './src/mod.ts',
      name: 'profile-chart',
      fileName: 'profile-chart',
      formats: ['umd', 'es']
    }
  },
  plugins: [vue(), dts({ outDir: './dist/types' })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
