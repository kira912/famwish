import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.spec.ts'],
    environment: 'node'
  },
  resolve: {
    alias: {
      '~': resolve(import.meta.dirname, './app'),
      '@': resolve(import.meta.dirname, './app')
    }
  }
})
