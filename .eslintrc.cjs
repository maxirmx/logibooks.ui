/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  // Enable ESM support for imports in a CJS file
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2022,
  },
  root: true,
  ignorePatterns: ["doc/**"],
  'extends': [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-prettier/skip-formatting'
  ],
  overrides: [
    {
      // Set Node environment for test files
      files: ['**/*.spec.js', '**/tests/**/*.js'],
      env: {
        node: true
      }
    }
  ]
}
