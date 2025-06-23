import { fileURLToPath } from 'node:url'
import { mergeConfig } from 'vite'
import { configDefaults, defineConfig } from 'vitest/config'
import viteConfig from './vite.config.mjs'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      isolate: true,
      exclude: [...configDefaults.exclude, 'e2e/*'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      transformMode: {
        web: [/\.[jt]sx$/]
      },
      server: {
        deps: {
          inline: ['vuetify']
        }
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov', 'json'], // Added lcov format for Codecov
        include: [
          'src/helpers/**/*.js',
          'src/stores/**/*.js', 
          // Add additional source directories as needed:
          'src/services/**/*.js',
          'src/components/**/*.vue',
          'src/views/**/*.vue'
        ],
        exclude: [
          '**/node_modules/**',
          '**/dist/**',
          '**/tests/**',
          '**/*.spec.js'
        ],
        // Optional thresholds if you want to enforce minimum coverage
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70
      }    
    }
  })
)
