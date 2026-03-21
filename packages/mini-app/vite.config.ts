/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/mini-app/',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('@tonconnect')) return 'ton-connect';
          if (id.includes('@ton/ton') || id.includes('@ton/core')) return 'ton-core';
          if (id.includes('react-dom') || id.includes('/react/')) return 'vendor';
        },
      },
    },
    target: 'es2020',
    chunkSizeWarningLimit: 400,
  },
  optimizeDeps: {
    exclude: ['@ton/crypto'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
