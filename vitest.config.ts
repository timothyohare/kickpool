import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Two test projects, one runner:
//   • unit       — pure lib/ logic, fast Node env          (tests/**/*.test.ts)
//   • components — React components in jsdom + RTL          (tests/components/**/*.test.tsx)
// The async app/*/page.tsx pages are covered by Playwright E2E (see docs/plans/05),
// since Vitest can't render async Server Components.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/**/*.test.ts'],
          exclude: ['tests/components/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'components',
          environment: 'jsdom',
          include: ['tests/components/**/*.test.tsx'],
          setupFiles: ['tests/components/setup.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts', 'components/**/*.tsx'],
      exclude: ['lib/cache/dynamo.ts', 'lib/claude/agents/**'],
      reporter: ['text', 'html'],
    },
  },
});
