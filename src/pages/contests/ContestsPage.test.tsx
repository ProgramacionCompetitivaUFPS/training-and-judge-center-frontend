import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { ContestsPage } from './ContestsPage'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-luisadmin', nickname: 'luisadmin', role: 'ADMIN' },
    isLoading: false,
    isAuthenticated: true,
    hasRole: () => true,
    lastNickname: 'luisadmin',
    logout: vi.fn(),
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
  beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
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
})
