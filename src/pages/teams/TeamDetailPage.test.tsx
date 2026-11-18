import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import { TeamDetailPage } from './TeamDetailPage'

vi.mock('@/hooks/useContestSession', () => ({
  useContestSession: () => ({ contest: null }),
}))

const mockLogout = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    isLoading: false,
    isAuthenticated: true,
    hasRole: () => true,
    lastNickname: mockCurrentUser.nickname,
    logout: mockLogout,
  }),
}))

const mockToast = vi.fn()
vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: mockToast }),
}))

function renderPage(teamId = 'team-1') {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/teams/${teamId}`]}>
        <Routes>
          <Route path="/teams/:teamId" element={<TeamDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TeamDetailPage', () => {
  beforeEach(() => {
    mockLogout.mockClear()
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('renders team name and member list', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Competitive Coders' })).toBeInTheDocument()
    expect(await screen.findByText('carloscp')).toBeInTheDocument()
  })

  it('shows invite member button', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Competitive Coders' })
    expect(screen.getByRole('button', { name: /invitar/i })).toBeInTheDocument()
  })

  it('shows error message on server failure', async () => {
    server.use(
      http.get('http://localhost:8080/api/teams/:teamId', () =>
        HttpResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 }),
      ),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/no se pudo cargar el equipo/i)).toBeInTheDocument()
    })
  })
})

describe('TeamDetailPage rename', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('lets a member rename the team and confirms with a toast', async () => {
    // Arrange
    renderPage()
    await screen.findByRole('heading', { name: 'Competitive Coders' })

    // Act
    await user.click(screen.getByRole('button', { name: 'Cambiar nombre del equipo' }))
    const input = screen.getByRole('textbox', { name: 'Nombre del equipo' })
    await user.clear(input)
    await user.type(input, 'Nuevo Nombre')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    // Assert
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success', title: 'Nombre actualizado' })),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('starts the dialog with the current name', async () => {
    // Arrange
    renderPage()
    await screen.findByRole('heading', { name: 'Competitive Coders' })

    // Act
    await user.click(screen.getByRole('button', { name: 'Cambiar nombre del equipo' }))

    // Assert
    expect(screen.getByRole('textbox', { name: 'Nombre del equipo' })).toHaveValue('Competitive Coders')
  })

  it('shows the name-taken error under the field and keeps the dialog open', async () => {
    // Arrange
    renderPage()
    await screen.findByRole('heading', { name: 'Competitive Coders' })

    // Act: "Algorithm Masters" belongs to team-2
    await user.click(screen.getByRole('button', { name: 'Cambiar nombre del equipo' }))
    const input = screen.getByRole('textbox', { name: 'Nombre del equipo' })
    await user.clear(input)
    await user.type(input, 'Algorithm Masters')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    // Assert
    expect(await screen.findByText('Ya existe un equipo con este nombre')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(mockToast).not.toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }))
  })

  it('does not call the server when the name is empty', async () => {
    // Arrange
    let called = false
    server.use(
      http.patch('http://localhost:8080/api/teams/:teamId', () => {
        called = true
        return HttpResponse.json({ id: 'team-1', name: 'x' })
      }),
    )
    renderPage()
    await screen.findByRole('heading', { name: 'Competitive Coders' })

    // Act
    await user.click(screen.getByRole('button', { name: 'Cambiar nombre del equipo' }))
    await user.clear(screen.getByRole('textbox', { name: 'Nombre del equipo' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    // Assert
    expect(await screen.findByText('El nombre del equipo es requerido')).toBeInTheDocument()
    expect(called).toBe(false)
  })

  it('hides the rename button from someone who is not on the team', async () => {
    // Arrange: luisadmin is not a member of team-3
    renderPage('team-3')

    // Act
    await screen.findByRole('heading', { name: 'Code Warriors' })

    // Assert
    expect(screen.queryByRole('button', { name: 'Cambiar nombre del equipo' })).not.toBeInTheDocument()
  })
})

describe('TeamDetailPage remove member', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('removes another member after confirming and says so', async () => {
    // Arrange
    let removed = ''
    server.use(
      http.delete('http://localhost:8080/api/teams/:teamId/members/:userId', ({ params }) => {
        removed = String(params.userId)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderPage()
    await screen.findByText('carloscp')

    // Act
    await user.click(screen.getByRole('button', { name: 'Quitar a carloscp del equipo' }))
    await user.click(await screen.findByRole('button', { name: 'Quitar del equipo' }))

    // Assert
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success', title: 'Miembro quitado' })),
    )
    expect(removed).toBe('u3')
  })

  it('does not remove anyone until the dialog is confirmed', async () => {
    // Arrange
    let called = false
    server.use(
      http.delete('http://localhost:8080/api/teams/:teamId/members/:userId', () => {
        called = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderPage()
    await screen.findByText('carloscp')

    // Act
    await user.click(screen.getByRole('button', { name: 'Quitar a carloscp del equipo' }))
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))

    // Assert
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(called).toBe(false)
  })

  it('does not offer to remove yourself', async () => {
    // Arrange
    renderPage()
    await screen.findByText('carloscp')

    // Assert: other members have the button, the logged-in user does not
    expect(screen.getByRole('button', { name: 'Quitar a anagarcia del equipo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Quitar a luisadmin del equipo' })).not.toBeInTheDocument()
  })

  it('warns which registrations would be cancelled, asking about that member', async () => {
    // Arrange
    let asked: string | null = null
    server.use(
      http.get('http://localhost:8080/api/teams/:teamId/leave-impact', ({ request }) => {
        asked = new URL(request.url).searchParams.get('userId')
        return HttpResponse.json({ registrationsToCancel: [{ contestId: 'c1', contestName: 'Taller ICPC', groupId: 'g1' }] })
      }),
    )
    renderPage()
    await screen.findByText('carloscp')

    // Act
    await user.click(screen.getByRole('button', { name: 'Quitar a carloscp del equipo' }))

    // Assert
    expect(await screen.findByRole('link', { name: 'Taller ICPC' })).toBeInTheDocument()
    expect(asked).toBe('u3')
  })

  it('explains why a member in a running contest cannot be removed yet', async () => {
    // Arrange
    server.use(
      http.delete('http://localhost:8080/api/teams/:teamId/members/:userId', () =>
        HttpResponse.json({ error: 'CANNOT_REMOVE_DURING_ACTIVE_CONTEST', message: 'x' }, { status: 409 }),
      ),
    )
    renderPage()
    await screen.findByText('carloscp')

    // Act
    await user.click(screen.getByRole('button', { name: 'Quitar a carloscp del equipo' }))
    await user.click(await screen.findByRole('button', { name: 'Quitar del equipo' }))

    // Assert
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'error', title: 'No puedes quitar a carloscp todavía' }),
      ),
    )
    expect(mockToast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Miembro quitado' }))
  })

  it('hides the remove buttons from someone who is not on the team', async () => {
    // Arrange: luisadmin is not a member of team-3
    renderPage('team-3')

    // Act
    await screen.findByText('sofiarodriguez')

    // Assert
    expect(screen.queryByRole('button', { name: /^Quitar a .* del equipo$/ })).not.toBeInTheDocument()
  })
})
