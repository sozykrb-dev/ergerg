import { defineConfig } from 'vitest/config';

// the test environment only needs jsdom; styling is irrelevant here
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.tsx'],
    css: false,
  },
});
