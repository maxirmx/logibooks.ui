// eslint.config.js
import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';

export default [
  // Global configuration for all files
  {
    ignores: [
      'doc/**',
        'logs',
        '*.log',
        'npm-debug.log*',
        'yarn-debug.log*',
        'yarn-error.log*',
        'pnpm-debug.log*',
        'lerna-debug.log*',
        'node_modules/**',
        '.DS_Store',
        '__MACOSX',
        'dist/**',        
        'dist-ssr/**',    
        'coverage/**',    
        '*.local',
        '.idea',
        '*.suo',
        '*.ntvs*',
        '*.njsproj',
        '*.sln',
        '*.sw?',
        '.env'
    ],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2022,
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        URLSearchParams: 'readonly',
        URL: 'readonly',
      }
    },
  },
  // Base JavaScript configuration
  js.configs.recommended,
  // Vue configuration
  {
    files: ['**/*.vue'],
    plugins: {
      vue: pluginVue,
    },
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        },
        parser: {
          js: 'espree',
          ts: null,
          '<template>': null
        }
      },
    },
    rules: {
      ...pluginVue.configs.base.rules,
      ...pluginVue.configs['vue3-essential'].rules,
      'vue/comment-directive': 'off', 
    },
  },
  // Overrides for test files
  {
    files: ['**/*.spec.js', '**/tests/**/*.js'],
    languageOptions: {
      globals: {
        // Node.js global variables
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        global: 'readonly',
      }
    },
  },
  // Overrides for Node.js files
  {
    files: ['.eslintrc.cjs', 'vite.config.mjs', 'vitest.config.mjs'],
    languageOptions: {
      globals: {
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      }
    },
  },
];
