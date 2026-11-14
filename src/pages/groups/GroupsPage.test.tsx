import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import { GroupsPage } from './GroupsPage'

const toastSpy = vi.fn()

vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: toastSpy }),
}))

vi.mock('@/hooks/useContestSession', () => ({
  useContestSession: () => ({ contest: null }),
}))

const auth = {
  user: mockCurrentUser as typeof mockCurrentUser & { role: string },
  isLoading: false,
  isAuthenticated: true,
  hasRole: (roles: string[]) => roles.includes(auth.user.role),
  logout: vi.fn(),
}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => auth,
}))

function renderPage() {
  const queryClient = createTestQueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <GroupsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('GroupsPage', () => {
  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    auth.user = mockCurrentUser
    toastSpy.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('renders group list with a known group name', async () => {
    // Arrange
    renderPage()

    // Assert — mockGroups[0].name = 'ICPC Colombia'
    await waitFor(() => {
      expect(screen.getByText('ICPC Colombia')).toBeInTheDocument()
    })
  })

  it('shows "Crear Grupo" button for ADMIN role', async () => {
    // Arrange
    renderPage()

    // Assert
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /crear grupo/i })).toBeInTheDocument()
    })
  })

  it('does not show "Crear Grupo" button for CONTESTANT role', async () => {
    // Arrange — switch auth to CONTESTANT for this test
    auth.user = { ...mockCurrentUser, role: 'CONTESTANT' }
    renderPage()

    // Assert
    await waitFor(() => {
      expect(screen.getByText('ICPC Colombia')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /crear grupo/i })).not.toBeInTheDocument()
  })

  it('shows "Mis Grupos" tab content on tab click', async () => {
    // Arrange
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => expect(screen.getByText('Principiantes CP')).toBeInTheDocument())

    // Act
    await user.click(screen.getByRole('tab', { name: /mis grupos/i }))

    // Assert — after switching, 'Principiantes CP' disappears and "Mis Grupos" data loads
    await waitFor(() => {
      expect(screen.queryByText('Principiantes CP')).not.toBeInTheDocument()
    })
    expect(screen.getByText('ICPC Colombia')).toBeInTheDocument()
  })
})
