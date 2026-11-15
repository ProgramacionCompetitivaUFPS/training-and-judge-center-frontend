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
