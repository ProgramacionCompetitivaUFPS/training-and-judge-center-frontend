import '@testing-library/jest-dom/vitest'
import { server } from '../mocks/server'
import { resetProblemHandlerState } from '../mocks/handlers/problems'

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetProblemHandlerState()
})
afterAll(() => server.close())
