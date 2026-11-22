import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'
import { server } from './server'
import { clearAccessToken, resetSessionExpiredNotified } from '@/lib/tokenStore'

configure({ asyncUtilTimeout: 4000 })

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
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  clearAccessToken()
  resetSessionExpiredNotified()
})
afterEach(() => {
  server.resetHandlers()
})
afterAll(() => server.close())
