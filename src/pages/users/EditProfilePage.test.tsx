import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import { EditProfilePage } from './EditProfilePage'

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

vi.mock('@/components/features/GoogleSignInButton', () => ({
  GoogleSignInButton: () => null,
}))

function renderPage() {
  const queryClient = createTestQueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <EditProfilePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EditProfilePage', () => {
  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    toastSpy.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('pre-fills profile form with current user data', () => {
    // Arrange + Assert — data comes from useAuth, not network
    renderPage()

    expect(screen.getByDisplayValue('Luis Admin')).toBeInTheDocument()
  })

  it('shows success toast after saving profile changes', async () => {
    // Arrange
    const user = userEvent.setup()
    renderPage()

    // Act — clear name field and type new value, then submit
    const nameInput = screen.getByDisplayValue('Luis Admin')
    await user.clear(nameInput)
    await user.type(nameInput, 'Luis Actualizado')
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }))

    // Assert
    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'success' }),
      )
    })
  })

  it('shows error toast when server fails on profile update', async () => {
    // Arrange
    server.use(
      http.put('http://localhost:8080/api/users', () =>
        HttpResponse.json({ error: 'SERVER_ERROR' }, { status: 500 }),
      ),
    )
    const user = userEvent.setup()
    renderPage()

    // Act
    const nameInput = screen.getByDisplayValue('Luis Admin')
    await user.clear(nameInput)
    await user.type(nameInput, 'Nombre Nuevo')
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }))

    // Assert
    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'error' }),
      )
    })
  })
})
