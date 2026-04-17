import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  build: {
    outDir: 'dist-electron',
    emptyOutDir: false,
    lib: {
      entry: {
        main: path.resolve(__dirname, 'electron/main.ts'),
        preload: path.resolve(__dirname, 'electron/preload.ts')
      },
      formats: ['es']
    },
    rollupOptions: {
      external: ['electron', 'node:path', 'node:fs', 'node:fs/promises', 'node:url']
    }
  }
})
