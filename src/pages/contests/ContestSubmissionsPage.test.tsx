import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import { ContestSubmissionsPage } from './ContestSubmissionsPage'

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
      <MemoryRouter initialEntries={[`/groups/${groupId}/contests/${contestId}/submissions`]}>
        <Routes>
          <Route path="/groups/:groupId/contests/:id/submissions" element={<ContestSubmissionsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ContestSubmissionsPage', () => {
  beforeEach(() => {
    mockLogout.mockClear()
    setAccessToken('mock-jwt-token-luisadmin')
  })
  afterEach(() => clearAccessToken())

  it('renders submissions list with data', async () => {
    renderPage()
    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.getAllByText('Two Sum').length).toBeGreaterThan(0)
  })

  it('shows empty state when no submissions', async () => {
    server.use(
      http.get('http://localhost:8080/api/groups/:groupId/contests/:contestId/submissions', () =>
        HttpResponse.json({
          contest: { id: 'contest-2', name: 'Práctica Grafos', status: 'ACTIVE', frozenAt: null },
          submissions: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
        }),
      ),
    )
    renderPage()
    await screen.findByText('Aún no hay envíos en esta competencia.')
    expect(screen.queryByText('Two Sum')).not.toBeInTheDocument()
  })
})
