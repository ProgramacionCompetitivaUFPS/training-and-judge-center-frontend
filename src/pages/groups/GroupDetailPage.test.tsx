import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import { GroupDetailPage } from './GroupDetailPage'

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
    hasRole: (roles: string[]) => roles.includes(mockCurrentUser.role),
    logout: vi.fn(),
  }),
}))

function renderPage(groupId = 'group-1') {
  const queryClient = createTestQueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/groups/${groupId}`]}>
        <Routes>
          <Route path="/groups/:id" element={<GroupDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('GroupDetailPage', () => {
  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    toastSpy.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('renders group name and navigation tabs', async () => {
    // Arrange
    renderPage('group-1')

    // Assert — 'ICPC Colombia' appears in breadcrumb AND page heading (count = 2)
    await waitFor(() => {
      expect(screen.getAllByText('ICPC Colombia')).toHaveLength(2)
      expect(screen.getByRole('tab', { name: /miembros/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /materiales/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /competencias/i })).toBeInTheDocument()
    })
  })

  it('shows member list in members tab', async () => {
    // Arrange
    renderPage('group-1')

    // Assert — mockGroupMembers['group-1'][0].nickname = 'luisadmin'
    await waitFor(() => {
      expect(screen.getByText('luisadmin')).toBeInTheDocument()
    })
  })

  it('shows "Solicitudes" tab for group LEAD / platform ADMIN', async () => {
    // Arrange — mockCurrentUser is ADMIN and group-1 userMembership.role = 'LEAD' → canManage = true
    renderPage('group-1')

    // Assert
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /solicitudes/i })).toBeInTheDocument()
    })
  })

  it('renders 404 page when group does not exist', async () => {
    // Arrange — override handler to return 404 for any group id
    server.use(
      http.get('http://localhost:8080/api/groups/:id', () =>
        HttpResponse.json(
          { error: 'NOT_FOUND', message: 'Grupo no encontrado' },
          { status: 404 },
        ),
      ),
    )
    renderPage('group-nonexistent')

    // Assert — GroupDetailPage renders <NotFoundPage /> which shows "Página no encontrada"
    await waitFor(() => {
      expect(screen.getByText('Página no encontrada')).toBeInTheDocument()
    })
  })
})
