const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**', 'coverage/**', '.expo/**', 'playwright-report/**', 'test-results/**', 'node_modules/**'],
  },
]);
