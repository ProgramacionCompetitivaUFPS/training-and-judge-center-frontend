import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import { SubmissionsPage } from './SubmissionsPage'

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

function renderPage() {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <SubmissionsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SubmissionsPage', () => {
  beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
  afterEach(() => clearAccessToken())

  it('renders submissions list with problem names', async () => {
    renderPage()
    const cells = await screen.findAllByText('Two Sum')
    expect(cells.length).toBeGreaterThan(0)
  })

  it('renders language and verdict filter buttons', async () => {
    renderPage()
    await screen.findAllByText('Two Sum')
    expect(screen.getAllByText('Veredicto').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Lenguaje').length).toBeGreaterThan(0)
  })

  it('shows empty state when server returns no submissions', async () => {
    server.use(
      http.get('http://localhost:8080/api/users/me/submissions', () =>
        HttpResponse.json({ submissions: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } }),
      ),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.queryByText('Two Sum')).not.toBeInTheDocument()
    })
  })
})
