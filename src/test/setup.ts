import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'
import { server } from '../mocks/server'

// Increase RTL's waitFor timeout to handle v8 coverage instrumentation overhead
configure({ asyncUtilTimeout: 4000 })

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
})
afterAll(() => server.close())
