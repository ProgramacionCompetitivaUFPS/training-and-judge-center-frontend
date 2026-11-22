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

describe('ValidationPanel — resultados con detalle', () => {
  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    resetProblemHandlerState()
  })
  afterEach(() => clearAccessToken())

  function serveValidation(body: Record<string, unknown>) {
    server.use(
      http.get('http://localhost:8080/api/problems/p/:slug/validation', () =>
        HttpResponse.json({ found: true, terminal: true, ...body }),
      ),
    )
  }

  it('si pasó y el problema sigue en borrador avisa que ya se puede publicar', async () => {
    serveValidation({ passed: true, status: 'DRAFT', stale: false })
    renderWithProviders(<ValidationPanel slug="two-sum" isPublishing={false} />)

    expect(
      await screen.findByText('La última validación pasó. El problema sigue en borrador: ya puedes publicarlo.'),
    ).toBeInTheDocument()
  })

  it('si pasó pero el problema cambió después avisa que hay que volver a validarlo', async () => {
    serveValidation({ passed: true, status: 'DRAFT', stale: true })
    renderWithProviders(<ValidationPanel slug="two-sum" isPublishing={false} />)

    expect(
      await screen.findByText('La última validación pasó, pero cambiaste el problema después: vuelve a validarlo antes de publicar.'),
    ).toBeInTheDocument()
  })

  it('si pasó y el problema ya está publicado solo confirma que pasó', async () => {
    serveValidation({ passed: true, status: 'PUBLISHED' })
    renderWithProviders(<ValidationPanel slug="two-sum" isPublishing={false} />)

    expect(await screen.findByText('La última validación pasó.')).toBeInTheDocument()
  })

  it('muestra el resumen de casos y soluciones probadas', async () => {
    serveValidation({
      passed: true,
      status: 'PUBLISHED',
      validationSummary: { sampleCases: 2, secretCases: 8, solutionsTested: 3 },
    })
    renderWithProviders(<ValidationPanel slug="two-sum" isPublishing={false} />)

    expect(await screen.findByText('2 caso(s) de ejemplo y 8 secreto(s)')).toBeInTheDocument()
    expect(screen.getByText('3 solución(es) de referencia probada(s)')).toBeInTheDocument()
  })

  it('si falló muestra el aviso y el detalle de los casos fallidos', async () => {
    serveValidation({
      passed: false,
      status: 'DRAFT',
      failedTestCases: [{ case: '01', status: 'WRONG_ANSWER' }],
      validationLogs: [],
    })
    renderWithProviders(<ValidationPanel slug="two-sum" isPublishing={false} />)

    expect(
      await screen.findByText('La última validación falló; el problema no se publicó. Corrige lo que sigue y vuelve a pulsar «Validar».'),
    ).toBeInTheDocument()
    expect(screen.getByText('Casos de prueba fallidos:')).toBeInTheDocument()
    expect(screen.getByText('Falló')).toBeInTheDocument()
  })

  it('un fallo con solo un «internal error» en los logs se presenta como error del sistema', async () => {
    serveValidation({ passed: false, status: 'DRAFT', validationLogs: ['worker: Internal error: out of memory'] })
    renderWithProviders(<ValidationPanel slug="two-sum" isPublishing={false} />)

    expect(await screen.findByText('Error del sistema')).toBeInTheDocument()
    expect(screen.getByText(/La validación no pudo terminar por un error del sistema/)).toBeInTheDocument()
    expect(screen.queryByText(/La última validación falló/)).not.toBeInTheDocument()
  })

  it('un «internal error» junto con errores de compilación sigue siendo un fallo del problema', async () => {
    serveValidation({
      passed: false,
      status: 'DRAFT',
      compilationErrors: { file: 'sol.cpp', errors: ['error: x'] },
      validationLogs: ['Internal error while cleaning up'],
    })
    renderWithProviders(<ValidationPanel slug="two-sum" isPublishing={false} />)

    expect(await screen.findByText('Falló')).toBeInTheDocument()
    expect(screen.queryByText('Error del sistema')).not.toBeInTheDocument()
  })
})
