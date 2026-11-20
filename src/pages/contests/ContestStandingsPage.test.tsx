import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser, mockContests, mockGroupDetails } from '@/mocks/data'
import { ContestStandingsPage } from './ContestStandingsPage'

vi.mock('@/hooks/useContestSession', () => ({
  useContestSession: () => ({ contest: null }),
}))

const mockToast = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: mockToast }),
}))

const authState = vi.hoisted(() => ({ role: 'ADMIN' as 'ADMIN' | 'CONTESTANT' }))

const mockLogout = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { ...mockCurrentUser, role: authState.role },
    isLoading: false,
    isAuthenticated: true,
    hasRole: () => true,
    lastNickname: mockCurrentUser.nickname,
    logout: mockLogout,
  }),
}))

function renderPage(groupId = 'group-1', contestId = 'contest-2') {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/groups/${groupId}/contests/${contestId}/standings`]}>
        <Routes>
          <Route path="/groups/:groupId/contests/:id/standings" element={<ContestStandingsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ContestStandingsPage', () => {
  beforeEach(() => {
    authState.role = 'ADMIN'
    mockToast.mockClear()
    mockLogout.mockClear()
    setAccessToken('mock-jwt-token-luisadmin')
  })
  afterEach(() => clearAccessToken())

  it('renders standings table with team names', async () => {
    renderPage()
    expect(await screen.findByText('Competitive Coders')).toBeInTheDocument()
  })

  it('gives the country, city and institution filters an accessible name', async () => {
    renderPage()
    await screen.findByText('Competitive Coders')
    for (const name of ['Filtrar por país', 'Filtrar por ciudad', 'Filtrar por institución']) {
      expect(screen.getByRole('combobox', { name })).toBeInTheDocument()
    }
  })

  it('shows empty state when no standings', async () => {
    server.use(
      http.get('http://localhost:8080/api/groups/:groupId/contests/:contestId/standings', () =>
        HttpResponse.json({
          contest: { id: 'contest-2', name: 'Práctica Grafos', status: 'ACTIVE', frozenAt: null },
          problems: [],
          standings: [],
          pagination: { page: 1, limit: 50, total: 0, totalPages: 1 },
        }),
      ),
    )
    renderPage()
    await screen.findByText('Todavía no hay posiciones para mostrar.')
    expect(screen.queryByText('Competitive Coders')).not.toBeInTheDocument()
  })

  it('muestra el encabezado con globos de color y la letra de cada problema', async () => {
    renderPage()

    await screen.findByText('Competitive Coders')

    expect(screen.getByRole('columnheader', { name: 'A' })).toBeInTheDocument()
    expect(screen.getAllByTestId('balloon-icon-body')[0]).toHaveAttribute('fill', '#e11d48')
  })

  it('muestra el pie con los aceptados e intentos de cada problema', async () => {
    renderPage()

    await screen.findByText('Competitive Coders')

    expect(screen.getByText('Aceptados')).toBeInTheDocument()
    expect(screen.getByText('Intentos')).toBeInTheDocument()
  })

  it('se ve igual con un backend sin color ni contadores: globo blanco y sin pie', async () => {
    // Arrange
    server.use(
      http.get('http://localhost:8080/api/groups/:groupId/contests/:contestId/standings', () =>
        HttpResponse.json({
          contest: { id: 'contest-2', name: 'Práctica Grafos', status: 'ACTIVE', frozenAt: null },
          problems: [{ position: 1, slug: 'two-sum', title: 'Two Sum' }],
          standings: [
            {
              rank: 1,
              participant: { id: 'team-1', type: 'TEAM', displayName: 'Competitive Coders' },
              problemsSolved: 1,
              totalPenalty: 20,
              problems: [{ position: 1, status: 'ACCEPTED', attempts: 1, time: 20, penalty: 0 }],
            },
          ],
          pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false },
        }),
      ),
    )

    // Act
    renderPage()
    await screen.findByText('Competitive Coders')

    // Assert
    expect(screen.getByTestId('balloon-icon-body')).toHaveAttribute('fill', '#ffffff')
    expect(screen.queryByText('Aceptados')).not.toBeInTheDocument()
  })
})

const STANDINGS_URL = 'http://localhost:8080/api/groups/:groupId/contests/:contestId/standings'

function lastRequest(requests: URLSearchParams[]) {
  return requests[requests.length - 1]
}

function recordStandingsRequests() {
  const requests: URLSearchParams[] = []
  server.use(
    http.get(STANDINGS_URL, ({ request }) => {
      requests.push(new URL(request.url).searchParams)
    }),
  )
  return requests
}

describe('ContestStandingsPage con fases', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    authState.role = 'ADMIN'
    mockToast.mockClear()
    setAccessToken('mock-jwt-token-luisadmin')
  })
  afterEach(() => clearAccessToken())

  it('muestra el selector de fase y la franja de post-competencia en una competencia finalizada con post', async () => {
    renderPage('group-1', 'contest-8')

    expect(await screen.findByRole('radiogroup', { name: 'Fase' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Todas' })).toHaveAttribute('aria-checked', 'true')
    expect(await screen.findByText('Competitive Coders')).toBeInTheDocument()
    expect(screen.getByText('* lauramendez')).toBeInTheDocument()
    expect(screen.getAllByRole('row', { name: 'Post-competencia' })).toHaveLength(1)
  })

  it('filtra las filas al cambiar entre Competencia, Post-competencia y Todas', async () => {
    renderPage('group-1', 'contest-8')
    await screen.findByRole('radiogroup', { name: 'Fase' })

    await user.click(screen.getByRole('radio', { name: 'Competencia' }))
    expect(await screen.findByText('Competitive Coders')).toBeInTheDocument()
    expect(screen.queryByText('* lauramendez')).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Post-competencia' }))
    expect(await screen.findByText('* lauramendez')).toBeInTheDocument()
    expect(screen.queryByText('Competitive Coders')).not.toBeInTheDocument()
  })

  it('no muestra el selector de fase en una competencia activa aunque tenga post habilitada', async () => {
    renderPage('group-1', 'contest-2')

    await screen.findByText('Competitive Coders')

    expect(screen.queryByRole('radiogroup', { name: 'Fase' })).not.toBeInTheDocument()
  })

  it('oculta el selector y las filas de post cuando la post-competencia está deshabilitada', async () => {
    // Arrange
    server.use(
      http.get('http://localhost:8080/api/groups/:groupId/contests/:contestId', () =>
        HttpResponse.json({ ...mockContests.find((c) => c.id === 'contest-8'), enablePostContest: false }),
      ),
    )

    // Act
    renderPage('group-1', 'contest-8')
    await screen.findByText('Competitive Coders')

    // Assert
    expect(screen.queryByRole('radiogroup', { name: 'Fase' })).not.toBeInTheDocument()
    expect(screen.queryByText('* lauramendez')).not.toBeInTheDocument()
  })

  it('pide la fase all en una competencia finalizada con post', async () => {
    const requests = recordStandingsRequests()
    renderPage('group-1', 'contest-8')

    await screen.findByText('Competitive Coders')

    expect(requests[0].get('phase')).toBe('all')
  })

  it('pide la fase competition explícita en una competencia activa', async () => {
    const requests = recordStandingsRequests()
    renderPage('group-1', 'contest-2')

    await screen.findByText('Competitive Coders')

    expect(requests[0].get('phase')).toBe('competition')
  })

  it('muestra en el pie los contadores oficiales y los de post-competencia en la fase Todas', async () => {
    // Arrange
    renderPage('group-1', 'contest-8')

    // Act
    const acceptedRow = (await screen.findByText('Aceptados')).closest('tr')!
    const triedRow = screen.getByText('Intentos').closest('tr')!

    // Assert
    const counters = (row: HTMLElement) => within(row).getAllByRole('cell').slice(4).map((cell) => cell.textContent)
    expect(counters(acceptedRow)).toEqual(['5 (+1)', '3 (+1)', '3 (+1)'])
    expect(counters(triedRow)).toEqual(['5 (+2)', '4 (+1)', '5 (+1)'])
  })

  it('calcula el pie sobre las filas de post al ver solo la post-competencia', async () => {
    // Arrange
    renderPage('group-1', 'contest-8')
    await screen.findByRole('radiogroup', { name: 'Fase' })

    // Act
    await user.click(screen.getByRole('radio', { name: 'Post-competencia' }))
    const acceptedRow = (await screen.findByText('Aceptados (post-competencia)')).closest('tr')!
    const triedRow = screen.getByText('Intentos (post-competencia)').closest('tr')!

    // Assert
    const counters = (row: HTMLElement) => within(row).getAllByRole('cell').slice(4).map((cell) => cell.textContent)
    expect(counters(acceptedRow)).toEqual(['1', '1', '1'])
    expect(counters(triedRow)).toEqual(['2', '1', '1'])
  })

  it('vuelve a la página 1 al cambiar de fase estando en la página 2', async () => {
    // Arrange
    const requests: URLSearchParams[] = []
    server.use(
      http.get(STANDINGS_URL, ({ request }) => {
        requests.push(new URL(request.url).searchParams)
        return HttpResponse.json({
          contest: {
            id: 'contest-8',
            name: 'Reto Clásicos con Post-competencia',
            status: 'FINISHED',
            startTime: '2026-01-01T00:00:00Z',
            endTime: '2026-01-01T03:00:00Z',
            penalty: 20,
            freezeMinutes: null,
            isFrozen: false,
            frozenAt: null,
          },
          problems: [{ position: 1, slug: 'two-sum', title: 'Two Sum' }],
          standings: [
            {
              rank: 1,
              participant: { id: 'team-1', type: 'TEAM', displayName: 'Competitive Coders' },
              problemsSolved: 1,
              totalPenalty: 20,
              problems: [{ position: 1, status: 'ACCEPTED', attempts: 1, time: 20, penalty: 0 }],
            },
          ],
          pagination: { page: 1, limit: 50, total: 120, totalPages: 3, hasNextPage: true, hasPrevPage: false },
          filters: { country: null, city: null, institution: null, filteredTotal: 120 },
        })
      }),
    )
    renderPage('group-1', 'contest-8')
    await screen.findByText('Competitive Coders')

    // Act
    await user.click(screen.getByRole('button', { name: 'Ir a la página siguiente' }))
    await waitFor(() => expect(lastRequest(requests)?.get('page')).toBe('2'))
    await user.click(screen.getByRole('radio', { name: 'Competencia' }))

    // Assert
    await waitFor(() => expect(lastRequest(requests)?.get('page')).toBe('1'))
    expect(lastRequest(requests)?.get('phase')).toBe('competition')
  })
})

describe('ContestStandingsPage con competencia congelada', () => {
  beforeEach(() => {
    authState.role = 'ADMIN'
    mockToast.mockClear()
    mockLogout.mockClear()
    setAccessToken('mock-jwt-token-luisadmin')
  })
  afterEach(() => clearAccessToken())

  it('muestra el aviso de congelado con la explicación de las celdas pendientes', async () => {
    renderPage('group-1', 'contest-6')

    expect(
      await screen.findByText(
        'La tabla de posiciones está congelada. Los envíos posteriores al congelamiento se muestran con un ? y la cantidad de envíos debajo, y se revelarán cuando se publiquen los resultados.',
      ),
    ).toBeInTheDocument()
  })

  it('muestra las celdas pendientes con la cantidad de envíos ocultos', async () => {
    renderPage('group-1', 'contest-6')

    expect(await screen.findByText('2 envíos sin revelar')).toBeInTheDocument()
    expect(screen.getByText('1 envío sin revelar')).toBeInTheDocument()
    expect(screen.getByText('3 envíos sin revelar')).toBeInTheDocument()
  })

  it('no cuenta lo congelado en el pie de contadores', async () => {
    // Arrange
    renderPage('group-1', 'contest-6')

    // Act
    const acceptedRow = (await screen.findByText('Aceptados')).closest('tr')!
    const triedRow = screen.getByText('Intentos').closest('tr')!

    // Assert
    const counters = (row: HTMLElement) => within(row).getAllByRole('cell').slice(4).map((cell) => cell.textContent)
    expect(counters(acceptedRow)).toEqual(['3', '0'])
    expect(counters(triedRow)).toEqual(['3', '1'])
  })

  it('no muestra el aviso de congelado en una competencia sin freeze', async () => {
    renderPage('group-1', 'contest-2')

    await screen.findByText('Competitive Coders')
    expect(screen.queryByText(/está congelada/)).not.toBeInTheDocument()
  })
})

describe('ContestStandingsPage con tiempo real', () => {
  const user = userEvent.setup()
  const toggleName = { name: 'Ver resultados reales' }

  beforeEach(() => {
    authState.role = 'ADMIN'
    mockToast.mockClear()
    setAccessToken('mock-jwt-token-luisadmin')
  })
  afterEach(() => clearAccessToken())

  it('muestra el botón de tiempo real apagado y el aviso de congelado con la tabla congelada', async () => {
    renderPage('group-1', 'contest-6')

    expect(await screen.findByRole('button', toggleName)).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('status')).toHaveTextContent('La tabla de posiciones está congelada.')
    expect(screen.getByText('2 envíos sin revelar')).toBeInTheDocument()
    expect(screen.queryByText('Resultados reales')).not.toBeInTheDocument()
  })

  it('muestra la vista real al pulsar el botón: marca, aviso oscuro y filas reveladas', async () => {
    renderPage('group-1', 'contest-6')
    await user.click(await screen.findByRole('button', toggleName))

    expect(await screen.findByText('Resultados reales')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Estás viendo los resultados reales.')
    expect(screen.queryByText('2 envíos sin revelar')).not.toBeInTheDocument()
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Competitive Coders')
  })

  it('muestra en el pie los contadores reales al ver los resultados reales', async () => {
    // Arrange
    renderPage('group-1', 'contest-6')
    await user.click(await screen.findByRole('button', toggleName))
    await screen.findByText('Resultados reales')

    // Act
    const acceptedRow = screen.getByText('Aceptados').closest('tr')!
    const triedRow = screen.getByText('Intentos').closest('tr')!

    // Assert
    const counters = (row: HTMLElement) => within(row).getAllByRole('cell').slice(4).map((cell) => cell.textContent)
    expect(counters(acceptedRow)).toEqual(['4', '2'])
    expect(counters(triedRow)).toEqual(['4', '2'])
  })

  it('marca el botón como pulsado y muestra el tooltip para volver a participantes', async () => {
    renderPage('group-1', 'contest-6')
    await user.click(await screen.findByRole('button', toggleName))
    await screen.findByText('Resultados reales')

    await user.unhover(screen.getByRole('button', toggleName))
    await user.hover(screen.getByRole('button', toggleName))

    expect(screen.getByRole('button', toggleName)).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Volver a la vista de participantes')
  })

  it('vuelve a la vista congelada al pulsar de nuevo el botón', async () => {
    // Arrange
    renderPage('group-1', 'contest-6')
    await user.click(await screen.findByRole('button', toggleName))
    await screen.findByText('Resultados reales')

    // Act
    await user.click(screen.getByRole('button', toggleName))

    // Assert
    expect(await screen.findByText('2 envíos sin revelar')).toBeInTheDocument()
    expect(screen.queryByText('Resultados reales')).not.toBeInTheDocument()
    expect(screen.getByRole('button', toggleName)).toHaveAttribute('aria-pressed', 'false')
  })

  it('manda realtime=true solo mientras la vista real está encendida', async () => {
    // Arrange
    const requests = recordStandingsRequests()
    renderPage('group-1', 'contest-6')
    await screen.findByText('2 envíos sin revelar')

    // Act
    await user.click(screen.getByRole('button', toggleName))
    await waitFor(() => expect(lastRequest(requests)?.get('realtime')).toBe('true'))
    await user.click(await screen.findByRole('button', toggleName))

    // Assert
    await waitFor(() => expect(lastRequest(requests)?.get('realtime')).toBeNull())
    expect(requests[0].get('realtime')).toBeNull()
  })

  it('no muestra el botón en una competencia sin congelamiento', async () => {
    renderPage('group-1', 'contest-2')

    await screen.findByText('Competitive Coders')

    expect(screen.queryByRole('button', toggleName)).not.toBeInTheDocument()
  })

  it('no muestra el botón a quien no es admin ni líder y nunca manda realtime', async () => {
    // Arrange
    authState.role = 'CONTESTANT'
    server.use(
      http.get('http://localhost:8080/api/groups/:id', () =>
        HttpResponse.json({ ...mockGroupDetails['group-1'], userMembership: { isMember: true, role: 'MEMBER', joinedAt: '2024-07-10T12:00:00Z' } }),
      ),
    )
    const requests = recordStandingsRequests()

    // Act
    renderPage('group-1', 'contest-6')
    await screen.findByText('2 envíos sin revelar')

    // Assert
    expect(screen.queryByRole('button', toggleName)).not.toBeInTheDocument()
    expect(requests.every((params) => params.get('realtime') === null)).toBe(true)
  })

  it('muestra el botón a un líder del grupo que no es admin', async () => {
    authState.role = 'CONTESTANT'

    renderPage('group-1', 'contest-6')

    expect(await screen.findByRole('button', toggleName)).toBeInTheDocument()
  })

  it('apaga el modo y avisa si el backend responde 403 con realtime encendido', async () => {
    // Arrange
    server.use(
      http.get(STANDINGS_URL, ({ request }) => {
        if (new URL(request.url).searchParams.get('realtime') === 'true') {
          return HttpResponse.json({ error: 'INSUFFICIENT_PERMISSIONS', message: 'sin permiso' }, { status: 403 })
        }
      }),
    )
    renderPage('group-1', 'contest-6')
    await screen.findByText('2 envíos sin revelar')

    // Act
    await user.click(screen.getByRole('button', toggleName))

    // Assert
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'error',
          title: 'No se pudo ver en tiempo real',
          description: 'No tienes permisos para realizar esta acción',
        }),
      ),
    )
    expect(mockToast).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('2 envíos sin revelar')).toBeInTheDocument()
    expect(screen.getByRole('button', toggleName)).toHaveAttribute('aria-pressed', 'false')
  })

  it('conserva el botón para volver a la vista congelada si la consulta realtime falla con 500', async () => {
    // Arrange
    server.use(
      http.get(STANDINGS_URL, ({ request }) => {
        if (new URL(request.url).searchParams.get('realtime') === 'true') {
          return HttpResponse.json({ error: 'INTERNAL_ERROR', message: 'fallo' }, { status: 500 })
        }
      }),
    )
    renderPage('group-1', 'contest-6')
    await screen.findByText('2 envíos sin revelar')

    // Act
    await user.click(screen.getByRole('button', toggleName))

    await screen.findByRole('button', { ...toggleName, pressed: true })
    expect(screen.queryByText('Resultados reales')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', toggleName))

    // Assert
    expect(await screen.findByText('2 envíos sin revelar')).toBeInTheDocument()
    expect(screen.getByRole('button', toggleName)).toHaveAttribute('aria-pressed', 'false')
  })
})
