import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    extends: './vitest.config.ts',
    test: {
      name: 'unit',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      exclude: ['src/integration/**', 'node_modules/**'],
    },
  },
  {
    extends: './vitest.config.ts',
    test: {
      name: 'integration',
      include: ['src/integration/**/*.integration.test.{ts,tsx}'],
      setupFiles: ['./src/integration/support/setup.ts'],
    },
  },
])
