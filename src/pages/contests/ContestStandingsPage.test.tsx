import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser, mockContests } from '@/mocks/data'
import { ContestStandingsPage } from './ContestStandingsPage'

vi.mock('@/hooks/useContestSession', () => ({
  useContestSession: () => ({ contest: null }),
}))

const mockLogout = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
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

  it('muestra el pie de aceptados también al ver solo la post-competencia', async () => {
    renderPage('group-1', 'contest-8')
    await screen.findByRole('radiogroup', { name: 'Fase' })

    await user.click(screen.getByRole('radio', { name: 'Post-competencia' }))
    await waitFor(() => expect(screen.getByText('* lauramendez')).toBeInTheDocument())

    expect(screen.getByText('Aceptados')).toBeInTheDocument()
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
