import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { stubEndpoint } from '@/test/hookHarness'
import { groupKeys } from '@/hooks/api/useGroups'
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

// ---------------------------------------------------------------------------
// Acciones de la página: unirse, solicitar, salir, eliminar, miembros, invitaciones
// ---------------------------------------------------------------------------

const API = 'http://localhost:8080/api'
const PAGINATION = { page: 1, limit: 10, total: 2, totalPages: 1 }

function groupDetail(groupId: string, membership: { isMember: boolean; role: 'LEAD' | 'MEMBER' | null }) {
  return {
    ...mockGroupDetails[groupId],
    userMembership: { ...membership, joinedAt: membership.isMember ? '2024-09-01T12:00:00Z' : null },
  }
}

function stubGroup(groupId: string, membership: { isMember: boolean; role: 'LEAD' | 'MEMBER' | null }) {
  server.use(http.get(`${API}/groups/${groupId}`, () => HttpResponse.json(groupDetail(groupId, membership))))
}

function stubMembers() {
  const members = [
    { groupId: 'group-1', userId: 'u9', nickname: 'anacoach', name: 'Ana Coach', role: 'MEMBER', systemRole: 'COACH', joinedAt: '2024-09-01T12:00:00Z' },
    { groupId: 'group-1', userId: 'u10', nickname: 'betolead', name: 'Beto Lead', role: 'LEAD', systemRole: 'COACH', joinedAt: '2024-09-01T12:00:00Z' },
    { groupId: 'group-1', userId: 'u11', nickname: 'carlaest', name: 'Carla Est', role: 'MEMBER', systemRole: 'CONTESTANT', joinedAt: '2024-09-01T12:00:00Z' },
  ]
  server.use(http.get(`${API}/groups/group-1/members`, () => HttpResponse.json({ members, pagination: PAGINATION })))
}

/** Records the request and answers with the given response; returns the calls it received. */
function stubWrite(method: 'post' | 'patch' | 'delete', path: string, response: { status?: number; body?: unknown } = {}) {
  return stubEndpoint(method, path, response)
}

function renderWithGroupsSentinel(groupId: string) {
  const queryClient = createTestQueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/groups/${groupId}`]}>
        <Routes>
          <Route path="/groups/:id" element={<GroupDetailPage />} />
          <Route path="/groups" element={<div>GROUPS_SENTINEL</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function openActionsMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Más acciones' }))
}

describe('GroupDetailPage — acciones de un no miembro', () => {
  beforeEach(() => {
    _authUser = { ...mockCurrentUser, role: 'CONTESTANT' }
    setAccessToken('mock-jwt-token-luisadmin')
    toastSpy.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('se une a un grupo abierto con el botón Unirse y avisa', async () => {
    stubGroup('group-3', { isMember: false, role: null })
    const joined = stubWrite('post', '/groups/group-3/join')
    const user = userEvent.setup()
    renderPage('group-3')

    await user.click(await screen.findByRole('button', { name: 'Unirse' }))

    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith({ variant: 'success', title: 'Te has unido al grupo' }))
    expect(joined).toHaveLength(1)
  })

  it('avisa del error cuando el servidor rechaza la unión', async () => {
    stubGroup('group-3', { isMember: false, role: null })
    stubWrite('post', '/groups/group-3/join', { status: 403, body: { error: 'FORBIDDEN', message: 'No puedes unirte' } })
    const user = userEvent.setup()
    renderPage('group-3')

    await user.click(await screen.findByRole('button', { name: 'Unirse' }))

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'Error al unirse al grupo' })),
    )
  })

  it('envía una solicitud de ingreso con el mensaje escrito y cierra el diálogo', async () => {
    stubGroup('group-1', { isMember: false, role: null })
    server.use(http.get(`${API}/groups/group-1/requests/me`, () => HttpResponse.json({ request: null })))
    const sent = stubWrite('post', '/groups/group-1/requests', { status: 201, body: { id: 'req-9', status: 'PENDING' } })
    const user = userEvent.setup()
    renderPage('group-1')

    await user.click(await screen.findByRole('button', { name: 'Solicitar Ingreso' }))
    await user.type(screen.getByLabelText('Mensaje (opcional)'), '  Quiero entrenar  ')
    await user.click(screen.getByRole('button', { name: 'Enviar solicitud' }))

    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith({ variant: 'success', title: 'Solicitud enviada' }))
    expect(sent[0].body).toEqual({ message: 'Quiero entrenar' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('conserva lo escrito en la solicitud si la consulta del grupo falla un momento y se recupera', async () => {
    stubGroup('group-1', { isMember: false, role: null })
    server.use(http.get(`${API}/groups/group-1/requests/me`, () => HttpResponse.json({ request: null })))
    const queryClient = createTestQueryClient()
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/groups/group-1']}>
          <Routes>
            <Route path="/groups/:id" element={<GroupDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await user.click(await screen.findByRole('button', { name: 'Solicitar Ingreso' }))
    await user.type(screen.getByLabelText('Mensaje (opcional)'), 'Quiero entrenar')

    // A background refresh of the group fails: the page shows the error page and the dialog goes away...
    server.use(http.get(`${API}/groups/group-1`, () => HttpResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })))
    await act(() => queryClient.refetchQueries({ queryKey: groupKeys.detail('group-1') }))
    expect(await screen.findByText('Algo salió mal')).toBeInTheDocument()

    // ...and when it recovers the dialog is still open with what the user had typed
    stubGroup('group-1', { isMember: false, role: null })
    await act(() => queryClient.refetchQueries({ queryKey: groupKeys.detail('group-1') }))
    expect(await screen.findByLabelText('Mensaje (opcional)')).toHaveValue('Quiero entrenar')
  })

  it('envía la solicitud sin cuerpo cuando no se escribe mensaje', async () => {
    stubGroup('group-1', { isMember: false, role: null })
    server.use(http.get(`${API}/groups/group-1/requests/me`, () => HttpResponse.json({ request: null })))
    const sent = stubWrite('post', '/groups/group-1/requests', { status: 201, body: { id: 'req-9', status: 'PENDING' } })
    const user = userEvent.setup()
    renderPage('group-1')

    await user.click(await screen.findByRole('button', { name: 'Solicitar Ingreso' }))
    await user.click(screen.getByRole('button', { name: 'Enviar solicitud' }))

    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0].body).toBeUndefined()
  })

  it('mantiene abierto el diálogo y avisa cuando el servidor rechaza la solicitud', async () => {
    stubGroup('group-1', { isMember: false, role: null })
    server.use(http.get(`${API}/groups/group-1/requests/me`, () => HttpResponse.json({ request: null })))
    stubWrite('post', '/groups/group-1/requests', { status: 409, body: { error: 'ALREADY_REQUESTED', message: 'Ya enviaste una solicitud' } })
    const user = userEvent.setup()
    renderPage('group-1')

    await user.click(await screen.findByRole('button', { name: 'Solicitar Ingreso' }))
    await user.click(screen.getByRole('button', { name: 'Enviar solicitud' }))

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'Error al enviar la solicitud' })),
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('recuerda que la solicitud anterior fue rechazada al volver a pedir ingreso', async () => {
    stubGroup('group-1', { isMember: false, role: null })
    server.use(
      http.get(`${API}/groups/group-1/requests/me`, () =>
        HttpResponse.json({
          request: {
            id: 'req-1',
            groupId: 'group-1',
            requester: { userId: 'u1', nickname: 'luisadmin', name: 'Luis' },
            status: 'REJECTED',
            createdAt: '2025-03-04T10:00:00Z',
          },
        }),
      ),
    )
    const user = userEvent.setup()
    renderPage('group-1')

    await user.click(await screen.findByRole('button', { name: 'Solicitar Ingreso' }))

    expect(await screen.findByText(/Tu solicitud anterior a este grupo fue rechazada/)).toBeInTheDocument()
  })

  it('cancela una solicitud pendiente con Cancelar Solicitud', async () => {
    stubGroup('group-1', { isMember: false, role: null })
    server.use(
      http.get(`${API}/groups/group-1/requests/me`, () =>
        HttpResponse.json({
          request: {
            id: 'req-1',
            groupId: 'group-1',
            requester: { userId: 'u1', nickname: 'luisadmin', name: 'Luis' },
            status: 'PENDING',
            createdAt: '2025-03-04T10:00:00Z',
          },
        }),
      ),
    )
    const cancelled = stubWrite('delete', '/groups/group-1/requests/me')
    const user = userEvent.setup()
    renderPage('group-1')

    await user.click(await screen.findByRole('button', { name: 'Cancelar Solicitud' }))

    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith({ variant: 'success', title: 'Solicitud cancelada' }))
    expect(cancelled).toHaveLength(1)
  })
})

describe('GroupDetailPage — salir y eliminar', () => {
  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    toastSpy.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('un miembro sale del grupo tras confirmar y vuelve al listado de grupos', async () => {
    _authUser = { ...mockCurrentUser, role: 'CONTESTANT' }
    stubGroup('group-2', { isMember: true, role: 'MEMBER' })
    const left = stubWrite('delete', '/groups/group-2/members/me')
    const user = userEvent.setup()
    renderWithGroupsSentinel('group-2')

    await openActionsMenu(user)
    await user.click(await screen.findByRole('menuitem', { name: /Salir del grupo/ }))
    await user.click(await screen.findByRole('button', { name: 'Salir' }))

    expect(await screen.findByText('GROUPS_SENTINEL')).toBeInTheDocument()
    expect(left).toHaveLength(1)
    expect(toastSpy).toHaveBeenCalledWith({ variant: 'success', title: 'Has salido del grupo' })
  })

  it('explica que no se puede salir siendo el único líder', async () => {
    _authUser = { ...mockCurrentUser, role: 'CONTESTANT' }
    stubGroup('group-2', { isMember: true, role: 'LEAD' })
    stubWrite('delete', '/groups/group-2/members/me', {
      status: 409,
      body: { error: 'CANNOT_LEAVE_AS_LAST_LEAD', message: 'último líder' },
    })
    const user = userEvent.setup()
    renderPage('group-2')

    await openActionsMenu(user)
    await user.click(await screen.findByRole('menuitem', { name: /Salir del grupo/ }))
    await user.click(await screen.findByRole('button', { name: 'Salir' }))

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith({
        variant: 'error',
        title: 'No puedes salir: eres el único líder del grupo',
        description: 'Asigna otro líder primero.',
      }),
    )
  })

  it('muestra un aviso genérico cuando salir falla por otra causa', async () => {
    _authUser = { ...mockCurrentUser, role: 'CONTESTANT' }
    stubGroup('group-2', { isMember: true, role: 'MEMBER' })
    stubWrite('delete', '/groups/group-2/members/me', { status: 500, body: { error: 'SERVER_ERROR', message: 'fallo' } })
    const user = userEvent.setup()
    renderPage('group-2')

    await openActionsMenu(user)
    await user.click(await screen.findByRole('menuitem', { name: /Salir del grupo/ }))
    await user.click(await screen.findByRole('button', { name: 'Salir' }))

    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith({ variant: 'error', title: 'Error al salir del grupo' }))
  })

  it('no ofrece salir del grupo global', async () => {
    _authUser = { ...mockCurrentUser, role: 'CONTESTANT' }
    stubGroup('group-global', { isMember: true, role: 'MEMBER' })
    renderPage('group-global')
    await screen.findAllByText('Training Center Global')

    expect(screen.queryByRole('button', { name: 'Más acciones' })).not.toBeInTheDocument()
  })

  it('un líder elimina el grupo escribiendo su nombre y vuelve al listado', async () => {
    _authUser = { ...mockCurrentUser }
    stubGroup('group-1', { isMember: true, role: 'LEAD' })
    stubEndpoint('get', '/groups/group-1/deletion-impact', {
      body: { contests: 1, activeContests: 0, materials: 2, members: 5, submissions: 0 },
    })
    const deleted = stubWrite('delete', '/groups/group-1')
    const user = userEvent.setup()
    renderWithGroupsSentinel('group-1')

    await openActionsMenu(user)
    await user.click(await screen.findByRole('menuitem', { name: /Eliminar/ }))
    await screen.findByText(/Se eliminan/)
    await user.type(screen.getByPlaceholderText('Nombre del grupo'), 'ICPC Colombia')
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText('GROUPS_SENTINEL')).toBeInTheDocument()
    expect(deleted[0].body).toEqual({ confirmationName: 'ICPC Colombia' })
    expect(toastSpy).toHaveBeenCalledWith({ variant: 'success', title: 'Grupo eliminado' })
  })

  it('avisa cuando el servidor rechaza la eliminación y se queda en la página', async () => {
    _authUser = { ...mockCurrentUser }
    stubGroup('group-1', { isMember: true, role: 'LEAD' })
    stubEndpoint('get', '/groups/group-1/deletion-impact', {
      body: { contests: 0, activeContests: 0, materials: 0, members: 1, submissions: 0 },
    })
    stubWrite('delete', '/groups/group-1', { status: 403, body: { error: 'FORBIDDEN', message: 'no puedes' } })
    const user = userEvent.setup()
    renderWithGroupsSentinel('group-1')

    await openActionsMenu(user)
    await user.click(await screen.findByRole('menuitem', { name: /Eliminar/ }))
    await screen.findByText(/Se eliminan/)
    await user.type(screen.getByPlaceholderText('Nombre del grupo'), 'ICPC Colombia')
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'Error al eliminar grupo' })),
    )
    expect(screen.queryByText('GROUPS_SENTINEL')).not.toBeInTheDocument()
  })
})

describe('GroupDetailPage — gestión de miembros y solicitudes', () => {
  beforeEach(() => {
    _authUser = { ...mockCurrentUser }
    setAccessToken('mock-jwt-token-luisadmin')
    toastSpy.mockClear()
    stubGroup('group-1', { isMember: true, role: 'LEAD' })
    stubMembers()
  })
  afterEach(() => clearAccessToken())

  async function openMembersTab(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole('tab', { name: /miembros/i }))
    await screen.findByText('@anacoach')
  }

  it('ofrece hacer líder a un coach miembro y lo cambia con PATCH', async () => {
    const changed = stubWrite('patch', '/groups/group-1/members/anacoach', { body: { nickname: 'anacoach', role: 'LEAD' } })
    const user = userEvent.setup()
    renderPage('group-1')
    await openMembersTab(user)

    await user.click(screen.getAllByTitle('Hacer líder')[0])

    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith({ variant: 'success', title: 'Rol actualizado' }))
    expect(changed[0].body).toEqual({ role: 'LEAD' })
  })

  it('ofrece hacer miembro a un líder y lo cambia con PATCH', async () => {
    const changed = stubWrite('patch', '/groups/group-1/members/betolead', { body: { nickname: 'betolead', role: 'MEMBER' } })
    const user = userEvent.setup()
    renderPage('group-1')
    await openMembersTab(user)

    await user.click(screen.getByTitle('Hacer miembro'))

    await waitFor(() => expect(changed).toHaveLength(1))
    expect(changed[0].body).toEqual({ role: 'MEMBER' })
  })

  it('no permite hacer líder a un competidor (botón deshabilitado)', async () => {
    const user = userEvent.setup()
    renderPage('group-1')
    await openMembersTab(user)

    expect(screen.getByTitle('Solo Coaches y Administradores pueden ser líderes')).toBeDisabled()
  })

  it('avisa del error cuando el cambio de rol falla', async () => {
    stubWrite('patch', '/groups/group-1/members/anacoach', { status: 403, body: { error: 'FORBIDDEN', message: 'no' } })
    const user = userEvent.setup()
    renderPage('group-1')
    await openMembersTab(user)

    await user.click(screen.getAllByTitle('Hacer líder')[0])

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'Error al cambiar rol' })),
    )
  })

  it('elimina a un miembro tras confirmar', async () => {
    const removed = stubWrite('delete', '/groups/group-1/members/anacoach')
    const user = userEvent.setup()
    renderPage('group-1')
    await openMembersTab(user)

    await user.click(screen.getAllByTitle('Eliminar')[0])
    expect(await screen.findByText('¿Eliminar a @anacoach del grupo?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith({ variant: 'success', title: 'Miembro eliminado' }))
    expect(removed).toHaveLength(1)
  })

  it('no elimina a nadie si se cancela la confirmación', async () => {
    const removed = stubWrite('delete', '/groups/group-1/members/anacoach')
    const user = userEvent.setup()
    renderPage('group-1')
    await openMembersTab(user)

    await user.click(screen.getAllByTitle('Eliminar')[0])
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByText('¿Eliminar a @anacoach del grupo?')).not.toBeInTheDocument())
    expect(removed).toHaveLength(0)
  })

  it('agrega un miembro por nickname con el rol elegido', async () => {
    server.use(
      http.get(`${API}/users/search`, () =>
        HttpResponse.json({ users: [{ id: 'u20', nickname: 'nuevo', name: 'Nuevo Usuario' }] }),
      ),
    )
    const added = stubWrite('post', '/groups/group-1/members', { status: 201, body: { nickname: 'nuevo', role: 'MEMBER' } })
    const user = userEvent.setup()
    renderPage('group-1')

    await openActionsMenu(user)
    await user.click(await screen.findByRole('menuitem', { name: /Agregar miembro/ }))
    await user.type(await screen.findByPlaceholderText('Buscar usuario por nombre o nickname...'), 'nuevo')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith({ variant: 'success', title: 'Miembro agregado' }))
    expect(added[0].body).toEqual({ nickname: 'nuevo', role: 'MEMBER' })
  })

  it('mantiene deshabilitado Agregar mientras no hay nickname', async () => {
    const user = userEvent.setup()
    renderPage('group-1')

    await openActionsMenu(user)
    await user.click(await screen.findByRole('menuitem', { name: /Agregar miembro/ }))

    expect(await screen.findByRole('button', { name: 'Agregar' })).toBeDisabled()
  })

  it('avisa del error cuando agregar un miembro falla', async () => {
    stubWrite('post', '/groups/group-1/members', { status: 404, body: { error: 'USER_NOT_FOUND', message: 'no existe' } })
    const user = userEvent.setup()
    renderPage('group-1')

    await openActionsMenu(user)
    await user.click(await screen.findByRole('menuitem', { name: /Agregar miembro/ }))
    await user.type(await screen.findByPlaceholderText('Buscar usuario por nombre o nickname...'), 'fantasma')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'Error al agregar miembro' })),
    )
  })

  describe('solicitudes de ingreso', () => {
    beforeEach(() => {
      server.use(
        http.get(`${API}/groups/group-1/requests`, () =>
          HttpResponse.json({
            requests: [
              {
                id: 'req-77',
                groupId: 'group-1',
                requester: { userId: 'u30', nickname: 'aspirante', name: 'Aspirante Uno' },
                status: 'PENDING',
                createdAt: '2025-03-04T10:00:00Z',
              },
            ],
            pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
          }),
        ),
      )
    })

    it('aprueba una solicitud con PATCH y avisa', async () => {
      const processed = stubWrite('patch', '/groups/group-1/requests/req-77', { body: { id: 'req-77', status: 'APPROVED' } })
      const user = userEvent.setup()
      renderPage('group-1')
      await user.click(await screen.findByRole('tab', { name: /solicitudes/i }))

      await user.click(await screen.findByTitle('Aprobar'))

      await waitFor(() => expect(toastSpy).toHaveBeenCalledWith({ variant: 'success', title: 'Solicitud aprobada' }))
      expect(processed[0].body).toEqual({ status: 'APPROVED' })
    })

    it('rechaza una solicitud con PATCH y avisa', async () => {
      const processed = stubWrite('patch', '/groups/group-1/requests/req-77', { body: { id: 'req-77', status: 'REJECTED' } })
      const user = userEvent.setup()
      renderPage('group-1')
      await user.click(await screen.findByRole('tab', { name: /solicitudes/i }))

      await user.click(await screen.findByTitle('Rechazar'))

      await waitFor(() => expect(toastSpy).toHaveBeenCalledWith({ variant: 'success', title: 'Solicitud rechazada' }))
      expect(processed[0].body).toEqual({ status: 'REJECTED' })
    })

    it('avisa del error cuando no se puede procesar la solicitud', async () => {
      stubWrite('patch', '/groups/group-1/requests/req-77', { status: 409, body: { error: 'ALREADY_PROCESSED', message: 'ya procesada' } })
      const user = userEvent.setup()
      renderPage('group-1')
      await user.click(await screen.findByRole('tab', { name: /solicitudes/i }))

      await user.click(await screen.findByTitle('Aprobar'))

      await waitFor(() =>
        expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'Error al procesar solicitud' })),
      )
    })
  })
})

describe('GroupDetailPage — invitaciones', () => {
  beforeEach(() => {
    _authUser = { ...mockCurrentUser }
    setAccessToken('mock-jwt-token-luisadmin')
    toastSpy.mockClear()
    stubGroup('group-4', { isMember: true, role: 'LEAD' })
    server.use(
      http.get(`${API}/groups/group-4/members`, () =>
        HttpResponse.json({ members: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }),
      ),
    )
  })
  afterEach(() => clearAccessToken())

  async function openInviteByEmail(user: ReturnType<typeof userEvent.setup>) {
    await openActionsMenu(user)
    await user.click(await screen.findByRole('menuitem', { name: /Invitar usuario/ }))
    await user.click(await screen.findByRole('button', { name: 'Por correo' }))
  }

  it('invita por correo y muestra el enlace de aceptación generado', async () => {
    const invited = stubWrite('post', '/groups/group-4/invitations', { status: 201, body: { id: 'inv-55', status: 'PENDING' } })
    const user = userEvent.setup()
    renderPage('group-4')
    await openInviteByEmail(user)

    await user.type(screen.getByLabelText('Correo electrónico'), 'nuevo@correo.com')
    await user.click(screen.getByRole('button', { name: 'Enviar invitación' }))

    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith({ variant: 'success', title: 'Invitación enviada' }))
    expect(invited[0].body).toEqual({ userEmail: 'nuevo@correo.com' })
    expect(screen.getByDisplayValue(`${window.location.origin}/groups/group-4/invitations/inv-55/accept`)).toBeInTheDocument()
  })

  it('copia el enlace de invitación al portapapeles', async () => {
    stubWrite('post', '/groups/group-4/invitations', { status: 201, body: { id: 'inv-55', status: 'PENDING' } })
    const user = userEvent.setup()
    renderPage('group-4')
    await openInviteByEmail(user)
    await user.type(screen.getByLabelText('Correo electrónico'), 'nuevo@correo.com')
    await user.click(screen.getByRole('button', { name: 'Enviar invitación' }))
    await screen.findByText(/Invitación generada/)

    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getAllByRole('button').find((b) => b.querySelector('svg') && !b.textContent) as HTMLElement)

    expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}/groups/group-4/invitations/inv-55/accept`)
    expect(toastSpy).toHaveBeenCalledWith({ variant: 'success', title: 'Enlace copiado' })
  })

  it('explica que el usuario invitado ya es miembro cuando el servidor responde ALREADY_MEMBER', async () => {
    stubWrite('post', '/groups/group-4/invitations', { status: 409, body: { error: 'ALREADY_MEMBER', message: 'Ya eres miembro' } })
    const user = userEvent.setup()
    renderPage('group-4')
    await openInviteByEmail(user)

    await user.type(screen.getByLabelText('Correo electrónico'), 'miembro@correo.com')
    await user.click(screen.getByRole('button', { name: 'Enviar invitación' }))

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith({
        variant: 'error',
        title: 'Error al enviar invitación',
        description: 'Ese usuario ya es miembro del grupo.',
      }),
    )
  })

  it('mantiene deshabilitado Enviar invitación mientras no hay destinatario', async () => {
    const user = userEvent.setup()
    renderPage('group-4')
    await openInviteByEmail(user)

    expect(screen.getByRole('button', { name: 'Enviar invitación' })).toBeDisabled()
  })

  it('al cancelar el diálogo vuelve al método por nickname la próxima vez', async () => {
    const user = userEvent.setup()
    renderPage('group-4')
    await openInviteByEmail(user)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await openActionsMenu(user)
    await user.click(await screen.findByRole('menuitem', { name: /Invitar usuario/ }))

    expect(await screen.findByPlaceholderText('Buscar usuario por nombre o nickname...')).toBeInTheDocument()
    expect(screen.queryByLabelText('Correo electrónico')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Contenido de cada pestaña
// ---------------------------------------------------------------------------

describe('GroupDetailPage — contenido de las pestañas', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    _authUser = { ...mockCurrentUser }
    setAccessToken('mock-jwt-token-luisadmin')
    toastSpy.mockClear()
  })
  afterEach(() => clearAccessToken())

  function LocationProbe() {
    const location = useLocation()
    return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
  }

  function renderAt(path: string) {
    const queryClient = createTestQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/groups/:id" element={<GroupDetailPage />} />
          </Routes>
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    return queryClient
  }

  function stubGroupDetail(overrides: Record<string, unknown>) {
    server.use(
      http.get(`${API}/groups/group-1`, () =>
        HttpResponse.json({ ...groupDetail('group-1', { isMember: true, role: 'LEAD' }), ...overrides }),
      ),
    )
  }

  const page = (total: number, limit = 10) => ({ page: 1, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) })

  function contestItem(id: string, name: string, status: 'SCHEDULED' | 'ACTIVE' | 'FINISHED') {
    return {
      id,
      name,
      status,
      duration: 7200,
      startTime: '2025-03-04T10:00:00Z',
      participantCount: 12,
      problemCount: 3,
    }
  }

  function stubContests(items: ReturnType<typeof contestItem>[], totalFor?: (status: string | null) => number) {
    const queries: URLSearchParams[] = []
    server.use(
      http.get(`${API}/groups/group-1/contests`, ({ request }) => {
        const params = new URL(request.url).searchParams
        queries.push(params)
        const total = totalFor ? totalFor(params.get('status')) : items.length
        return HttpResponse.json({ items, pagination: page(total, Number(params.get('limit')) || 10) })
      }),
    )
    return queries
  }

  function stubMaterials(titles: string[]) {
    server.use(
      http.get(`${API}/groups/group-1/materials`, () =>
        HttpResponse.json({
          materials: titles.map((title, i) => ({
            id: `mat-${i}`,
            title,
            content: 'contenido',
            tags: [],
            status: 'PUBLISHED',
            pinned: false,
            pinnedAt: null,
            author: { nickname: 'mariacoach', name: 'María Coach' },
            groupId: 'group-1',
            createdAt: '2025-03-01T10:00:00Z',
            updatedAt: '2025-03-01T10:00:00Z',
            publishedAt: '2025-03-01T10:00:00Z',
          })),
          pagination: page(titles.length, 5),
        }),
      ),
    )
  }

  describe('encabezado', () => {
    it('muestra la visibilidad y la política de ingreso del grupo', async () => {
      stubGroupDetail({ visibility: 'HIDDEN', joinPolicy: 'INVITE' })
      renderAt('/groups/group-1')

      expect(await screen.findByText('No visible')).toBeInTheDocument()
      expect(screen.getByText('Invitación')).toBeInTheDocument()
      expect(screen.queryByText('Global')).not.toBeInTheDocument()
    })

    it('marca el grupo global y un gestor no puede editarlo, eliminarlo ni salir de él', async () => {
      stubGroupDetail({ isGlobal: true })
      renderAt('/groups/group-1')

      expect(await screen.findByText('Global')).toBeInTheDocument()
      expect(screen.getByText('Visible')).toBeInTheDocument()
      await user.click(await screen.findByRole('button', { name: 'Más acciones' }))
      expect(await screen.findByRole('menuitem', { name: /Agregar miembro/ })).toBeInTheDocument()
      expect(screen.queryByRole('menuitem', { name: /Editar/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('menuitem', { name: /Eliminar/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('menuitem', { name: /Salir del grupo/ })).not.toBeInTheDocument()
    })

    it('en un grupo normal un líder sí puede editarlo, eliminarlo y salir de él', async () => {
      renderAt('/groups/group-1')

      await user.click(await screen.findByRole('button', { name: 'Más acciones' }))
      expect(await screen.findByRole('menuitem', { name: /Editar/ })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: /Eliminar/ })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: /Salir del grupo/ })).toBeInTheDocument()
    })
  })

  describe('pestaña Información', () => {
    it('muestra la descripción del grupo', async () => {
      renderAt('/groups/group-1')

      expect(await screen.findByRole('heading', { name: 'Descripción' })).toBeInTheDocument()
      expect(screen.getAllByText(/Grupo oficial de entrenamiento para ICPC Colombia/).length).toBeGreaterThan(0)
    })

    it('sin descripción dice «Sin descripción»', async () => {
      stubGroupDetail({ description: null })
      renderAt('/groups/group-1')

      expect(await screen.findByText('Sin descripción')).toBeInTheDocument()
    })

    it('las tarjetas de resumen cuentan miembros, competencias activas, totales y materiales', async () => {
      stubContests([], (status) => (status === 'ACTIVE' ? 3 : 7))
      stubMaterials(['Guía de grafos', 'Notas de DP'])
      renderAt('/groups/group-1')

      // "Materiales" and "Miembros" are also tab names (with their own badge): the card label is the one outside a tab
      const cardOf = (label: string) => screen.getAllByText(label).find((el) => !el.closest('[role="tab"]'))!.parentElement
      await waitFor(() => {
        expect(screen.getByText('Competencias activas').parentElement).toHaveTextContent('3')
        expect(screen.getByText('Competencias totales').parentElement).toHaveTextContent('7')
        expect(cardOf('Materiales')).toHaveTextContent('2')
      })
      expect(cardOf('Miembros')).toHaveTextContent('45')
    })

    it('muestra las fechas de creación y, si existe, la de actualización', async () => {
      stubGroupDetail({ updatedAt: '2025-01-02T10:00:00Z' })
      renderAt('/groups/group-1')

      expect(await screen.findByText(/Creado:/)).toBeInTheDocument()
      expect(screen.getByText(/Actualizado:/)).toBeInTheDocument()
    })

    it('sin fecha de actualización no muestra «Actualizado»', async () => {
      renderAt('/groups/group-1')

      await screen.findByText(/Creado:/)
      expect(screen.queryByText(/Actualizado:/)).not.toBeInTheDocument()
    })

    it('lista a los líderes con su inicial y enlace a su perfil', async () => {
      renderAt('/groups/group-1')

      expect(await screen.findByRole('heading', { name: 'Líderes' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /María Coach/ })).toHaveAttribute('href', '/users/mariacoach')
      expect(screen.getAllByText('Líder')).toHaveLength(3)
      expect(screen.getByText('L')).toBeInTheDocument()
    })

    it('sin líderes no muestra la tarjeta de líderes', async () => {
      stubGroupDetail({ leads: [] })
      renderAt('/groups/group-1')

      await screen.findByRole('heading', { name: 'Descripción' })
      expect(screen.queryByRole('heading', { name: 'Líderes' })).not.toBeInTheDocument()
    })
  })

  describe('pestañas y URL', () => {
    it('abre la pestaña indicada en ?tab=', async () => {
      stubMembers()
      renderAt('/groups/group-1?tab=members')

      expect(await screen.findByText('@anacoach')).toBeInTheDocument()
    })

    it('una pestaña desconocida en ?tab= vuelve a Información', async () => {
      renderAt('/groups/group-1?tab=inexistente')

      expect(await screen.findByRole('heading', { name: 'Descripción' })).toBeInTheDocument()
    })

    it('una pestaña que el usuario no puede ver vuelve a Información', async () => {
      _authUser = { ...mockCurrentUser, role: 'CONTESTANT', nickname: 'carloscp' }
      stubGroup('group-1', { isMember: true, role: 'MEMBER' })
      renderAt('/groups/group-1?tab=invitations')

      expect(await screen.findByRole('heading', { name: 'Descripción' })).toBeInTheDocument()
    })

    it('cambiar de pestaña muestra su contenido y volver a Información la deja por omisión', async () => {
      stubMaterials(['Guía de grafos'])
      renderAt('/groups/group-1')
      await screen.findByRole('heading', { name: 'Descripción' })

      await user.click(screen.getByRole('tab', { name: /materiales/i }))
      expect(await screen.findByText('Guía de grafos')).toBeInTheDocument()
      expect(screen.getByTestId('location')).toHaveTextContent('/groups/group-1?tab=materials')

      await user.click(screen.getByRole('tab', { name: /información/i }))
      expect(await screen.findByRole('heading', { name: 'Descripción' })).toBeInTheDocument()
      expect(screen.getByTestId('location')).toHaveTextContent(/^\/groups\/group-1$/)
    })

    it('la pestaña Solicitudes aparece con política distinta de REQUEST si todavía hay solicitudes', async () => {
      stubGroupDetail({ joinPolicy: 'OPEN' })
      // Only approved requests in the history: nothing pending, so the tab must not depend on the PENDING total
      server.use(
        http.get(`${API}/groups/group-1/requests`, ({ request }) => {
          const unfiltered = !new URL(request.url).searchParams.get('status')
          return HttpResponse.json({ requests: [], pagination: page(unfiltered ? 1 : 0) })
        }),
      )
      renderAt('/groups/group-1')

      expect(await screen.findByRole('tab', { name: /solicitudes/i })).toBeInTheDocument()
    })

    it('la pestaña Solicitudes no aparece con política distinta de REQUEST y sin solicitudes', async () => {
      stubGroupDetail({ joinPolicy: 'OPEN' })
      let unfilteredServed = false
      server.use(
        http.get(`${API}/groups/group-1/requests`, ({ request }) => {
          if (new URL(request.url).searchParams.get('limit') === '1') unfilteredServed = true
          return HttpResponse.json({ requests: [], pagination: page(0) })
        }),
      )
      const queryClient = renderAt('/groups/group-1')

      await screen.findByRole('tab', { name: /invitaciones/i })
      // "Invitaciones" can show up while the requests query is still pending: wait for it to answer
      await waitFor(() => expect(unfilteredServed).toBe(true))
      await waitFor(() => expect(queryClient.isFetching()).toBe(0))
      expect(screen.queryByRole('tab', { name: /solicitudes/i })).not.toBeInTheDocument()
    })
  })

  describe('pestaña Miembros', () => {
    it('quien no es miembro ve que debe serlo para ver la lista y no tiene acciones', async () => {
      _authUser = { ...mockCurrentUser, role: 'CONTESTANT', nickname: 'carloscp' }
      stubGroup('group-1', { isMember: false, role: null })
      renderAt('/groups/group-1?tab=members')

      expect(await screen.findByText('Debes ser miembro de este grupo para ver la lista de miembros.')).toBeInTheDocument()
      expect(screen.queryByRole('columnheader', { name: 'Acciones' })).not.toBeInTheDocument()
    })

    it('un miembro sin permisos ve la lista sin la columna de acciones', async () => {
      _authUser = { ...mockCurrentUser, role: 'CONTESTANT', nickname: 'carloscp' }
      stubGroup('group-1', { isMember: true, role: 'MEMBER' })
      stubMembers()
      renderAt('/groups/group-1?tab=members')

      expect(await screen.findByText('@anacoach')).toBeInTheDocument()
      expect(screen.getByText('Líder', { selector: 'span, div' })).toBeInTheDocument()
      expect(screen.queryByRole('columnheader', { name: 'Acciones' })).not.toBeInTheDocument()
    })

    it('un grupo sin miembros dice «No hay miembros»', async () => {
      server.use(http.get(`${API}/groups/group-1/members`, () => HttpResponse.json({ members: [], pagination: page(0) })))
      renderAt('/groups/group-1?tab=members')

      expect(await screen.findByText('No hay miembros')).toBeInTheDocument()
    })

    it('explica por qué un competidor no puede ser líder', async () => {
      stubMembers()
      renderAt('/groups/group-1?tab=members')

      await screen.findByText('@carlaest')
      expect(screen.getByTitle('Solo Coaches y Administradores pueden ser líderes')).toBeDisabled()
      expect(screen.getAllByTitle('Hacer líder')).toHaveLength(1)
      expect(screen.getAllByTitle('Hacer miembro')).toHaveLength(1)
    })
  })

  describe('pestaña Solicitudes', () => {
    const requests = [
      { id: 'r1', groupId: 'group-1', requester: { userId: 'u30', nickname: 'aspirante', name: 'Aspirante Uno' }, message: 'Quiero unirme', status: 'PENDING', createdAt: '2025-03-04T10:00:00Z' },
      { id: 'r2', groupId: 'group-1', requester: { userId: 'u31', nickname: 'otro', name: 'Otro Dos' }, status: 'APPROVED', createdAt: '2025-03-03T10:00:00Z' },
      { id: 'r3', groupId: 'group-1', requester: { userId: 'u32', nickname: 'tercero', name: 'Tercero' }, status: 'REJECTED', createdAt: '2025-03-02T10:00:00Z' },
    ]

    function stubRequestsByStatus() {
      server.use(
        http.get(`${API}/groups/group-1/requests`, ({ request }) => {
          const status = new URL(request.url).searchParams.get('status')
          const shown = status ? requests.filter((r) => r.status === status) : requests
          return HttpResponse.json({ requests: shown, pagination: page(shown.length) })
        }),
      )
    }

    it('lista las solicitudes con su estado y mensaje, y solo la pendiente tiene acciones', async () => {
      stubRequestsByStatus()
      renderAt('/groups/group-1?tab=requests')

      // The page opens filtered by PENDING: only that request is listed
      expect(await screen.findByText('Quiero unirme')).toBeInTheDocument()
      expect(screen.queryByText('Aprobada')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Todas' }))

      expect(await screen.findByText('Aprobada')).toBeInTheDocument()
      expect(screen.getByText('Rechazada')).toBeInTheDocument()
      expect(screen.getByText('Pendiente', { selector: 'span, div' })).toBeInTheDocument()
      expect(screen.getAllByText('—')).toHaveLength(2)
      const rowOf = (text: string) => within(screen.getByText(text).closest('tr')!)
      expect(rowOf('Quiero unirme').getByTitle('Aprobar')).toBeInTheDocument()
      expect(rowOf('Quiero unirme').getByTitle('Rechazar')).toBeInTheDocument()
      for (const name of ['Otro Dos', 'Tercero']) {
        expect(rowOf(name).queryByTitle('Aprobar')).not.toBeInTheDocument()
        expect(rowOf(name).queryByTitle('Rechazar')).not.toBeInTheDocument()
      }
    })

    it('por omisión pide solo las pendientes y cada filtro pide su estado', async () => {
      const statuses: (string | null)[] = []
      server.use(
        http.get(`${API}/groups/group-1/requests`, ({ request }) => {
          const params = new URL(request.url).searchParams
          if (params.get('limit') !== '1') statuses.push(params.get('status'))
          return HttpResponse.json({ requests: [], pagination: page(0) })
        }),
      )
      renderAt('/groups/group-1?tab=requests')
      await screen.findByText('No hay solicitudes con este estado')

      await user.click(screen.getByRole('button', { name: 'Aprobadas' }))
      await user.click(screen.getByRole('button', { name: 'Todas' }))

      await waitFor(() => expect(statuses).toEqual(['PENDING', 'APPROVED', null]))
      expect(await screen.findByText('No hay solicitudes')).toBeInTheDocument()
    })
  })

  describe('pestaña Invitaciones', () => {
    it('lista las invitaciones con su invitado, correo y expiración', async () => {
      server.use(
        http.get(`${API}/groups/group-1/invitations`, () =>
          HttpResponse.json({
            invitations: [
              { id: 'i1', invitee: { name: 'Ana Invitada', nickname: 'anainv', email: 'ana@example.com' }, expiresAt: '2025-06-01T00:00:00Z' },
              { id: 'i2', invitee: null, expiresAt: '2025-06-02T00:00:00Z' },
            ],
            pagination: page(2),
          }),
        ),
      )
      renderAt('/groups/group-1?tab=invitations')

      expect(await screen.findByText('Ana Invitada')).toBeInTheDocument()
      expect(screen.getByText('@anainv')).toBeInTheDocument()
      expect(screen.getByText('ana@example.com')).toBeInTheDocument()
      expect(screen.getByText('Invitación general')).toBeInTheDocument()
      expect(screen.getByText('—')).toBeInTheDocument()
    })

    it('sin invitaciones dice que no hay pendientes', async () => {
      server.use(
        http.get(`${API}/groups/group-1/invitations`, () => HttpResponse.json({ invitations: [], pagination: page(0) })),
      )
      renderAt('/groups/group-1?tab=invitations')

      expect(await screen.findByText('No hay invitaciones pendientes')).toBeInTheDocument()
    })
  })

  describe('pestaña Materiales', () => {
    it('lista los últimos materiales y un líder puede crear uno nuevo', async () => {
      stubMaterials(['Guía de grafos', 'Notas de DP'])
      renderAt('/groups/group-1?tab=materials')

      expect(await screen.findByText('Guía de grafos')).toBeInTheDocument()
      expect(screen.getByText('Notas de DP')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Nuevo material' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Ver todos' })).toBeInTheDocument()
    })

    it('sin materiales un líder puede crear el primero', async () => {
      stubMaterials([])
      renderAt('/groups/group-1?tab=materials')

      expect(await screen.findByText('No hay materiales en este grupo')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Crear primer material' })).toBeInTheDocument()
    })

    it('un miembro sin permisos no ve los botones de crear', async () => {
      _authUser = { ...mockCurrentUser, role: 'CONTESTANT', nickname: 'carloscp' }
      stubGroup('group-1', { isMember: true, role: 'MEMBER' })
      stubMaterials([])
      renderAt('/groups/group-1?tab=materials')

      expect(await screen.findByText('No hay materiales en este grupo')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Crear primer material' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Nuevo material' })).not.toBeInTheDocument()
    })
  })

  describe('pestaña Competencias', () => {
    it('muestra cada competencia con su estado, duración, participantes y problemas', async () => {
      stubContests([contestItem('c1', 'Semanal 12', 'ACTIVE'), contestItem('c2', 'Reto clásico', 'FINISHED')])
      renderAt('/groups/group-1?tab=contests')

      expect(await screen.findByRole('link', { name: 'Semanal 12' })).toHaveAttribute('href', '/groups/group-1/contests/c1')
      expect(screen.getByRole('link', { name: 'Reto clásico' })).toBeInTheDocument()
      expect(screen.getAllByText('3 problemas')).toHaveLength(2)
      expect(screen.getAllByText('12')).toHaveLength(2)
      expect(screen.getByRole('button', { name: 'Nueva competencia' })).toBeInTheDocument()
    })

    it('un filtro de estado pide ese estado y, sin resultados, explica que no hay con ese estado', async () => {
      const queries = stubContests([])
      renderAt('/groups/group-1?tab=contests')
      expect(await screen.findByText('No hay competencias en este grupo')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'En curso' }))

      expect(await screen.findByText('No hay competencias con este estado')).toBeInTheDocument()
      await waitFor(() => {
        expect(queries.some((q) => q.get('status') === 'ACTIVE' && q.get('sortBy') === 'startTime' && q.get('order') === 'desc')).toBe(true)
      })
      expect(screen.queryByRole('button', { name: 'Crear primera competencia' })).not.toBeInTheDocument()
    })

    it('sin competencias ni filtro un líder puede crear la primera', async () => {
      stubContests([])
      renderAt('/groups/group-1?tab=contests')

      expect(await screen.findByRole('button', { name: 'Crear primera competencia' })).toBeInTheDocument()
    })

    it('un miembro sin permisos no ve los botones de crear competencia', async () => {
      _authUser = { ...mockCurrentUser, role: 'CONTESTANT', nickname: 'carloscp' }
      stubGroup('group-1', { isMember: true, role: 'MEMBER' })
      stubContests([])
      renderAt('/groups/group-1?tab=contests')

      expect(await screen.findByText('No hay competencias en este grupo')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Nueva competencia' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Crear primera competencia' })).not.toBeInTheDocument()
    })
  })

  describe('acción principal y menú', () => {
    it('un miembro de un grupo por invitación no tiene botón de ingreso', async () => {
      _authUser = { ...mockCurrentUser, role: 'CONTESTANT', nickname: 'carloscp' }
      server.use(
        http.get(`${API}/groups/group-1`, () =>
          HttpResponse.json({
            ...groupDetail('group-1', { isMember: false, role: null }),
            joinPolicy: 'INVITE',
          }),
        ),
      )
      renderAt('/groups/group-1')

      await screen.findByRole('heading', { name: 'Descripción' })
      expect(screen.queryByRole('button', { name: 'Unirse' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Solicitar Ingreso' })).not.toBeInTheDocument()
    })

    it('un líder de un grupo por invitación puede invitar usuarios', async () => {
      stubGroupDetail({ joinPolicy: 'INVITE' })
      renderAt('/groups/group-1')

      await user.click(await screen.findByRole('button', { name: 'Más acciones' }))
      expect(await screen.findByRole('menuitem', { name: /Invitar usuario/ })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: /Agregar miembro/ })).toBeInTheDocument()
    })

    it('un líder de un grupo abierto no ve «Invitar usuario»', async () => {
      stubGroupDetail({ joinPolicy: 'OPEN' })
      renderAt('/groups/group-1')

      await user.click(await screen.findByRole('button', { name: 'Más acciones' }))
      expect(await screen.findByRole('menuitem', { name: /Agregar miembro/ })).toBeInTheDocument()
      expect(screen.queryByRole('menuitem', { name: /Invitar usuario/ })).not.toBeInTheDocument()
    })
  })
})
