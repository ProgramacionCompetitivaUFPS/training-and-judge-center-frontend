import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/utils.ts',
        'src/lib/schemas/user.ts',
        'src/mocks/data.ts',
      ],
      reporter: ['text', 'html'],
      thresholds: {
        // Only enforce on production logic — mock builders in data.ts are infrastructure,
        // not all of them are exercised by unit tests in this PR.
        'src/lib/**': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
