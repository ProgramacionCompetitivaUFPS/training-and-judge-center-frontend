import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'
import { server } from '../mocks/server'

// Increase RTL's waitFor timeout to handle v8 coverage instrumentation overhead
configure({ asyncUtilTimeout: 10000 })

// jsdom lacks these DOM APIs, which Radix primitives (Select, DropdownMenu) call when they open
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

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
