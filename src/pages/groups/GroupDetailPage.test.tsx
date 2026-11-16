import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser, mockGroupDetails } from '@/mocks/data'
import type { User } from '@/types/user'
import { GroupDetailPage } from './GroupDetailPage'

const toastSpy = vi.fn()

vi.mock('@/hooks/useToastContext', () => ({
  useToastContext: () => ({ toast: toastSpy }),
}))

vi.mock('@/hooks/useContestSession', () => ({
  useContestSession: () => ({ contest: null }),
}))

// Mutable so individual tests can switch to a different role
let _authUser: User = { ...mockCurrentUser }

const mockLogout = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: _authUser,
    isLoading: false,
    isAuthenticated: true,
    hasRole: (role: string | string[]) => {
      const roles = Array.isArray(role) ? role : [role]
      return roles.includes(_authUser.role)
    },
    logout: mockLogout,
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
    mockLogout.mockClear()
    _authUser = { ...mockCurrentUser }
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
    // Arrange — group-1 has 'carloscp' as a member (distinct from the navbar user 'luisadmin')
    const user = userEvent.setup()
    renderPage('group-1')

    // Act — navigate to Miembros tab (default tab is 'info')
    await waitFor(() => expect(screen.getByRole('tab', { name: /miembros/i })).toBeInTheDocument())
    await user.click(screen.getByRole('tab', { name: /miembros/i }))

    // Assert — '@carloscp' only appears in the members list, never in the navbar
    await waitFor(() => {
      expect(screen.getByText('@carloscp')).toBeInTheDocument()
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

  it('renders error page on server error', async () => {
    server.use(
      http.get('http://localhost:8080/api/groups/:id', () =>
        HttpResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 }),
      ),
    )
    renderPage('group-1')

    await waitFor(() => {
      expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
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

  it('calls GET /members for a CONTESTANT who is a plain member (not admin/lead)', async () => {
    // Arrange — CONTESTANT member of group-2 (role MEMBER, not LEAD or ADMIN): tests the isMember branch
    _authUser = { ...mockCurrentUser, role: 'CONTESTANT', nickname: 'carloscp' }
    const membersSpy = vi.fn(() =>
      HttpResponse.json({ members: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }),
    )
    server.use(
      http.get('http://localhost:8080/api/groups/group-2/members', membersSpy),
      http.get('http://localhost:8080/api/groups/group-2', () =>
        HttpResponse.json({
          ...mockGroupDetails['group-2'],
          userMembership: { isMember: true, role: 'MEMBER', joinedAt: '2024-09-01T12:00:00Z' },
        }),
      ),
    )
    renderPage('group-2')

    await waitFor(() => {
      expect(membersSpy).toHaveBeenCalledTimes(1)
    })
  })

  it('calls GET /members for a group member', async () => {
    // Arrange — mockCurrentUser is ADMIN and group-1 userMembership.isMember = true → enabled
    const membersSpy = vi.fn(() =>
      HttpResponse.json({ members: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }),
    )
    server.use(
      http.get('http://localhost:8080/api/groups/group-1/members', membersSpy),
    )
    renderPage('group-1')

    await waitFor(() => {
      expect(membersSpy).toHaveBeenCalledTimes(1)
    })
  })

  it('does not call GET /members for a non-member', async () => {
    // Arrange — group-3 userMembership.isMember = false → query disabled
    _authUser = { ...mockCurrentUser, role: 'CONTESTANT', nickname: 'carloscp' }
    const membersSpy = vi.fn(() =>
      HttpResponse.json({ members: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }),
    )
    server.use(
      http.get('http://localhost:8080/api/groups/group-3/members', membersSpy),
      http.get('http://localhost:8080/api/groups/group-3', () =>
        HttpResponse.json({
          ...mockGroupDetails['group-3'],
          userMembership: { isMember: false, role: null, joinedAt: null },
        }),
      ),
    )
    renderPage('group-3')

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /miembros/i })).toBeInTheDocument()
      expect(membersSpy).not.toHaveBeenCalled()
    })
  })

  it('calls GET /invitations for a group LEAD / platform ADMIN', async () => {
    // Arrange — mockCurrentUser is ADMIN and group-1 userMembership.role = 'LEAD' → canManage = true
    const invitationsSpy = vi.fn(() =>
      HttpResponse.json({ invitations: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }),
    )
    server.use(
      http.get('http://localhost:8080/api/groups/group-1/invitations', invitationsSpy),
    )
    renderPage('group-1')

    // Assert — backend receives the invitations request once the group detail resolves
    await waitFor(() => {
      expect(invitationsSpy).toHaveBeenCalledTimes(1)
    })
  })

  it('does not call GET /invitations for a CONTESTANT member (non-lead)', async () => {
    // Arrange — CONTESTANT member of group-2 (role MEMBER, not LEAD or ADMIN)
    _authUser = { ...mockCurrentUser, role: 'CONTESTANT', nickname: 'carloscp' }
    const invitationsSpy = vi.fn(() =>
      HttpResponse.json({ invitations: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }),
    )
    server.use(
      http.get('http://localhost:8080/api/groups/group-2/invitations', invitationsSpy),
      http.get('http://localhost:8080/api/groups/group-2', () =>
        HttpResponse.json({
          ...mockGroupDetails['group-2'],
          userMembership: { isMember: true, role: 'MEMBER', joinedAt: '2024-09-01T12:00:00Z' },
        }),
      ),
    )
    renderPage('group-2')

    // Wait for the page to fully settle (group detail loaded + any enabled queries fired)
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /miembros/i })).toBeInTheDocument()
      // Assert inside waitFor so re-renders after group load are included in the check
      expect(invitationsSpy).not.toHaveBeenCalled()
    })
  })

  it('does not show "Solicitudes" tab for CONTESTANT member (non-lead)', async () => {
    // Override group-2 to use joinPolicy: 'REQUEST' so the tab would be visible if canManage=true
    // This ensures the assertion tests permissions, not joinPolicy
    _authUser = { ...mockCurrentUser, role: 'CONTESTANT', nickname: 'carloscp' }
    server.use(
      http.get('http://localhost:8080/api/groups/group-2', () =>
        HttpResponse.json({
          ...mockGroupDetails['group-2'],
          joinPolicy: 'REQUEST',
          userMembership: { isMember: true, role: 'MEMBER', joinedAt: '2024-09-01T12:00:00Z' },
        }),
      ),
    )
    renderPage('group-2')

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /miembros/i })).toBeInTheDocument()
    })
    expect(screen.queryByRole('tab', { name: /solicitudes/i })).not.toBeInTheDocument()
  })
})
