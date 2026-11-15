import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { resetProblemHandlerState } from '@/mocks/handlers/problems'
import { ValidationPanel } from './ValidationPanel'

beforeEach(() => {
  setAccessToken('mock-jwt-token-luisadmin')
  resetProblemHandlerState()
})

afterEach(() => {
  clearAccessToken()
})

describe('ValidationPanel', () => {
  it('muestra el encabezado de la tarjeta', () => {
    renderWithProviders(<ValidationPanel slug="two-sum" isPublishing={false} />)
    expect(screen.getByText('Última validación')).toBeInTheDocument()
  })

  it('muestra spinner cuando isPublishing es true (estado running)', () => {
    renderWithProviders(<ValidationPanel slug="two-sum" isPublishing />)
    expect(screen.getByLabelText('Cargando')).toBeInTheDocument()
    expect(screen.getByText(/Validando el problema/)).toBeInTheDocument()
    expect(screen.getByText('Validando')).toBeInTheDocument()
  })

  it('muestra el texto de sin validación previa cuando found es false', async () => {
    renderWithProviders(<ValidationPanel slug="two-sum" isPublishing={false} />)
    await waitFor(() =>
      expect(screen.getByText(/Este problema todavía no se ha validado/)).toBeInTheDocument(),
    )
  })

  it('muestra badge Pasó cuando la validación pasó', async () => {
    server.use(
      http.get('http://localhost:8080/api/problems/p/:slug/validation', () =>
        HttpResponse.json({ found: true, terminal: true, passed: true, status: 'DRAFT', stale: false }),
      ),
    )
    renderWithProviders(<ValidationPanel slug="two-sum" isPublishing={false} />)
    await waitFor(() => expect(screen.getByText('Pasó')).toBeInTheDocument())
    expect(screen.getByText(/La última validación pasó/)).toBeInTheDocument()
  })

  it('muestra badge Falló cuando la validación falló', async () => {
    server.use(
      http.get('http://localhost:8080/api/problems/p/:slug/validation', () =>
        HttpResponse.json({
          found: true, terminal: true, passed: false, status: 'DRAFT',
          compilationErrors: { file: 'sol.cpp', errors: ['error: undeclared'] },
          failedTestCases: null, failedInputs: null, validationLogs: [],
        }),
      ),
    )
    renderWithProviders(<ValidationPanel slug="two-sum" isPublishing={false} />)
    await waitFor(() => expect(screen.getByText('Falló')).toBeInTheDocument())
  })

  it('muestra botón Reintentar cuando hay error de red', async () => {
    server.use(
      http.get('http://localhost:8080/api/problems/p/:slug/validation', () =>
        HttpResponse.json({ error: 'SERVER_ERROR' }, { status: 500 }),
      ),
    )
    renderWithProviders(<ValidationPanel slug="two-sum" isPublishing={false} />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument(),
    )
    // Suppress unhandled promise rejection warning from the QueryClient retry
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })
})
