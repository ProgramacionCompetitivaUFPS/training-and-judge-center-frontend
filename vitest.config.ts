import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // Not production code
        'src/mocks/**',
        'src/test/**',
        // Test files themselves
        '**/*.test.{ts,tsx}',
        // Pure TypeScript type definitions — no executable statements
        'src/types/**',
        // Web worker — requires a separate worker test environment
        'src/workers/**',
        // Skipped: Blockly and Pyodide depend on external binaries unavailable in jsdom
        'src/hooks/useBlocklyPersistence.ts',
        'src/hooks/usePyodide.ts',
      ],
      reporter: ['text', 'html'],
      thresholds: {
        lines: 60,
        branches: 50,
        functions: 50,
        statements: 60,
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
