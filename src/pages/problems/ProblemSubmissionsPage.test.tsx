import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse, delay } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser, mockProblems } from '@/mocks/data'
import { ProblemSubmissionsPage } from './ProblemSubmissionsPage'

const auth = { userId: 'user-luisadmin' }

const mockLogout = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { ...mockCurrentUser, id: auth.userId, nickname: auth.userId.replace('user-', '') },
    isLoading: false,
    isAuthenticated: true,
    hasRole: () => true,
    lastNickname: auth.userId.replace('user-', ''),
    logout: mockLogout,
  }),
}))

const SLUG = 'two-sum'

function renderPage() {
  const queryClient = createTestQueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/problems/${SLUG}/submissions`]}>
        <Routes>
          <Route path="/problems/:slug/submissions" element={<ProblemSubmissionsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProblemSubmissionsPage', () => {
  beforeEach(() => {
    mockLogout.mockClear()
    auth.userId = 'user-luisadmin'
    setAccessToken('mock-jwt-token-luisadmin')
  })
  afterEach(() => clearAccessToken())

  it('renders the submissions table', async () => {
    // Arrange
    renderPage()

    // Assert
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
    })
    expect(screen.getByRole('columnheader', { name: /usuario/i })).toBeInTheDocument()
  })

  it('shows "Privado" badge on PRIVATE submissions owned by the authenticated user', async () => {
    // Arrange
    renderPage()

    // Assert — two-sum has exactly 2 PRIVATE submissions from luisadmin (sub-001, sub-009)
    await waitFor(() => {
      expect(screen.getAllByText('Privado')).toHaveLength(2)
    })
  })

  it('does not show "Privado" badge for another user\'s submissions', async () => {
    // Arrange — user-other's token: MSW returns other's own subs + public from rest (no PRIVATE from luisadmin)
    auth.userId = 'user-other'
    setAccessToken('mock-jwt-token-other')
    renderPage()

    // Assert
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
    })
    expect(screen.queryAllByText('Privado')).toHaveLength(0)
  })

  it('no solicita estadísticas cuando el problema está en DRAFT', async () => {
    // Arrange
    const twoSum = mockProblems.find((p) => p.slug === SLUG)
    let statisticsRequests = 0
    server.use(
      http.get('http://localhost:8080/api/problems/p/:slug', () =>
        HttpResponse.json({ ...twoSum, status: 'DRAFT' }),
      ),
      http.get('http://localhost:8080/api/problems/p/:slug/statistics', () => {
        statisticsRequests++
        return HttpResponse.json({})
      }),
    )

    // Act
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    // Assert
    expect(statisticsRequests).toBe(0)
  })

  describe('cuando no se puede saber si hay historial dentro de competencias', () => {
    const emptyList = () =>
      HttpResponse.json({ submissions: [], pagination: { page: 1, limit: 5, total: 0, totalPages: 0 } })

    it('no afirma que nadie ha enviado si falla la carga del problema', async () => {
      // Arrange: the detail query fails, so the statistics query stays disabled and never errors
      server.use(
        http.get('http://localhost:8080/api/problems/p/:slug', () =>
          HttpResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 }),
        ),
        http.get('http://localhost:8080/api/problems/p/:slug/submissions', emptyList),
      )

      // Act
      renderPage()

      // Assert
      expect(await screen.findByText('Sin envíos de práctica')).toBeInTheDocument()
      expect(screen.queryByText(/todavía nadie ha enviado/i)).not.toBeInTheDocument()
    })

    it('no muestra el estado vacío mientras el problema sigue cargando', async () => {
      // Arrange: the list is already empty but the problem detail never arrives
      let listServed = false
      server.use(
        http.get('http://localhost:8080/api/problems/p/:slug', async () => {
          await delay('infinite')
          return HttpResponse.json({})
        }),
        http.get('http://localhost:8080/api/problems/p/:slug/submissions', () => {
          listServed = true
          return emptyList()
        }),
      )

      // Act
      renderPage()
      await waitFor(() => expect(listServed).toBe(true))
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Assert
      expect(screen.queryByText(/todavía nadie ha enviado/i)).not.toBeInTheDocument()
      expect(screen.queryByText('Sin envíos de práctica')).not.toBeInTheDocument()
    })
  })
})
