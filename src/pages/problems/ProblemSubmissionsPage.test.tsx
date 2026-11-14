import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { ProblemSubmissionsPage } from './ProblemSubmissionsPage'

// Mutable state referenced by the vi.mock factory below.
// Each test can change `currentUserId` to simulate a different authenticated user.
const auth = { userId: 'user-luisadmin' }

// AppLayout → Navbar → useAuth(): mock para evitar depender de AuthProvider.
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

// slug 'two-sum' tiene sub-001-aaaa-bbbb-cccc-ddddeeee0001: PRIVATE, enviado por user-luisadmin.
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
    // Arrange + Act
    renderPage()

    // Assert — tabla con encabezado "Usuario" presente tras cargar datos
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
    })
    expect(screen.getByRole('columnheader', { name: /usuario/i })).toBeInTheDocument()
  })

  it('muestra la etiqueta "Privado" en los envíos PRIVATE del usuario autenticado', async () => {
    // Arrange — user-luisadmin es dueño de envíos PRIVATE para two-sum
    // auth.userId ya es 'user-luisadmin' por el beforeEach
    renderPage()

    // Assert — la condición sub.submittedBy.id === user.id && visibility === PRIVATE se cumple
    // para al menos uno de los envíos; usamos getAllByText porque puede haber varios PRIVATE
    await waitFor(() => {
      const badges = screen.getAllByText('Privado')
      expect(badges.length).toBeGreaterThan(0)
    })
  })

  it('no muestra "Privado" para los envíos PRIVATE de otro usuario', async () => {
    // Arrange — el token sigue siendo luisadmin (MSW devuelve envíos PRIVATE de luisadmin)
    // pero la UI ve a un usuario diferente → la condición sub.submittedBy.id === user.id falla
    auth.userId = 'user-other'
    renderPage()

    // Assert — la tabla carga pero ningún badge "Privado" aparece porque el id no coincide
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
    })
    expect(screen.queryAllByText('Privado')).toHaveLength(0)
  })
})
