import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.js',
        '**/vue.esm-browser.js',
        '**/vuetify.esm.js'
      ]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './http/js'),
      '@utils': resolve(__dirname, './http/js/utils'),
      '@services': resolve(__dirname, './http/js/services'),
      '@repositories': resolve(__dirname, './http/js/repositories'),
      '@composables': resolve(__dirname, './http/js/composables'),
      '@components': resolve(__dirname, './http/js/components')
    }
  }
});

