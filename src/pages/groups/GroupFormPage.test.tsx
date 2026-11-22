import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { server } from '@/mocks/server'
import { stubEndpoint } from '@/test/hookHarness'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import { GroupFormPage } from './GroupFormPage'

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

function renderCreate() {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={['/groups/new']}>
        <Routes>
          <Route path="/groups/new" element={<GroupFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function renderEdit(groupId = 'group-1') {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/groups/${groupId}/edit`]}>
        <Routes>
          <Route path="/groups/:id/edit" element={<GroupFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('GroupFormPage', () => {
  beforeEach(() => {
    mockLogout.mockClear()
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('renders empty form in create mode', () => {
    renderCreate()
    expect(screen.getByRole('textbox', { name: /nombre/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /crear grupo/i })).toBeInTheDocument()
  })

  it('pre-fills name in edit mode', async () => {
    renderEdit()
    expect(await screen.findByDisplayValue('ICPC Colombia')).toBeInTheDocument()
  })

  it('shows validation error on empty name submit', async () => {
    const user = userEvent.setup()
    renderCreate()
    await user.click(screen.getByRole('button', { name: /crear grupo/i }))
    expect(await screen.findByText('El nombre es requerido')).toBeInTheDocument()
  })

  it('shows success toast after creating a group', async () => {
    const user = userEvent.setup()
    renderCreate()
    await user.type(screen.getByRole('textbox', { name: /nombre/i }), 'Mi Nuevo Grupo')
    await user.click(screen.getByRole('button', { name: /crear grupo/i }))
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'success' }),
      )
    })
  })
})

// ---------------------------------------------------------------------------
// Envío del formulario, visibilidad, miembros iniciales y navegación
// ---------------------------------------------------------------------------

function renderWithSentinels(path: string) {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/groups/new" element={<GroupFormPage />} />
          <Route path="/groups/:id/edit" element={<GroupFormPage />} />
          <Route path="/groups/:id" element={<div>GROUP_DETAIL_SENTINEL</div>} />
          <Route path="/groups" element={<div>GROUPS_SENTINEL</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('GroupFormPage — crear', () => {
  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('crea el grupo con los datos escritos y los miembros iniciales y abre su detalle', async () => {
    const created = stubEndpoint('post', '/groups', { status: 201, body: { id: 'group-new', name: 'Mi Nuevo Grupo' } })
    const user = userEvent.setup()
    renderWithSentinels('/groups/new')

    await user.type(screen.getByLabelText('Nombre del grupo'), 'Mi Nuevo Grupo')
    await user.type(screen.getByLabelText('Descripción'), 'Para practicar')
    await user.type(screen.getByLabelText('Líderes (nicknames separados por coma)'), 'mariacoach,  diegomartinez ,')
    await user.type(screen.getByLabelText('Miembros (nicknames separados por coma)'), 'ana, beto')
    await user.click(screen.getByRole('button', { name: 'Crear grupo' }))

    expect(await screen.findByText('GROUP_DETAIL_SENTINEL')).toBeInTheDocument()
    expect(created[0].body).toEqual({
      name: 'Mi Nuevo Grupo',
      description: 'Para practicar',
      visibility: 'VISIBLE',
      joinPolicy: 'OPEN',
      leadNicknames: ['mariacoach', 'diegomartinez'],
      memberNicknames: ['ana', 'beto'],
    })
    expect(mockToast).toHaveBeenCalledWith({ variant: 'success', title: 'Grupo creado' })
  })

  it('no manda listas de miembros iniciales cuando se dejan vacías', async () => {
    const created = stubEndpoint('post', '/groups', { status: 201, body: { id: 'group-new', name: 'G' } })
    const user = userEvent.setup()
    renderWithSentinels('/groups/new')

    await user.type(screen.getByLabelText('Nombre del grupo'), 'Grupo sin miembros')
    await user.click(screen.getByRole('button', { name: 'Crear grupo' }))

    await waitFor(() => expect(created).toHaveLength(1))
    expect(created[0].body).not.toHaveProperty('leadNicknames')
    expect(created[0].body).not.toHaveProperty('memberNicknames')
  })

  it('elegir «No visible» fuerza la política de ingreso a Invitación y la bloquea', async () => {
    const created = stubEndpoint('post', '/groups', { status: 201, body: { id: 'group-new', name: 'G' } })
    const user = userEvent.setup()
    renderWithSentinels('/groups/new')

    await user.click(screen.getByRole('combobox', { name: 'Visibilidad' }))
    await user.click(await screen.findByRole('option', { name: 'No visible' }))

    expect(screen.getByRole('combobox', { name: 'Política de ingreso' })).toBeDisabled()
    expect(screen.getByText('Los grupos no visibles solo permiten invitación')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Nombre del grupo'), 'Grupo privado')
    await user.click(screen.getByRole('button', { name: 'Crear grupo' }))
    await waitFor(() => expect(created).toHaveLength(1))
    expect(created[0].body).toMatchObject({ visibility: 'NOT_VISIBLE', joinPolicy: 'INVITE' })
  })

  it('permite elegir la política de ingreso Solicitud en un grupo visible', async () => {
    const created = stubEndpoint('post', '/groups', { status: 201, body: { id: 'group-new', name: 'G' } })
    const user = userEvent.setup()
    renderWithSentinels('/groups/new')

    await user.click(screen.getByRole('combobox', { name: 'Política de ingreso' }))
    await user.click(await screen.findByRole('option', { name: 'Solicitud' }))
    await user.type(screen.getByLabelText('Nombre del grupo'), 'Grupo con solicitud')
    await user.click(screen.getByRole('button', { name: 'Crear grupo' }))

    await waitFor(() => expect(created).toHaveLength(1))
    expect(created[0].body).toMatchObject({ visibility: 'VISIBLE', joinPolicy: 'REQUEST' })
  })

  it('agrega a la lista de líderes el usuario elegido en la búsqueda sin duplicarlo', async () => {
    server.use(
      http.get('http://localhost:8080/api/users/search', () =>
        HttpResponse.json({ users: [{ id: 'u20', nickname: 'nuevolider', name: 'Nuevo Líder' }] }),
      ),
    )
    const user = userEvent.setup()
    renderWithSentinels('/groups/new')
    const searchBoxes = () => screen.getAllByPlaceholderText('Buscar usuario por nombre o nickname...')

    await user.type(searchBoxes()[0], 'nuevo')
    await user.click(await screen.findByText('Nuevo Líder'))
    expect(screen.getByLabelText('Líderes (nicknames separados por coma)')).toHaveValue('nuevolider')
    await user.type(searchBoxes()[0], 'nuevo')
    await user.click(await screen.findByText('Nuevo Líder'))

    expect(screen.getByLabelText('Líderes (nicknames separados por coma)')).toHaveValue('nuevolider')
  })

  it('agrega a la lista de miembros el usuario elegido en la búsqueda', async () => {
    server.use(
      http.get('http://localhost:8080/api/users/search', () =>
        HttpResponse.json({ users: [{ id: 'u21', nickname: 'estudiante', name: 'Estudiante Uno' }] }),
      ),
    )
    const user = userEvent.setup()
    renderWithSentinels('/groups/new')

    await user.type(screen.getAllByPlaceholderText('Buscar usuario por nombre o nickname...')[1], 'estu')
    await user.click(await screen.findByText('Estudiante Uno'))

    expect(screen.getByLabelText('Miembros (nicknames separados por coma)')).toHaveValue('estudiante')
  })

  it('avisa del error y se queda en el formulario cuando el servidor rechaza la creación', async () => {
    stubEndpoint('post', '/groups', { status: 409, body: { error: 'NAME_TAKEN', message: 'Nombre en uso' } })
    const user = userEvent.setup()
    renderWithSentinels('/groups/new')

    await user.type(screen.getByLabelText('Nombre del grupo'), 'Repetido')
    await user.click(screen.getByRole('button', { name: 'Crear grupo' }))

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'Error al crear grupo' })),
    )
    expect(screen.queryByText('GROUP_DETAIL_SENTINEL')).not.toBeInTheDocument()
  })

  it('Cancelar vuelve al listado de grupos', async () => {
    const user = userEvent.setup()
    renderWithSentinels('/groups/new')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByText('GROUPS_SENTINEL')).toBeInTheDocument()
  })
})

describe('GroupFormPage — editar', () => {
  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('guarda los cambios con PATCH y vuelve al detalle del grupo', async () => {
    const updated = stubEndpoint('patch', '/groups/group-1', { body: { id: 'group-1', name: 'ICPC Colombia 2026' } })
    const user = userEvent.setup()
    renderWithSentinels('/groups/group-1/edit')

    const name = await screen.findByDisplayValue('ICPC Colombia')
    await user.clear(name)
    await user.type(name, 'ICPC Colombia 2026')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('GROUP_DETAIL_SENTINEL')).toBeInTheDocument()
    expect(updated[0].body).toMatchObject({ name: 'ICPC Colombia 2026', visibility: 'VISIBLE', joinPolicy: 'REQUEST' })
    expect(mockToast).toHaveBeenCalledWith({ variant: 'success', title: 'Grupo actualizado' })
  })

  it('muestra el estado del grupo con sus miembros y líderes', async () => {
    renderWithSentinels('/groups/group-1/edit')

    expect(await screen.findByText('Estado del grupo')).toBeInTheDocument()
    expect(screen.getByText('45')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('no ofrece los miembros iniciales al editar', async () => {
    renderWithSentinels('/groups/group-1/edit')
    await screen.findByDisplayValue('ICPC Colombia')

    expect(screen.queryByLabelText('Líderes (nicknames separados por coma)')).not.toBeInTheDocument()
  })

  it('avisa del error cuando el servidor rechaza los cambios', async () => {
    stubEndpoint('patch', '/groups/group-1', { status: 403, body: { error: 'FORBIDDEN', message: 'No puedes' } })
    const user = userEvent.setup()
    renderWithSentinels('/groups/group-1/edit')
    await screen.findByDisplayValue('ICPC Colombia')

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'Error al actualizar grupo' })),
    )
  })

  it('Cancelar vuelve al detalle del grupo', async () => {
    const user = userEvent.setup()
    renderWithSentinels('/groups/group-1/edit')
    await screen.findByDisplayValue('ICPC Colombia')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByText('GROUP_DETAIL_SENTINEL')).toBeInTheDocument()
  })

  it('no deja editar el grupo Global y ofrece volver a él', async () => {
    const user = userEvent.setup()
    renderWithSentinels('/groups/group-global/edit')

    expect(await screen.findByText('El grupo Global no se puede editar.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Volver al grupo' }))

    expect(await screen.findByText('GROUP_DETAIL_SENTINEL')).toBeInTheDocument()
  })
})
