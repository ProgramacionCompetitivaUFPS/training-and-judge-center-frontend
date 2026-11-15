import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    isLoading: false,
    isAuthenticated: true,
    hasRole: () => true,
    lastNickname: mockCurrentUser.nickname,
    logout: vi.fn(),
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
  beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
  afterEach(() => clearAccessToken())

  it('renders standings table with team names', async () => {
    renderPage()
    expect(await screen.findByText('Competitive Coders')).toBeInTheDocument()
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
    await waitFor(() => {
      expect(screen.queryByText('Competitive Coders')).not.toBeInTheDocument()
    })
  })
})
