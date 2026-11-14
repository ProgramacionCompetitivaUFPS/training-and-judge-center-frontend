import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { ProblemSubmissionsPage } from './ProblemSubmissionsPage'

const auth = { userId: 'user-luisadmin' }

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: auth.userId, nickname: auth.userId.replace('user-', ''), role: 'ADMIN' },
    isLoading: false,
    isAuthenticated: true,
    hasRole: () => true,
    lastNickname: auth.userId.replace('user-', ''),
    logout: vi.fn(),
  }),
}))

const SLUG = 'two-sum'

function renderPage() {
  const queryClient = createTestQueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/problems/${SLUG}/submissions`]}>
        <Routes>
          <Route path="/problems/:slug/submissions" element={<ProblemSubmissionsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProblemSubmissionsPage', () => {
  beforeEach(() => {
    auth.userId = 'user-luisadmin'
    setAccessToken('mock-jwt-token-luisadmin')
  })
  afterEach(() => clearAccessToken())

  it('renders the submissions table', async () => {
    // Arrange
    renderPage()

    // Assert
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
    })
    expect(screen.getByRole('columnheader', { name: /usuario/i })).toBeInTheDocument()
  })

  it('shows "Privado" badge on PRIVATE submissions owned by the authenticated user', async () => {
    // Arrange
    renderPage()

    // Assert — two-sum has exactly 2 PRIVATE submissions from luisadmin (sub-001, sub-009)
    await waitFor(() => {
      expect(screen.getAllByText('Privado')).toHaveLength(2)
    })
  })

  it('does not show "Privado" badge for another user\'s submissions', async () => {
    // Arrange — user-other's token: MSW returns other's own subs + public from rest (no PRIVATE from luisadmin)
    auth.userId = 'user-other'
    setAccessToken('mock-jwt-token-other')
    renderPage()

    // Assert
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
    })
    expect(screen.queryAllByText('Privado')).toHaveLength(0)
  })
})
