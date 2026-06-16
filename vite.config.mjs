// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

function filterKnownBuildWarnings(level, log, defaultHandler) {
  if (
    level === 'warn' &&
    log?.code === 'INVALID_ANNOTATION' &&
    String(log?.id ?? '').includes('@microsoft/signalr')
  ) {
    return
  }

  defaultHandler(level, log)
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vuetify(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    rollupOptions: {
      onLog: filterKnownBuildWarnings
    }
  },
  base: '/' // Changed from './' to '/'
})
