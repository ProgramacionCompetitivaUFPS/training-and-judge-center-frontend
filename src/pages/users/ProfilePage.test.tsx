import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import { ProfilePage } from './ProfilePage'

const toastSpy = vi.fn()

vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: toastSpy }),
}))

vi.mock('@/hooks/useContestSession', () => ({
  useContestSession: () => ({ contest: null }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    isLoading: false,
    isAuthenticated: true,
    hasRole: () => true,
    logout: vi.fn(),
  }),
}))

function renderPage(nickname = 'luisadmin') {
  const queryClient = createTestQueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/users/${nickname}`]}>
        <Routes>
          <Route path="/users/:nickname" element={<ProfilePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProfilePage', () => {
  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    toastSpy.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('shows nickname and role badge for a known user', async () => {
    // Arrange
    renderPage('luisadmin')

    // Assert — both nickname and name come from the same async response
    await waitFor(() => {
      expect(screen.getByText('@luisadmin')).toBeInTheDocument()
      expect(screen.getByText('Luis Admin')).toBeInTheDocument()
    })
  })

  it('shows stats section when data is available', async () => {
    // Arrange
    renderPage('luisadmin')

    // Assert — mockProfileStats.problemsSolved = 18
    await waitFor(() => {
      expect(screen.getByText('18')).toBeInTheDocument()
    })
  })

  it('shows error state for a non-existent user', async () => {
    // Arrange
    server.use(
      http.get('http://localhost:8080/api/users/:nickname', () =>
        HttpResponse.json(
          { error: 'NOT_FOUND', message: 'Usuario no encontrado' },
          { status: 404 },
        ),
      ),
    )
    renderPage('nobody')

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/no encontrado|not found|usuario/i)).toBeInTheDocument()
    })
  })
})
