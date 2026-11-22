import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { stubEndpoint } from '@/test/hookHarness'
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
