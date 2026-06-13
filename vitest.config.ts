import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Pure-logic test runner. Tests live in tests/ and exercise the lib/ modules
// (scoring, drama, time, friends, ESPN parsing via golden fixtures, mock LLM).
// Node environment — no jsdom — since nothing under test touches the DOM.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts'],
      exclude: ['lib/cache/dynamo.ts', 'lib/claude/agents/**'],
      reporter: ['text', 'html'],
    },
  },
});
