import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    alias: {
        "@ui": path.resolve(__dirname, "./modules/ui"),
        "@shared": path.resolve(__dirname, "./modules/shared"),
        "@saas": path.resolve(__dirname, "./modules/saas"),
        "@marketing": path.resolve(__dirname, "./modules/marketing"),
        "@analytics": path.resolve(__dirname, "./modules/analytics"),
        "@i18n": path.resolve(__dirname, "./modules/i18n"),
    }
  },
})
