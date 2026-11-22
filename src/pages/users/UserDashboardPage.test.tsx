import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import { UserDashboardPage } from './UserDashboardPage'

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

function renderPage() {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <UserDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('UserDashboardPage', () => {
  beforeEach(() => {
    mockLogout.mockClear()
    setAccessToken('mock-jwt-token-luisadmin')
  })
  afterEach(() => clearAccessToken())

  it('renders greeting with user name', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Luis' })).toBeInTheDocument()
  })

  it('renders upcoming contests section', async () => {
    renderPage()
    const contestItems = await screen.findAllByText('Competencia Semanal #12')
    expect(contestItems.length).toBeGreaterThan(0)
  })

  it('renders recent submissions section', async () => {
    renderPage()
    expect(await screen.findByText('Two Sum')).toBeInTheDocument()
  })

  it('shows error message when dashboard fails to load', async () => {
    server.use(
      http.get('http://localhost:8080/api/users/me/dashboard', () =>
        HttpResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 }),
      ),
    )
    renderPage()
    expect(await screen.findByText('No se pudo cargar el dashboard.')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Cabecera, tarjetas y listas con datos propios
// ---------------------------------------------------------------------------

const HOUR = 60 * 60 * 1000

function contest(id: string, name: string, startsInMs: number) {
  return {
    id,
    name,
    startDate: new Date(Date.now() + startsInMs).toISOString(),
    durationMinutes: 120,
    groupId: 'group-1',
    groupName: 'ICPC Colombia',
  }
}

function submission(n: number, verdict = 'ACCEPTED') {
  return {
    id: `sub-${n}`,
    problemSlug: `problema-${n}`,
    problemTitle: `Problema ${n}`,
    verdict,
    language: 'cpp20',
    submittedAt: '2026-03-15T09:10:00Z',
    executionTime: 10,
    memoryKb: 512,
  }
}

function serveDashboard(overrides: Record<string, unknown>) {
  server.use(
    http.get('http://localhost:8080/api/users/me/dashboard', () =>
      HttpResponse.json({
        recentSubmissions: [],
        upcomingContests: [],
        activeContests: [],
        problemsSolved: 7,
        materialsCount: 3,
        streak: { current: 0, maximum: 0 },
        recentContestResults: [],
        ...overrides,
      }),
    ),
  )
}

describe('UserDashboardPage — cabecera y racha', () => {
  beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
  afterEach(() => clearAccessToken())

  it.each([
    [0, 0, '¡Resuelve hoy para empezar tu racha!'],
    [1, 4, 'día de racha'],
    [5, 9, 'días de racha'],
  ])('con una racha de %i día(s) y máximo %i muestra «%s»', async (current, maximum, caption) => {
    serveDashboard({ streak: { current, maximum } })
    renderPage()

    expect(await screen.findByText(caption)).toBeInTheDocument()
    if (maximum > 0) expect(screen.getByText(`mejor: ${maximum}`)).toBeInTheDocument()
    else expect(screen.queryByText(/mejor:/)).not.toBeInTheDocument()
  })

  it.each([
    [{ activeContests: [contest('c1', 'En vivo', -HOUR)] }, 'Tienes 1 competencia en vivo ahora.'],
    [{ activeContests: [contest('c1', 'A', -HOUR), contest('c2', 'B', -HOUR)] }, 'Tienes 2 competencias en vivo ahora.'],
    [{ upcomingContests: [contest('c1', 'Próxima', 30 * HOUR)] }, 'Tienes 1 competencia próxima.'],
    [{ upcomingContests: [contest('c1', 'A', 30 * HOUR), contest('c2', 'B', 40 * HOUR)] }, 'Tienes 2 competencias próximas.'],
    [{}, 'Sigue resolviendo — cada envío cuenta.'],
  ])('la frase de motivación depende de las competencias (%#)', async (overrides, line) => {
    serveDashboard(overrides)
    renderPage()

    expect(await screen.findByText(line)).toBeInTheDocument()
  })
})

describe('UserDashboardPage — tarjetas', () => {
  beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
  afterEach(() => clearAccessToken())

  it('sin competencias próximas ni resultados muestra los textos vacíos', async () => {
    serveDashboard({})
    renderPage()

    expect(await screen.findByText('sin competencias próximas')).toBeInTheDocument()
    expect(screen.getByText('sin competencias finalizadas')).toBeInTheDocument()
  })

  it('la próxima competencia enlaza a su detalle y muestra la cuenta atrás', async () => {
    serveDashboard({ upcomingContests: [contest('c9', 'Maratón Primavera', 30 * HOUR)] })
    renderPage()

    const card = (await screen.findAllByText('Maratón Primavera')).map((el) => el.closest('a')).find(Boolean)
    expect(card).toHaveAttribute('href', '/groups/group-1/contests/c9')
    expect(screen.getByText(/^1d \d+h$/)).toBeInTheDocument()
  })

  it('el último resultado muestra la posición y los problemas resueltos', async () => {
    serveDashboard({
      recentContestResults: [
        { contestId: 'c1', contestName: 'Reto Clásicos', groupId: 'group-1', position: 3, problemsSolved: 2, totalParticipants: 20, finishedAt: '2026-03-01T10:00:00Z' },
      ],
    })
    renderPage()

    expect(await screen.findByText('#3')).toBeInTheDocument()
    expect(screen.getByText('Reto Clásicos · 2 resueltos')).toBeInTheDocument()
  })

  it('muestra los problemas resueltos y los materiales recientes', async () => {
    serveDashboard({ problemsSolved: 42, materialsCount: 5 })
    renderPage()

    expect(await screen.findByText('42')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})

describe('UserDashboardPage — listas', () => {
  beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
  afterEach(() => clearAccessToken())

  it('sin envíos invita a ver los problemas', async () => {
    serveDashboard({})
    renderPage()

    expect(await screen.findByText('Aún no tienes envíos.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ver problemas/ })).toHaveAttribute('href', '/problems')
  })

  it('muestra el veredicto de cada envío y solo los cinco primeros con un enlace «Ver más»', async () => {
    serveDashboard({ recentSubmissions: [1, 2, 3, 4, 5, 6].map((n) => submission(n, n === 2 ? 'WRONG_ANSWER' : 'ACCEPTED')) })
    renderPage()

    expect(await screen.findByText('Problema 1')).toBeInTheDocument()
    expect(screen.getByText('Problema 5')).toBeInTheDocument()
    expect(screen.queryByText('Problema 6')).not.toBeInTheDocument()
    expect(screen.getByText('Respuesta Incorrecta')).toBeInTheDocument()
    expect(screen.getAllByText('Aceptado')).toHaveLength(4)
    expect(screen.getByRole('link', { name: /Ver más/ })).toHaveAttribute('href', '/submissions')
  })

  it('no ofrece «Ver más» con cinco envíos o menos', async () => {
    serveDashboard({ recentSubmissions: [1, 2, 3].map((n) => submission(n)) })
    renderPage()

    await screen.findByText('Problema 1')
    expect(screen.queryByRole('link', { name: /Ver más/ })).not.toBeInTheDocument()
  })

  it('sin competencias invita a ver los grupos', async () => {
    serveDashboard({})
    renderPage()

    expect(await screen.findByText('No hay competencias en tus grupos.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ver mis grupos/ })).toHaveAttribute('href', '/groups')
  })

  it('pone las competencias en vivo primero y las próximas por fecha, con la etiqueta de cada una', async () => {
    serveDashboard({
      activeContests: [contest('live', 'Ahora mismo', -HOUR)],
      upcomingContests: [contest('late', 'Más tarde', 100 * HOUR), contest('soon', 'Hoy mismo', 2 * HOUR)],
    })
    renderPage()

    // Only the rows of "Mis Competencias" show the group name under the contest name
    await screen.findAllByText('ICPC Colombia')
    const rowNames = screen.getAllByText('ICPC Colombia').map((el) => el.closest('a')?.querySelector('span')?.textContent)
    expect(rowNames).toEqual(['Ahora mismo', 'Hoy mismo', 'Más tarde'])
    expect(screen.getByText('EN VIVO')).toBeInTheDocument()
  })

  it('ofrece «Ver todas» solo cuando hay más de cinco competencias', async () => {
    serveDashboard({
      upcomingContests: [1, 2, 3, 4, 5, 6].map((n) => contest(`c${n}`, `Competencia ${n}`, (n * 24 + 30) * HOUR)),
    })
    renderPage()

    await screen.findAllByText('Competencia 1')
    expect(screen.queryByText('Competencia 6')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ver todas/ })).toHaveAttribute('href', '/contests')
  })

  it('muestra un aviso cuando no se puede cargar el dashboard', async () => {
    server.use(
      http.get('http://localhost:8080/api/users/me/dashboard', () =>
        HttpResponse.json({ error: 'SERVER_ERROR', message: 'fallo' }, { status: 500 }),
      ),
    )
    renderPage()

    expect(await screen.findByText('No se pudo cargar el dashboard.')).toBeInTheDocument()
  })
})
