import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import { TeamsPage } from './TeamsPage'

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
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TeamsPage', () => {
  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('renders team list', async () => {
    renderPage()
    expect(await screen.findByText('Competitive Coders')).toBeInTheDocument()
  })

  it('shows create team button', async () => {
    renderPage()
    await screen.findByText('Competitive Coders')
    expect(screen.getByRole('button', { name: /crear equipo/i })).toBeInTheDocument()
  })

  it('shows pending invitations when present', async () => {
    renderPage()
    expect(await screen.findByText('Code Warriors')).toBeInTheDocument()
  })

  it('opens create team dialog on button click', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Competitive Coders')
    await user.click(screen.getByRole('button', { name: /crear equipo/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })
})
