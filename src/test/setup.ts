import '@testing-library/jest-dom/vitest'
import { server } from '../mocks/server'

// ResizeObserver no existe en jsdom; Radix UI lo necesita para medir elementos.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
