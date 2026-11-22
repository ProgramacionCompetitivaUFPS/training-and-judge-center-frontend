import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser, mockContests, computeContestStatus } from '@/mocks/data'
import { ContestsPage } from './ContestsPage'

const mockLogout = vi.fn()
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

function renderPage() {
  const queryClient = createTestQueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ContestsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ContestsPage', () => {
  beforeEach(() => {
    mockLogout.mockClear()
    setAccessToken('mock-jwt-token-luisadmin')
  })
  afterEach(() => clearAccessToken())

  it('shows "En curso", "Próximas" and "Finalizadas" section headings in grouped view', async () => {
    // Arrange
    renderPage()

    // Assert
    await waitFor(() => {
      expect(screen.getByText('En curso')).toBeInTheDocument()
    })
    expect(screen.getByText('Próximas')).toBeInTheDocument()
    expect(screen.getByText('Finalizadas')).toBeInTheDocument()
  })

  it('shows a known contest name in the active section', async () => {
    // Arrange
    renderPage()

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Práctica Grafos')).toBeInTheDocument()
    })
  })

  it('shows "Ver competencia" instead of "Registrarse" for a LEAD in a SCHEDULED contest', async () => {
    // Arrange — override the contests list to include one SCHEDULED contest where the user is LEAD
    server.use(
      http.get('http://localhost:8080/api/contests', () =>
        HttpResponse.json({
          items: [{
            id: 'contest-lead',
            name: 'Competencia Liderada',
            description: null,
            startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
            duration: 3600,
            status: 'SCHEDULED',
            penalty: 20,
            freezeMinutes: null,
            enablePostContest: false,
            participationMode: 'INDIVIDUAL',
            participantCount: 0,
            isRegistered: false,
            problemCount: 0,
            userGroupRole: 'LEAD',
            group: { id: 'group-1', name: 'ICPC Colombia' },
          }],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false },
        }),
      ),
    )
    renderPage()

    // Assert — LEAD sees "Ver competencia", not "Registrarse"
    await waitFor(() => {
      expect(screen.getAllByText('Competencia Liderada').length).toBeGreaterThan(0)
    })
    expect(screen.queryByText('Registrarse')).not.toBeInTheDocument()
    expect(screen.getByText('Ver competencia')).toBeInTheDocument()
  })

  it('shows "Ver competencia" instead of "Registrarse" for a non-member (userGroupRole null) in a SCHEDULED contest', async () => {
    server.use(
      http.get('http://localhost:8080/api/contests', () =>
        HttpResponse.json({
          items: [{
            id: 'contest-nonmember',
            name: 'Competencia Ajena',
            description: null,
            startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
            duration: 3600,
            status: 'SCHEDULED',
            penalty: 20,
            freezeMinutes: null,
            enablePostContest: false,
            participationMode: 'INDIVIDUAL',
            participantCount: 0,
            isRegistered: false,
            problemCount: 0,
            userGroupRole: null,
            group: { id: 'group-1', name: 'ICPC Colombia' },
          }],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false },
        }),
      ),
    )
    renderPage()

    await waitFor(() => {
      expect(screen.getAllByText('Competencia Ajena').length).toBeGreaterThan(0)
    })
    expect(screen.queryByText('Registrarse')).not.toBeInTheDocument()
    expect(screen.getByText('Ver competencia')).toBeInTheDocument()
  })

  it('shows empty state when server returns no contests', async () => {
    // Arrange
    server.use(
      http.get('http://localhost:8080/api/contests', () =>
        HttpResponse.json({
          items: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false },
        }),
      ),
    )
    renderPage()

    // Assert
    await waitFor(() => {
      expect(screen.getAllByText('No hay competencias').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('keeps a single skeleton while any grouped section is still loading', async () => {
    // Arrange: ACTIVE y SCHEDULED responden de inmediato; FINISHED queda pendiente hasta liberarla
    let releaseFinished!: () => void
    const finishedGate = new Promise<void>((resolve) => { releaseFinished = resolve })
    const served = new Set<string>()
    server.use(
      http.get('http://localhost:8080/api/contests', async ({ request }) => {
        const status = new URL(request.url).searchParams.get('status') ?? 'ALL'
        if (status === 'FINISHED') await finishedGate
        served.add(status)
        const items = mockContests
          .map((c) => ({ ...c, status: computeContestStatus(c.startTime, c.endTime) }))
          .filter((c) => c.status === status)
        return HttpResponse.json({
          items,
          pagination: { page: 1, limit: 20, total: items.length, totalPages: 1, hasNextPage: false, hasPrevPage: false },
        })
      }),
    )
    renderPage()

    // Assert: con dos de las tres consultas resueltas, el skeleton sigue y no se dibuja ninguna sección
    await waitFor(() => {
      expect(served.has('ACTIVE') && served.has('SCHEDULED')).toBe(true)
    })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.getByTestId('contests-grouped-skeleton')).toBeInTheDocument()
    expect(screen.queryByText('En curso')).not.toBeInTheDocument()
    expect(screen.queryByText('Finalizadas')).not.toBeInTheDocument()

    // Act: se libera la última consulta
    releaseFinished()

    // Assert: aparece el contenido y desaparece el skeleton
    await waitFor(() => {
      expect(screen.getByText('Finalizadas')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('contests-grouped-skeleton')).not.toBeInTheDocument()
  })

  it('renders only the non-empty sections once loaded, so empty ones never appear and vanish', async () => {
    // Arrange: sin competencias en curso ni programadas, solo finalizadas
    server.use(
      http.get('http://localhost:8080/api/contests', ({ request }) => {
        const status = new URL(request.url).searchParams.get('status')
        const items = status === 'FINISHED'
          ? mockContests
            .map((c) => ({ ...c, status: computeContestStatus(c.startTime, c.endTime) }))
            .filter((c) => c.status === 'FINISHED')
          : []
        return HttpResponse.json({
          items,
          pagination: { page: 1, limit: 20, total: items.length, totalPages: 1, hasNextPage: false, hasPrevPage: false },
        })
      }),
    )
    renderPage()

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Finalizadas')).toBeInTheDocument()
    })
    expect(screen.queryByText('En curso')).not.toBeInTheDocument()
    expect(screen.queryByText('Próximas')).not.toBeInTheDocument()
    expect(screen.queryByTestId('contests-grouped-skeleton')).not.toBeInTheDocument()
  })
})
