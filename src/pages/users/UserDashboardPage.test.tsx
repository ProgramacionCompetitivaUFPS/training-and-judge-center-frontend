import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import { UserDashboardPage } from './UserDashboardPage'

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
  const queryClient = createTestQueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <UserDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('UserDashboardPage', () => {
  beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
  afterEach(() => clearAccessToken())

  it('shows the solved problems count in the success (green) color', async () => {
    // Arrange
    renderPage()

    // Act
    const card = (await screen.findByText('Problemas Resueltos')).parentElement as HTMLElement

    // Assert
    expect(within(card).getByText('18')).toHaveClass('text-status-success')
  })

  it('keeps the recent materials count in the brand color, not the success one', async () => {
    // Arrange
    renderPage()

    // Act
    const card = (await screen.findByText('Materiales Recientes')).parentElement as HTMLElement

    // Assert
    expect(within(card).getByText('4')).not.toHaveClass('text-status-success')
  })
})
