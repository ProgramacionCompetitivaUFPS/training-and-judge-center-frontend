import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import { UsersListPage } from './UsersListPage'

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

const mockToast = vi.fn()
vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: mockToast }),
}))

function renderPage() {
  renderWithProviders(<UsersListPage />)
}

describe('UsersListPage', () => {
  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('renders user list with nicknames', async () => {
    renderPage()
    expect(await screen.findByText('@diegomartinez')).toBeInTheDocument()
    expect(screen.getByText('@mariacoach')).toBeInTheDocument()
  })

  it('renders role badges', async () => {
    renderPage()
    await screen.findByText('@diegomartinez')
    expect(screen.getAllByText(/admin|coach|contestant/i).length).toBeGreaterThan(0)
  })

  it('filters results after typing in search', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('@diegomartinez')
    const searchInput = screen.getAllByRole('textbox')[0]
    await user.type(searchInput, 'carlos')
    await waitFor(() => {
      expect(screen.getByText('@carloscp')).toBeInTheDocument()
    })
  })

  it('shows error state on server failure', async () => {
    server.use(
      http.get('http://localhost:8080/api/admin/users', () =>
        HttpResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 }),
      ),
    )
    renderPage()
    await screen.findByRole('alert')
    expect(screen.queryByText('@diegomartinez')).not.toBeInTheDocument()
  })
})
