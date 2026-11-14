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
        'src/hooks/**/*.ts',
        'src/pages/**/*.tsx',
      ],
      exclude: [
        'src/hooks/**/*.test.ts',
        // Skipped: Blockly and Pyodide depend on external binaries unavailable in jsdom
        'src/hooks/useBlocklyPersistence.ts',
        'src/hooks/usePyodide.ts',
        // Trivial context readers — a single useContext call, nothing to branch on
        'src/hooks/useContestSession.ts',
        'src/hooks/useToastContext.ts',
      ],
      reporter: ['text', 'html'],
      thresholds: {
        'src/lib/**': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
        'src/hooks/**': {
          lines: 80,
          functions: 80,
        },
        'src/pages/**': {
          lines: 80,
          functions: 80,
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
