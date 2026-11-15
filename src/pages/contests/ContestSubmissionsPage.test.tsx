import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
      <MemoryRouter initialEntries={[`/groups/${groupId}/contests/${contestId}/submissions`]}>
        <Routes>
          <Route path="/groups/:groupId/contests/:id/submissions" element={<ContestSubmissionsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ContestSubmissionsPage', () => {
  beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
  afterEach(() => clearAccessToken())

  it('renders submissions list', async () => {
    renderPage()
    await waitFor(() => {
      expect(document.querySelector('table')).toBeInTheDocument()
    })
  })

  it('shows empty state when no submissions', async () => {
    server.use(
      http.get('http://localhost:8080/api/groups/:groupId/contests/:contestId/submissions', () =>
        HttpResponse.json({
          submissions: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
        }),
      ),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.queryByRole('row', { name: /accepted|wrong/i })).not.toBeInTheDocument()
    })
  })
})
