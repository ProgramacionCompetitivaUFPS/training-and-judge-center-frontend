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

  it('renderiza la tabla de envíos del problema', async () => {
    // Arrange
    renderPage()

    // Assert
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
    })
    expect(screen.getByRole('columnheader', { name: /usuario/i })).toBeInTheDocument()
  })

  it('muestra la etiqueta "Privado" en los envíos PRIVATE del usuario autenticado', async () => {
    // Arrange
    renderPage()

    // Assert
    await waitFor(() => {
      const badges = screen.getAllByText('Privado')
      expect(badges.length).toBeGreaterThan(0)
    })
  })

  it('no muestra "Privado" para los envíos PRIVATE de otro usuario', async () => {
    // Arrange
    auth.userId = 'user-other'
    renderPage()

    // Assert
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
    })
    expect(screen.queryAllByText('Privado')).toHaveLength(0)
  })
})
