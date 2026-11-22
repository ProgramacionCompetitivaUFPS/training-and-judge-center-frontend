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
        // Entry points and composition roots
        'src/main.tsx',
        'src/App.tsx',
        'src/vite-env.d.ts',
        '**/*.d.ts',
        // Development / test infrastructure
        'src/mocks/**',
        'src/test/**',
        'src/integration/support/**',
        '**/*.test.{ts,tsx}',
        // Pure types and re-export barrels (no executable logic)
        'src/types/**',
        'src/**/index.ts',
        // Declarative Blockly toolbox configuration (static data)
        'src/components/features/blockly/toolboxConfig.ts',
        // Pyodide worker: needs a real Worker + WebAssembly runtime that jsdom does not provide
        'src/workers/**',
        // TEMPORARY: removed in Task 5 of the coverage plan, once these hooks have tests
        'src/hooks/useBlocklyPersistence.ts',
        'src/hooks/usePyodide.ts',
      ],
      reporter: ['text', 'html', 'json-summary', 'lcov'],
      thresholds: {
        // Ratchet: functions rises each phase until it reaches 80 (see the coverage plan)
        lines: 80,
        branches: 80,
        functions: 62,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
