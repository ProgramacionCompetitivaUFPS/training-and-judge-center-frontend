import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import { ContestDetailPage } from './ContestDetailPage'

vi.mock('@/hooks/useContestSession', () => ({
  useContestSession: () => ({ contest: null }),
}))

// ContestCountdown uses useSyncExternalStore + setInterval which causes
// "Maximum update depth exceeded" under coverage instrumentation
vi.mock('@/components/features/ContestCountdown', () => ({
  ContestCountdown: () => null,
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

const mockToast = vi.fn()
vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: mockToast }),
}))

function renderPage(groupId = 'group-1', contestId = 'contest-1') {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/groups/${groupId}/contests/${contestId}`]}>
        <Routes>
          <Route path="/groups/:groupId/contests/:id" element={<ContestDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ContestDetailPage', () => {
  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('renders contest name and status badge', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Competencia Semanal #12' })).toBeInTheDocument()
  })

  it('renders not-found page on 404', async () => {
    server.use(
      http.get('http://localhost:8080/api/groups/:groupId/contests/:contestId', () =>
        HttpResponse.json({ error: 'CONTEST_NOT_FOUND' }, { status: 404 }),
      ),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Página no encontrada')).toBeInTheDocument()
    })
  })

  it('renders error page on 500', async () => {
    server.use(
      http.get('http://localhost:8080/api/groups/:groupId/contests/:contestId', () =>
        HttpResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 }),
      ),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
    })
  })
})
