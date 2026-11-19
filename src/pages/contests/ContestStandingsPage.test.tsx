import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
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
