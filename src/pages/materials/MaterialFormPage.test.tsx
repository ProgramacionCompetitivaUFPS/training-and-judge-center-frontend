import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { stubEndpoint } from '@/test/hookHarness'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { mockCurrentUser } from '@/mocks/data'
import type { User } from '@/types/user'
import { MaterialFormPage } from './MaterialFormPage'

vi.mock('@/hooks/useContestSession', () => ({
  useContestSession: () => ({ contest: null }),
}))

// Mutable so a test can switch the platform role
let _authUser: User = { ...mockCurrentUser }

const mockLogout = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: _authUser,
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

function renderCreate(groupId = 'group-1') {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/groups/${groupId}/materials/new`]}>
        <Routes>
          <Route path="/groups/:groupId/materials/new" element={<MaterialFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function renderEdit(groupId = 'group-1', materialId = 'mat-001') {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/groups/${groupId}/materials/${materialId}/edit`]}>
        <Routes>
          <Route path="/groups/:groupId/materials/:materialId/edit" element={<MaterialFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MaterialFormPage', () => {
  beforeEach(() => {
    _authUser = { ...mockCurrentUser }
    mockLogout.mockClear()
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('renders title field and submit button in create mode', async () => {
    renderCreate()
    expect(await screen.findByRole('textbox', { name: /título/i })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /publicar/i })).toBeInTheDocument()
  })

  it('pre-fills title in edit mode', async () => {
    renderEdit()
    expect(await screen.findByDisplayValue('Bienvenidos al grupo de entrenamiento')).toBeInTheDocument()
  })

  it('shows validation error on empty title submit', async () => {
    const user = userEvent.setup()
    renderCreate()
    await user.click(await screen.findByRole('button', { name: /publicar/i }))
    expect(await screen.findByText('El título es requerido')).toBeInTheDocument()
  })

  it('shows success toast after creating a material', async () => {
    server.use(
      http.post('http://localhost:8080/api/groups/:groupId/materials/:materialId/publish', () =>
        HttpResponse.json({ id: 'mat-new', status: 'PUBLISHED', publishedAt: new Date().toISOString() }),
      ),
    )
    const user = userEvent.setup()
    renderCreate()
    await user.type(await screen.findByRole('textbox', { name: /título/i }), 'Material de Prueba')
    await user.click(await screen.findByRole('button', { name: /publicar/i }))
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'success' }),
      )
    })
  })
})

// ---------------------------------------------------------------------------
// Guardar, publicar, tags, plantilla y permisos
// ---------------------------------------------------------------------------

function renderWithSentinels(path: string) {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/groups/:groupId/materials/new" element={<MaterialFormPage />} />
          <Route path="/groups/:groupId/materials/:materialId/edit" element={<MaterialFormPage />} />
          <Route path="/groups/:groupId/materials/:materialId" element={<div>MATERIAL_DETAIL_SENTINEL</div>} />
          <Route path="/groups/:groupId/materials" element={<div>MATERIALS_SENTINEL</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Renders the page and waits until the form (or the no-permission message) is on screen. */
async function renderForm(path: string) {
  renderWithSentinels(path)
  await waitFor(() => expect(screen.queryByLabelText('Título') ?? screen.queryByText(/No tienes permiso/)).not.toBeNull())
}

const contentBox = () => screen.getByPlaceholderText(/Escribe aquí el contenido en Markdown/)

async function fillMaterial(user: ReturnType<typeof userEvent.setup>, title = 'Grafos básicos', content = 'Contenido real') {
  await user.type(screen.getByLabelText('Título'), title)
  await user.type(contentBox(), content)
}

describe('MaterialFormPage — crear', () => {
  beforeEach(() => {
    _authUser = { ...mockCurrentUser }
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('Publicar crea el material, lo publica y abre su detalle', async () => {
    const created = stubEndpoint('post', '/groups/group-1/materials', { status: 201, body: { id: 'mat-new', title: 'Grafos básicos' } })
    const published = stubEndpoint('post', '/groups/group-1/materials/mat-new/publish', { body: { id: 'mat-new', status: 'PUBLISHED' } })
    const user = userEvent.setup()
    await renderForm('/groups/group-1/materials/new')

    await fillMaterial(user)
    await user.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(await screen.findByText('MATERIAL_DETAIL_SENTINEL')).toBeInTheDocument()
    expect(created[0].body).toEqual({ title: 'Grafos básicos', content: 'Contenido real', tags: [] })
    expect(published).toHaveLength(1)
    expect(mockToast).toHaveBeenCalledWith({
      variant: 'success',
      title: 'Material publicado',
      description: 'Los miembros del grupo ya pueden verlo.',
    })
  })

  it('Guardar borrador crea el material sin publicarlo', async () => {
    stubEndpoint('post', '/groups/group-1/materials', { status: 201, body: { id: 'mat-new', title: 'Grafos básicos' } })
    const published = stubEndpoint('post', '/groups/group-1/materials/mat-new/publish')
    const user = userEvent.setup()
    await renderForm('/groups/group-1/materials/new')

    await fillMaterial(user)
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }))

    expect(await screen.findByText('MATERIAL_DETAIL_SENTINEL')).toBeInTheDocument()
    expect(published).toHaveLength(0)
    expect(mockToast).toHaveBeenCalledWith({
      variant: 'success',
      title: 'Borrador guardado',
      description: 'Los miembros del grupo no lo verán hasta que lo publiques.',
    })
  })

  it('avisa que se guardó como borrador cuando falla la publicación y abre igualmente el detalle', async () => {
    stubEndpoint('post', '/groups/group-1/materials', { status: 201, body: { id: 'mat-new', title: 'Grafos básicos' } })
    stubEndpoint('post', '/groups/group-1/materials/mat-new/publish', { status: 500, body: { error: 'SERVER_ERROR', message: 'fallo' } })
    const user = userEvent.setup()
    await renderForm('/groups/group-1/materials/new')

    await fillMaterial(user)
    await user.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(await screen.findByText('MATERIAL_DETAIL_SENTINEL')).toBeInTheDocument()
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'error', title: 'Se guardó como borrador, pero no se pudo publicar' }),
    )
  })

  it('avisa del error y se queda en el formulario cuando el servidor rechaza la creación', async () => {
    stubEndpoint('post', '/groups/group-1/materials', { status: 403, body: { error: 'FORBIDDEN', message: 'no' } })
    const user = userEvent.setup()
    await renderForm('/groups/group-1/materials/new')

    await fillMaterial(user)
    await user.click(screen.getByRole('button', { name: 'Publicar' }))

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'Error al crear' })),
    )
    expect(screen.queryByText('MATERIAL_DETAIL_SENTINEL')).not.toBeInTheDocument()
  })

  it('no guarda un material cuyo contenido es la plantilla de ejemplo sin cambios', async () => {
    const created = stubEndpoint('post', '/groups/group-1/materials', { status: 201, body: { id: 'mat-new', title: 'T' } })
    const user = userEvent.setup()
    await renderForm('/groups/group-1/materials/new')

    await user.type(screen.getByLabelText('Título'), 'Con plantilla')
    await user.click(screen.getByRole('button', { name: /Usar plantilla de ejemplo/ }))
    await user.click(screen.getByRole('button', { name: 'Publicar' }))

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'error',
        title: 'El contenido es la plantilla de ejemplo',
        description: 'Reemplázala por el contenido real del material antes de guardar.',
      }),
    )
    expect(created).toHaveLength(0)
  })

  it('oculta el botón de plantilla cuando ya hay contenido', async () => {
    const user = userEvent.setup()
    await renderForm('/groups/group-1/materials/new')

    expect(screen.getByRole('button', { name: /Usar plantilla de ejemplo/ })).toBeInTheDocument()
    await user.type(contentBox(), 'algo')

    expect(screen.queryByRole('button', { name: /Usar plantilla de ejemplo/ })).not.toBeInTheDocument()
  })

  it('muestra una vista previa del contenido en Markdown', async () => {
    const user = userEvent.setup()
    await renderForm('/groups/group-1/materials/new')

    await user.type(contentBox(), '# Título grande')
    await user.click(screen.getByRole('tab', { name: 'Vista previa' }))

    expect(await screen.findByRole('heading', { name: 'Título grande' })).toBeInTheDocument()
  })

  it('avisa cuando no hay contenido para previsualizar', async () => {
    const user = userEvent.setup()
    await renderForm('/groups/group-1/materials/new')

    await user.click(screen.getByRole('tab', { name: 'Vista previa' }))

    expect(await screen.findByText('Sin contenido para previsualizar')).toBeInTheDocument()
  })

  it('Cancelar vuelve al listado de materiales', async () => {
    const user = userEvent.setup()
    await renderForm('/groups/group-1/materials/new')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByText('MATERIALS_SENTINEL')).toBeInTheDocument()
  })

  describe('tags', () => {
    it('agrega un tag con Enter en minúsculas y lo envía al guardar', async () => {
      const created = stubEndpoint('post', '/groups/group-1/materials', { status: 201, body: { id: 'mat-new', title: 'T' } })
      stubEndpoint('post', '/groups/group-1/materials/mat-new/publish')
      const user = userEvent.setup()
      await renderForm('/groups/group-1/materials/new')

      await user.type(screen.getByPlaceholderText('Escribe un tag y presiona Enter'), 'Grafos{Enter}')
      await fillMaterial(user)
      await user.click(screen.getByRole('button', { name: 'Publicar' }))

      await waitFor(() => expect(created).toHaveLength(1))
      expect((created[0].body as { tags: string[] }).tags).toEqual(['grafos'])
    })

    it('agrega un tag con el botón Agregar y con la coma, sin repetirlo', async () => {
      const user = userEvent.setup()
      await renderForm('/groups/group-1/materials/new')
      const tagBox = screen.getByPlaceholderText('Escribe un tag y presiona Enter')

      await user.type(tagBox, 'dp')
      await user.click(screen.getByRole('button', { name: 'Agregar' }))
      await user.type(tagBox, 'greedy,')
      await user.type(tagBox, 'dp{Enter}')

      expect(screen.getAllByText('dp')).toHaveLength(1)
      expect(screen.getByText('greedy')).toBeInTheDocument()
    })

    it('quita un tag con su botón de cerrar', async () => {
      const user = userEvent.setup()
      await renderForm('/groups/group-1/materials/new')
      await user.type(screen.getByPlaceholderText('Escribe un tag y presiona Enter'), 'dp{Enter}')

      const badge = screen.getByText('dp')
      await user.click(within(badge).getByRole('button'))

      expect(screen.queryByText('dp')).not.toBeInTheDocument()
    })

    it('ofrece los tags ya usados en el grupo y los agrega al pulsarlos', async () => {
      stubEndpoint('get', '/groups/group-1/materials/tags', { body: { tags: ['recursion', 'trees'] } })
      const user = userEvent.setup()
      await renderForm('/groups/group-1/materials/new')

      await user.click(await screen.findByRole('button', { name: '+ recursion' }))

      expect(screen.queryByRole('button', { name: '+ recursion' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: '+ trees' })).toBeInTheDocument()
    })
  })
})

describe('MaterialFormPage — editar', () => {
  beforeEach(() => {
    _authUser = { ...mockCurrentUser }
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it('guarda los cambios con PATCH y vuelve al detalle', async () => {
    const updated = stubEndpoint('patch', '/groups/group-1/materials/mat-001', { body: { id: 'mat-001', title: 'Nuevo título' } })
    const user = userEvent.setup()
    await renderForm('/groups/group-1/materials/mat-001/edit')

    const title = await screen.findByDisplayValue('Bienvenidos al grupo de entrenamiento')
    await user.clear(title)
    await user.type(title, 'Nuevo título')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('MATERIAL_DETAIL_SENTINEL')).toBeInTheDocument()
    expect((updated[0].body as { title: string }).title).toBe('Nuevo título')
    expect(mockToast).toHaveBeenCalledWith({ variant: 'success', title: 'Material actualizado' })
  })

  it('avisa del error cuando el servidor rechaza los cambios', async () => {
    stubEndpoint('patch', '/groups/group-1/materials/mat-001', { status: 500, body: { error: 'SERVER_ERROR', message: 'fallo' } })
    const user = userEvent.setup()
    await renderForm('/groups/group-1/materials/mat-001/edit')
    await screen.findByDisplayValue('Bienvenidos al grupo de entrenamiento')

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', title: 'Error al actualizar' })),
    )
  })

  it('no ofrece Guardar borrador al editar', async () => {
    await renderForm('/groups/group-1/materials/mat-001/edit')
    await screen.findByDisplayValue('Bienvenidos al grupo de entrenamiento')

    expect(screen.queryByRole('button', { name: 'Guardar borrador' })).not.toBeInTheDocument()
  })

  it('Cancelar vuelve al detalle del material', async () => {
    const user = userEvent.setup()
    await renderForm('/groups/group-1/materials/mat-001/edit')
    await screen.findByDisplayValue('Bienvenidos al grupo de entrenamiento')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByText('MATERIAL_DETAIL_SENTINEL')).toBeInTheDocument()
  })
})

describe('MaterialFormPage — permisos', () => {
  beforeEach(() => {
    setAccessToken('mock-jwt-token-luisadmin')
    mockToast.mockClear()
  })
  afterEach(() => clearAccessToken())

  it.each([
    ['/groups/group-2/materials/new', 'crear'],
    ['/groups/group-2/materials/mat-001/edit', 'editar'],
  ])('un miembro que no lidera el grupo no puede %s materiales (%s)', async (path, verb) => {
    _authUser = { ...mockCurrentUser, role: 'COACH' }
    const user = userEvent.setup()
    await renderForm(path)

    expect(await screen.findByText(`No tienes permiso para ${verb} materiales en este grupo.`)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Volver a materiales' }))

    expect(await screen.findByText('MATERIALS_SENTINEL')).toBeInTheDocument()
  })
})
