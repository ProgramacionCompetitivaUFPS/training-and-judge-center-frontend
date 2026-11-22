import { setupServer } from 'msw/node'

// Integration server starts EMPTY on purpose: it does not reuse src/mocks/handlers
// (development handlers). Each flow registers only the handlers it needs.
export const server = setupServer()
