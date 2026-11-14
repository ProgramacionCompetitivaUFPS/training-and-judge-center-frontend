import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'
import { server } from '../mocks/server'
import { resetProblemHandlerState } from '../mocks/handlers/problems'

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
  resetProblemHandlerState()
})
afterAll(() => server.close())
