import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'
import { server } from './server'
import { clearAccessToken, resetSessionExpiredNotified } from '@/lib/tokenStore'

configure({ asyncUtilTimeout: 10000 })

// jsdom lacks these DOM APIs, which Radix primitives (Select, DropdownMenu) and CodeMirror call
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}
Range.prototype.getClientRects ??= () => ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} }) as unknown as DOMRectList
Range.prototype.getBoundingClientRect ??= () => new DOMRect(0, 0, 0, 0)

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
