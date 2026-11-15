import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import { ProblemsPage } from './ProblemsPage'

const toastSpy = vi.fn()

vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: toastSpy }),
}))

vi.mock('@/hooks/useContestSession', () => ({
  useContestSession: () => ({ contest: null }),
}))

const mockLogout = vi.fn()
const auth = {
  user: mockCurrentUser as typeof mockCurrentUser & { role: string },
  isLoading: false,
  isAuthenticated: true,
  hasRole: (roles: string[]) => roles.includes(auth.user.role),
  logout: mockLogout,
}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => auth,
}))

function renderPage() {
  const queryClient = createTestQueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProblemsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProblemsPage', () => {
  beforeEach(() => {
    mockLogout.mockClear()
    setAccessToken('mock-jwt-token-luisadmin')
    auth.user = mockCurrentUser
    toastSpy.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('renders problem list with slug', async () => {
    // Arrange
    renderPage()

    // Assert — 'Dynamic Knapsack' (createdAt 2025-10-01) is on page 1 (limit 5, sorted DESC by date)
    // for both ADMIN and CONTESTANT — slug appears as the monospace subtitle in ProblemsTable
    await waitFor(() => {
      expect(screen.getByText('Dynamic Knapsack')).toBeInTheDocument()
    })
    expect(screen.getByText('dynamic-knapsack')).toBeInTheDocument()
  })

  it('shows "Crear Problema" button for ADMIN role', async () => {
    // Arrange
    renderPage()

    // Assert
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /crear problema/i })).toBeInTheDocument()
    })
  })

  it('does not show "Crear Problema" button for CONTESTANT role', async () => {
    // Arrange — switch auth to CONTESTANT for this test
    auth.user = { ...mockCurrentUser, role: 'CONTESTANT' }
    renderPage()

    // Assert — 'Dynamic Knapsack' (PUBLISHED, PUBLIC) is on page 1 for CONTESTANT too
    await waitFor(() => {
      expect(screen.getByText('Dynamic Knapsack')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /crear problema/i })).not.toBeInTheDocument()
  })

  it('shows empty state when server returns no problems', async () => {
    // Arrange
    server.use(
      http.get('http://localhost:8080/api/problems', () =>
        HttpResponse.json({
          problems: [],
          pagination: { page: 1, limit: 5, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
        }),
      ),
    )
    renderPage()

    // Assert — EmptyState title from ProblemsPage.tsx line 231
    await waitFor(() => {
      expect(screen.getByText('No hay problemas')).toBeInTheDocument()
    })
  })
})
